import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateAddressDto, UpdatePartnerProfileDto } from "./dto/users.dto";
import { VehicleType } from "@prisma/client";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        customerProfile: true,
        partnerProfile: true,
        wallet: true,
        addresses: true,
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: "desc" },
    });
  }

  async addAddress(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.create({
      data: {
        ...dto,
        userId,
      },
    });

    if (dto.isDefault) {
      await this.prisma.customerProfile.updateMany({
        where: { userId },
        data: { defaultAddressId: address.id },
      });
    }

    return address;
  }

  async deleteAddress(userId: string, addressId: string) {
    return this.prisma.address.deleteMany({
      where: { id: addressId, userId },
    });
  }

  async updatePartnerProfile(userId: string, dto: UpdatePartnerProfileDto) {
    const partner = await this.prisma.deliveryPartnerProfile.findUnique({
      where: { userId },
    });
    if (!partner)
      throw new NotFoundException("Delivery partner profile not found");

    return this.prisma.deliveryPartnerProfile.update({
      where: { userId },
      data: {
        isOnline: dto.isOnline !== undefined ? dto.isOnline : undefined,
        vehicleType: dto.vehicleType
          ? (dto.vehicleType as VehicleType)
          : undefined,
        preferredZoneId: dto.preferredZoneId,
        licenseNumber: dto.licenseNumber,
      },
    });
  }
}
