import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { OrderStatus } from "@prisma/client";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuperAdminSalesReport(filter?: {
    startDate?: string;
    endDate?: string;
    hubId?: string;
  }) {
    const { startDate, endDate, hubId } = filter || {};

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const where: any = {
      ...(Object.keys(dateFilter).length > 0 ? { placedAt: dateFilter } : {}),
      ...(hubId ? { hubId } : {}),
    };

    // 1. Fetch all orders matching criteria
    const orders = await this.prisma.order.findMany({
      where,
      include: {
        hub: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { placedAt: "desc" },
    });

    // 2. Fetch all hubs
    const allHubs = await this.prisma.hub.findMany({
      where: { isActive: true },
      select: { id: true, name: true, city: true, code: true },
    });

    // 3. Compute KPI metrics
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter((o) => o.status === OrderStatus.DELIVERED);
    const cancelledOrders = orders.filter((o) => o.status === OrderStatus.CANCELLED);
    const inProgressOrders = orders.filter(
      (o) =>
        o.status !== OrderStatus.DELIVERED &&
        o.status !== OrderStatus.CANCELLED &&
        o.status !== OrderStatus.FAILED_DELIVERY
    );

    const grossRevenue = orders
      .filter((o) => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.FAILED_DELIVERY)
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const deliveredRevenue = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const aov =
      totalOrders > 0
        ? Math.round((grossRevenue / Math.max(1, totalOrders - cancelledOrders.length)) * 10) / 10
        : 0;

    // 4. Per-Hub breakdown
    const hubMap = new Map<string, {
      hubId: string;
      hubName: string;
      hubCode: string;
      city: string;
      totalOrders: number;
      deliveredOrders: number;
      cancelledOrders: number;
      grossRevenue: number;
      aov: number;
    }>();

    allHubs.forEach((h) => {
      hubMap.set(h.id, {
        hubId: h.id,
        hubName: h.name,
        hubCode: h.code,
        city: h.city,
        totalOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        grossRevenue: 0,
        aov: 0,
      });
    });

    orders.forEach((o) => {
      const hId = o.hubId || allHubs[0]?.id;
      if (!hId) return;

      let entry = hubMap.get(hId);
      if (!entry) {
        entry = {
          hubId: hId,
          hubName: o.hub?.name || "Main Hub",
          hubCode: o.hub?.code || "HUB-MAIN",
          city: o.hub?.city || "Kozhikode",
          totalOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          grossRevenue: 0,
          aov: 0,
        };
        hubMap.set(hId, entry);
      }

      entry.totalOrders += 1;
      if (o.status === OrderStatus.DELIVERED) {
        entry.deliveredOrders += 1;
        entry.grossRevenue += o.totalAmount;
      } else if (o.status === OrderStatus.CANCELLED) {
        entry.cancelledOrders += 1;
      } else {
        entry.grossRevenue += o.totalAmount;
      }
    });

    // Compute AOV for each hub
    const hubBreakdown = Array.from(hubMap.values()).map((h) => {
      const effectiveOrders = Math.max(1, h.totalOrders - h.cancelledOrders);
      return {
        ...h,
        grossRevenue: Math.round(h.grossRevenue * 10) / 10,
        aov: Math.round((h.grossRevenue / effectiveOrders) * 10) / 10,
      };
    });

    // 5. Daily trend (last 14 days or grouped by date)
    const dailyMap = new Map<string, { date: string; revenue: number; orders: number }>();
    orders.forEach((o) => {
      const dateStr = o.placedAt.toISOString().split("T")[0];
      const cur = dailyMap.get(dateStr) || { date: dateStr, revenue: 0, orders: 0 };
      cur.orders += 1;
      if (o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.FAILED_DELIVERY) {
        cur.revenue += o.totalAmount;
      }
      dailyMap.set(dateStr, cur);
    });

    const dailyTrend = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
      .map((d) => ({
        ...d,
        revenue: Math.round(d.revenue * 10) / 10,
      }));

    // 6. Top selling products
    const productSalesMap = new Map<string, {
      productName: string;
      category: string;
      quantitySold: number;
      revenue: number;
    }>();

    orders.forEach((o) => {
      if (o.status === OrderStatus.CANCELLED) return;
      o.items.forEach((item) => {
        const pName = item.product?.name || "Product";
        const cat = item.product?.category?.name || "General";
        const cur = productSalesMap.get(pName) || {
          productName: pName,
          category: cat,
          quantitySold: 0,
          revenue: 0,
        };
        cur.quantitySold += item.quantity;
        cur.revenue += item.subtotal;
        productSalesMap.set(pName, cur);
      });
    });

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map((p) => ({
        ...p,
        revenue: Math.round(p.revenue * 10) / 10,
      }));

    // 7. Payment methods breakdown
    const paymentMethods: Record<string, { count: number; total: number }> = {
      COD: { count: 0, total: 0 },
      RAZORPAY: { count: 0, total: 0 },
      WALLET: { count: 0, total: 0 },
    };

    orders.forEach((o) => {
      const pm = o.paymentMethod || "COD";
      if (!paymentMethods[pm]) {
        paymentMethods[pm] = { count: 0, total: 0 };
      }
      paymentMethods[pm].count += 1;
      if (o.status !== OrderStatus.CANCELLED) {
        paymentMethods[pm].total += o.totalAmount;
      }
    });

    return {
      kpis: {
        grossRevenue: Math.round(grossRevenue * 10) / 10,
        deliveredRevenue: Math.round(deliveredRevenue * 10) / 10,
        totalOrders,
        deliveredOrdersCount: deliveredOrders.length,
        inProgressOrdersCount: inProgressOrders.length,
        cancelledOrdersCount: cancelledOrders.length,
        aov,
        activeHubsCount: allHubs.length,
      },
      hubBreakdown,
      dailyTrend,
      topProducts,
      paymentMethods,
    };
  }
}
