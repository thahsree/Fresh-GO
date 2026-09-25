import { Global, Module } from "@nestjs/common";
import { SmsService } from "./sms.service";
import { PushNotificationService } from "./push.service";

@Global()
@Module({
  providers: [SmsService, PushNotificationService],
  exports: [SmsService, PushNotificationService],
})
export class NotificationsModule {}
