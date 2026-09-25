import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    this.logger.log(
      `🔔 [FCM Push] To User (${userId}): "${title}" - ${body} Data: ${JSON.stringify(data || {})}`,
    );
    return true;
  }

  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    this.logger.log(
      `🔔 [FCM Topic Push] To Topic (${topic}): "${title}" - ${body}`,
    );
    return true;
  }
}
