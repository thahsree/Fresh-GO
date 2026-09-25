import { Injectable, Logger } from "@nestjs/common";
import { Server } from "socket.io";

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);
  public server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  /**
   * Broadcast real-time order status update to customer tracking room & admin control tower
   */
  emitOrderStatusUpdate(
    orderId: string,
    payload: {
      status: string;
      orderNumber: string;
      etaMinutes?: number;
      partnerDetails?: any;
      note?: string;
    },
  ) {
    if (!this.server) {
      this.logger.warn("Socket server not initialized yet");
      return;
    }

    this.logger.log(
      `📡 Emitting order:status:changed to order:${orderId} -> ${payload.status}`,
    );
    this.server.to(`order:${orderId}`).emit("order:status:changed", payload);
    this.server
      .to("admin:dispatch")
      .emit("admin:order:updated", { orderId, ...payload });
  }

  /**
   * Send new delivery offer to a specific delivery partner
   */
  emitNewOrderOffer(partnerId: string, orderDetails: any) {
    if (!this.server) return;
    this.logger.log(`📡 Emitting partner:new:order to partner:${partnerId}`);
    this.server
      .to(`partner:${partnerId}`)
      .emit("partner:order:new", orderDetails);
  }
}
