import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateAddressDto, UpdateAddressDto, UpdatePartnerProfileDto } from "./dto/users.dto";
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User account with ID ${userId} was not found`);
    }

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

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!existing) {
      throw new NotFoundException(`Address with ID ${addressId} not found`);
    }

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });

    if (dto.isDefault) {
      await this.prisma.customerProfile.updateMany({
        where: { userId },
        data: { defaultAddressId: addressId },
      });
    }

    return updated;
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
          ? dto.vehicleType.toUpperCase().includes("SCOOTER") || dto.vehicleType.toUpperCase().includes("EV")
            ? VehicleType.SCOOTER
            : VehicleType.BIKE
          : undefined,
        preferredZoneId: dto.preferredZoneId,
        licenseNumber: dto.licenseNumber,
      },
    });
  }

  async updatePushToken(userId: string, pushToken: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { pushToken },
      select: { id: true, name: true, phone: true, pushToken: true },
    });
  }

  async updateProfile(userId: string, dto: { name?: string; email?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const updateData: any = {};
    if (dto.name && dto.name.trim()) updateData.name = dto.name.trim();
    if (dto.email !== undefined) updateData.email = dto.email.trim() || null;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    return {
      id: updated.id,
      phone: updated.phone,
      name: updated.name,
      email: updated.email,
      role: updated.role,
    };
  }

  /**
   * Permanently deletes a customer's account per Apple App Store guideline 5.1.1(v).
   * - Anonymizes all PII: name, phone, email, pushToken
   * - Deletes all saved addresses and customer profile notes
   * - Preserves order records (required for business/financial records)
   * - Deactivates the account so it cannot be used again
   */
  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    // Only customers can self-delete via this endpoint
    const anonymizedPhone = `deleted_${userId.replace(/-/g, "").slice(0, 12)}`;
    const anonymizedName = "Deleted User";

    await this.prisma.$transaction(async (tx) => {
      // 1. Delete all saved addresses
      await tx.address.deleteMany({ where: { userId } });

      // 2. Clear customer profile notes and default address
      await tx.customerProfile.updateMany({
        where: { userId },
        data: { defaultAddressId: null, notes: null },
      });

      // 3. Reset wallet balance if customer had a wallet
      await tx.wallet.updateMany({
        where: { userId },
        data: { balance: 0.0 },
      });

      // 4. Anonymize all PII on the user record and deactivate
      await tx.user.update({
        where: { id: userId },
        data: {
          name: anonymizedName,
          phone: anonymizedPhone,
          email: null,
          pushToken: null,
          isActive: false,
        },
      });
    });

    return { success: true, message: "Account deleted successfully." };
  }
}
