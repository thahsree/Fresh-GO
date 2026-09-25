import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly provider: string;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<string>("sms.provider", "mock");
  }

  async sendOtp(phone: string, otp: string): Promise<boolean> {
    if (this.provider === "mock") {
      this.logger.log(
        `\n=========================================\n📲 [MOCK SMS] Sending OTP ${otp} to phone: ${phone}\n=========================================`,
      );
      return true;
    }

    if (this.provider === "msg91") {
      try {
        const authKey = this.configService.get<string>("sms.msg91AuthKey");
        const templateId = this.configService.get<string>(
          "sms.msg91TemplateId",
        );

        await axios.post(
          "https://control.msg91.com/api/v5/otp",
          {
            template_id: templateId,
            mobile: phone.replace("+", ""),
            otp: otp,
          },
          {
            headers: {
              authkey: authKey,
              "Content-Type": "application/json",
            },
          },
        );
        return true;
      } catch (error) {
        this.logger.error(
          `Failed to send MSG91 OTP to ${phone}: ${error.message}`,
        );
        return false;
      }
    }

    return true;
  }

  async sendOrderAlert(phone: string, message: string): Promise<boolean> {
    this.logger.log(`📲 SMS alert sent to ${phone}: ${message}`);
    return true;
  }
}
