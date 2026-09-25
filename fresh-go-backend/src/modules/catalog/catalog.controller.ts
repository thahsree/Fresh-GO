import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { CreateProductDto, UpdateProductDto } from "./dto/catalog.dto";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Role } from "@prisma/client";

@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Public()
  @Get("categories")
  async getCategories() {
    return this.catalogService.getCategories();
  }

  @Public()
  @Get("products")
  async getProducts(
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("bestseller") bestseller?: string,
  ) {
    return this.catalogService.getProducts({
      categorySlug: category,
      search,
      bestSellerOnly: bestseller === "true",
    });
  }

  @Public()
  @Get("products/:slug")
  async getProductBySlug(@Param("slug") slug: string) {
    return this.catalogService.getProductBySlug(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post("products")
  async createProduct(@Body() dto: CreateProductDto) {
    return this.catalogService.createProduct(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HUB_MANAGER)
  @Put("products/:id")
  async updateProduct(
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.catalogService.updateProduct(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete("products/:id")
  async deleteProduct(@Param("id") id: string) {
    return this.catalogService.deleteProduct(id);
  }
}
