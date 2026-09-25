import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly publicDomain: string;

  constructor(private readonly configService: ConfigService) {
    this.publicDomain = this.configService.get<string>(
      "storage.publicDomain",
      "https://assets.freshgo.in",
    );
  }

  async getPresignedUploadUrl(
    fileName: string,
    contentType: string,
    folder = "uploads",
  ): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${folder}/${Date.now()}-${cleanFileName}`;

    // In production with AWS S3 / Cloudflare R2 SDK, generate real presigned URL
    const uploadUrl = `https://mock-upload.r2.cloudflarestorage.com/${key}?signature=mock_token`;
    const fileUrl = `${this.publicDomain}/${key}`;

    this.logger.log(`Generated upload URL for key: ${key}`);

    return {
      uploadUrl,
      fileUrl,
      key,
    };
  }
}
