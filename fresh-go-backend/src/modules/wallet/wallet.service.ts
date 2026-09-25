import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { WalletTransactionType } from "@prisma/client";

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWalletByUserId(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId, balance: 0.0 },
        include: { transactions: true },
      });
    }

    return wallet;
  }

  /**
   * Automatically credit customer wallet for weight shortfall when net cleaned weight < estimated gross weight
   */
  async creditForWeightShortfall(
    userId: string,
    amount: number,
    orderId: string,
    orderNumber: string,
  ) {
    if (amount <= 0) return null;

    return this.prisma.$transaction(async (tx) => {
      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await tx.wallet.create({ data: { userId, balance: 0.0 } });
      }

      const newBalance = Math.round((wallet.balance + amount) * 100) / 100;

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount,
          balanceAfter: newBalance,
          type: WalletTransactionType.WEIGHT_SHORTFALL_CREDIT,
          referenceId: orderId,
          description: `Refund for weight variation on Order #${orderNumber}`,
        },
      });

      return { wallet: updatedWallet, transaction };
    });
  }

  /**
   * Debit customer wallet balance when using wallet to pay for order
   */
  async debitForOrder(userId: string, amount: number, orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet || wallet.balance < amount) {
        throw new BadRequestException("Insufficient wallet balance");
      }

      const newBalance = Math.round((wallet.balance - amount) * 100) / 100;

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: -amount,
          balanceAfter: newBalance,
          type: WalletTransactionType.ORDER_PAYMENT,
          referenceId: orderId,
          description: `Payment for Order #${orderId}`,
        },
      });

      return { wallet: updatedWallet, transaction };
    });
  }
}
