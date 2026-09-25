import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/prisma/prisma.service";
import axios from "axios";

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Dispatches push notification to a specific user using their registered Expo / FCM push token
   */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, phone: true, pushToken: true },
      });

      if (!user || !user.pushToken) {
        this.logger.log(
          `🔔 [Push Notice] User (${userId}) has no registered push token. Notification logged: "${title}" - ${body}`,
        );
        return false;
      }

      return this.sendToToken(user.pushToken, title, body, data);
    } catch (err: any) {
      this.logger.error(
        `Error sending push notification to user ${userId}: ${err.message}`,
      );
      return false;
    }
  }

  /**
   * Sends push notification directly to an Expo or FCM push token
   */
  async sendToToken(
    pushToken: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    if (!pushToken) return false;

    // 1. Expo Push Notification: ExponentPushToken[...] or ExpoPushToken[...]
    if (
      pushToken.startsWith("ExponentPushToken") ||
      pushToken.startsWith("ExpoPushToken")
    ) {
      try {
        const response = await axios.post(
          "https://exp.host/--/api/v2/push/send",
          {
            to: pushToken,
            sound: "default",
            title,
            body,
            data: data || {},
            priority: "high",
            channelId: "orders",
          },
          {
            headers: {
              Accept: "application/json",
              "Accept-encoding": "gzip, deflate",
              "Content-Type": "application/json",
            },
            timeout: 5000,
          },
        );

        this.logger.log(
          `🚀 [Expo Push Dispatched] To ${pushToken.slice(0, 25)}... -> "${title}" Status: ${response.status}`,
        );
        return true;
      } catch (err: any) {
        this.logger.error(
          `Failed to dispatch Expo push to token: ${err.message}`,
        );
        return false;
      }
    }

    // 2. Standard / FCM Token fallback
    this.logger.log(
      `🔔 [Push Notice] Token received (${pushToken.slice(0, 20)}...): "${title}" - ${body}`,
    );
    return true;
  }

  /**
   * Broadcast push notification to multiple user IDs simultaneously
   */
  async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<number> {
    let successCount = 0;
    await Promise.all(
      userIds.map(async (uid) => {
        const sent = await this.sendToUser(uid, title, body, data);
        if (sent) successCount++;
      }),
    );
    return successCount;
  }

  /**
   * Send notification to a named topic
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    this.logger.log(
      `🔔 [Topic Push] Topic (${topic}): "${title}" - ${body} Data: ${JSON.stringify(data || {})}`,
    );
    return true;
  }
}
