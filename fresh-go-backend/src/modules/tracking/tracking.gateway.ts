import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import { TrackingService } from "./tracking.service";
import { Role } from "@prisma/client";

@WebSocketGateway({
  cors: { origin: "*" },
  transports: ["websocket"], // Strict websocket-only transport to eliminate sticky session issues on Render
  namespace: "/tracking",
})
export class TrackingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly trackingService: TrackingService,
  ) {}

  afterInit(server: Server) {
    this.trackingService.setServer(server);

    // Handshake Authentication Middleware
    server.use(async (socket: Socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace("Bearer ", "");

        if (!token) {
          this.logger.warn(
            `WS Connection rejected: Missing authentication token (${socket.id})`,
          );
          return next(new Error("Authentication token required"));
        }

        const secret = this.configService.get<string>(
          "jwt.accessSecret",
          "freshgo_super_secret_jwt_access_key_2026",
        );
        const payload = this.jwtService.verify(token, { secret });

        socket.data.user = payload; // Contains { sub: userId, phone, role }
        next();
      } catch (err) {
        this.logger.warn(
          `WS Auth failed for socket ${socket.id}: ${err.message}`,
        );
        next(new Error("Invalid or expired authentication token"));
      }
    });

    this.logger.log(
      "✅ TrackingGateway initialized with WebSocket-only transport & Handshake Auth",
    );
  }

  handleConnection(client: Socket) {
    const user = client.data.user;
    this.logger.log(
      `Client connected: ${client.id} (User: ${user?.sub}, Role: ${user?.role})`,
    );
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Subscribe to customer order live updates
   */
  @SubscribeMessage("subscribe:order")
  async handleSubscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const user = client.data.user;
    const { orderId } = data;

    if (!orderId) return;

    // Verify user owns order or is delivery/admin
    if (user.role === Role.CUSTOMER) {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { customerId: true },
      });
      if (!order || order.customerId !== user.sub) {
        client.emit("error", { message: "Unauthorized to track this order" });
        return;
      }
    }

    client.join(`order:${orderId}`);
    client.emit("subscribed", { room: `order:${orderId}` });
    this.logger.log(`User ${user.sub} subscribed to room order:${orderId}`);
  }

  /**
   * Join Admin/Hub dispatch control room
   */
  @SubscribeMessage("subscribe:admin:dispatch")
  handleSubscribeAdmin(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    if (![Role.ADMIN, Role.DISPATCHER, Role.HUB_MANAGER].includes(user.role)) {
      client.emit("error", { message: "Forbidden: Admin access required" });
      return;
    }

    client.join("admin:dispatch");
    client.emit("subscribed", { room: "admin:dispatch" });
    this.logger.log(`Admin/Dispatcher ${user.sub} joined admin:dispatch`);
  }

  /**
   * Partner live GPS ping
   * Emits immediately to order room & admin; debounces Postgres DB writes to every 10 seconds.
   */
  @SubscribeMessage("partner:location:update")
  async handlePartnerLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      orderId?: string;
      lat: number;
      lng: number;
      heading?: number;
      speed?: number;
    },
  ) {
    const user = client.data.user;
    if (user.role !== Role.DELIVERY_PARTNER) return;

    const { orderId, lat, lng, heading = 0, speed = 0 } = data;
    const timestamp = Date.now();

    const locationPayload = {
      partnerId: user.sub,
      orderId,
      lat,
      lng,
      heading,
      speed,
      timestamp,
    };

    // 1. Live stream to customer watching their order
    if (orderId) {
      this.server
        .to(`order:${orderId}`)
        .emit("partner:location", locationPayload);
    }

    // 2. Stream to admin dispatch control room
    this.server.to("admin:dispatch").emit("partner:location", locationPayload);

    // 3. Cache latest location in Redis
    await this.redis.set(
      `partner:location:${user.sub}`,
      JSON.stringify(locationPayload),
      300, // 5 mins TTL
    );

    // 4. Debounced database write: Only persist to PostgreSQL if > 10s since last write
    const lastDbWriteKey = `partner:last_db_write:${user.sub}`;
    const lastWrite = await this.redis.get(lastDbWriteKey);

    if (!lastWrite || timestamp - parseInt(lastWrite, 10) > 10000) {
      await this.redis.set(lastDbWriteKey, timestamp.toString(), 60);

      // Async write to DB without blocking the socket loop
      this.prisma.deliveryPartnerProfile
        .updateMany({
          where: { userId: user.sub },
          data: {
            currentLat: lat,
            currentLng: lng,
            lastLocationUpdate: new Date(timestamp),
          },
        })
        .catch((err) =>
          this.logger.error(
            `Failed debounced GPS DB write for partner ${user.sub}: ${err.message}`,
          ),
        );
    }
  }
}
