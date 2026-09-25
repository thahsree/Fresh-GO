import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const cloudName =
      this.configService.get<string>("CLOUDINARY_CLOUD_NAME") ||
      this.configService.get<string>("cloudinary.cloudName");
    const apiKey =
      this.configService.get<string>("CLOUDINARY_API_KEY") ||
      this.configService.get<string>("cloudinary.apiKey");
    const apiSecret =
      this.configService.get<string>("CLOUDINARY_API_SECRET") ||
      this.configService.get<string>("cloudinary.apiSecret");

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.isConfigured = true;
      this.logger.log(`☁️ Cloudinary configured successfully for cloud: ${cloudName}`);
    } else {
      this.isConfigured = false;
      this.logger.warn(
        "⚠️ Cloudinary credentials not fully provided. Falling back to mock storage mode.",
      );
    }
  }

  /**
   * Upload an image buffer directly to Cloudinary with automatic optimization
   */
  async uploadBuffer(
    buffer: Buffer,
    folder = "freshgo/products",
    filename?: string,
  ): Promise<{ url: string; publicId: string }> {
    if (!this.isConfigured) {
      const mockId = `mock_${Date.now()}`;
      return {
        url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop",
        publicId: mockId,
      };
    }

    return new Promise((resolve, reject) => {
      const uploadOptions: Record<string, any> = {
        folder,
        resource_type: "auto",
        transformation: [{ quality: "auto:good", fetch_format: "auto" }],
      };
      if (filename) {
        uploadOptions.public_id = filename.replace(/\.[^/.]+$/, "");
      }

      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            this.logger.error(
              `Cloudinary upload failed: ${error?.message || "Unknown error"}`,
            );
            return reject(
              new BadRequestException(
                `Image upload failed: ${error?.message || "Upload error"}`,
              ),
            );
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );
      stream.end(buffer);
    });
  }

  /**
   * Generates client-side upload signature so frontend can upload directly to Cloudinary
   */
  getUploadSignature(folder = "freshgo/uploads"): {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
  } {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const apiSecret =
      this.configService.get<string>("CLOUDINARY_API_SECRET") ||
      this.configService.get<string>("cloudinary.apiSecret") ||
      "";
    const apiKey =
      this.configService.get<string>("CLOUDINARY_API_KEY") ||
      this.configService.get<string>("cloudinary.apiKey") ||
      "";
    const cloudName =
      this.configService.get<string>("CLOUDINARY_CLOUD_NAME") ||
      this.configService.get<string>("cloudinary.cloudName") ||
      "";

    const paramsToSign = {
      folder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return {
      signature,
      timestamp,
      cloudName,
      apiKey,
      folder,
    };
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<boolean> {
    if (!this.isConfigured) return true;
    try {
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to delete Cloudinary image: ${err.message}`);
      return false;
    }
  }

  /**
   * Compatibility alias for legacy presigned URL calls
   */
  async getPresignedUploadUrl(
    fileName: string,
    contentType: string,
    folder = "freshgo/uploads",
  ): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
    const sig = this.getUploadSignature(folder);
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
      fileUrl: `https://res.cloudinary.com/${sig.cloudName}/image/upload/${folder}/${fileName}`,
      key: `${folder}/${fileName}`,
    };
  }
}
