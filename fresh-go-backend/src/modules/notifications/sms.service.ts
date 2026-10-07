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
        `\n=========================================\n📲 [MOCK SMS] Sending OTP ${otp} to phone: ${phone}\n(No SMS gateway configured - set SMS_PROVIDER in .env)\n=========================================`,
      );
      return true;
    }

    if (this.provider === "fast2sms") {
      try {
        const apiKey = this.configService.get<string>("sms.fast2smsApiKey");
        if (!apiKey) {
          this.logger.error("Fast2SMS API Key is missing in .env! (FAST2SMS_API_KEY)");
          return false;
        }
        const rawNumber = phone.replace("+91", "").replace("+", "").trim();
        const route = this.configService.get<string>("sms.fast2smsRoute", "q");
        const payload: any = {
          numbers: rawNumber,
        };

        if (route === "otp") {
          payload.route = "otp";
          payload.variables_values = otp;
        } else {
          payload.route = "q";
          payload.message = `Your FreshGo verification code is ${otp}. Valid for 5 minutes.`;
          payload.language = "english";
          payload.flash = 0;
        }

        const res = await axios.post(
          "https://www.fast2sms.com/dev/bulkV2",
          payload,
          {
            headers: {
              authorization: apiKey,
              "Content-Type": "application/json",
              accept: "application/json",
            },
          }
        );
        if (res.data?.return === false) {
          this.logger.error(`❌ [Fast2SMS] Failed for ${rawNumber}: ${JSON.stringify(res.data?.message)}`);
          return false;
        }
        this.logger.log(`📲 [Fast2SMS] Sent OTP successfully to ${rawNumber}: ${JSON.stringify(res.data?.message)}`);
        return true;
      } catch (error: any) {
        this.logger.error(`Failed to send Fast2SMS OTP to ${phone}: ${error?.response?.data ? JSON.stringify(error.response.data) : error?.message}`);
        return false;
      }
    }

    if (this.provider === "twilio") {
      try {
        const accountSid = this.configService.get<string>("sms.twilioAccountSid");
        const authToken = this.configService.get<string>("sms.twilioAuthToken");
        const fromNumber = this.configService.get<string>("sms.twilioPhoneNumber") || "";

        const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
        const params = new URLSearchParams();
        params.append("To", phone);
        params.append("From", fromNumber);
        params.append("Body", `Your FreshGo verification code is ${otp}. Valid for 5 minutes.`);

        const res = await axios.post(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          params.toString(),
          {
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
        this.logger.log(`📲 [Twilio] Sent OTP to ${phone}: SID ${res.data?.sid}`);
        return true;
      } catch (error: any) {
        this.logger.error(`Failed to send Twilio OTP to ${phone}: ${error?.message}`);
        return false;
      }
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
