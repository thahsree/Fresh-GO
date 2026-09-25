import {
  Controller,
  Post,
  Get,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { StorageService } from "./storage.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@Controller("storage")
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @UseGuards(JwtAuthGuard)
  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @UploadedFile() file?: Express.Multer.File,
    @Query("folder") folder = "freshgo/products",
  ) {
    if (!file) {
      throw new BadRequestException("No image file provided for upload");
    }
    const result = await this.storageService.uploadBuffer(
      file.buffer,
      folder,
      file.originalname,
    );
    return {
      success: true,
      url: result.url,
      publicId: result.publicId,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get("signature")
  getSignature(@Query("folder") folder = "freshgo/products") {
    return this.storageService.getUploadSignature(folder);
  }
}
