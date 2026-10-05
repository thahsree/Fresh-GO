"use client";

import { useEffect, useState, useCallback } from "react";
import { api, QueueOrder, ActivePartner } from "../lib/api";

export function useDispatchController() {
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [partners, setPartners] = useState<ActivePartner[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);

  const fetchTower = useCallback(async () => {
    try {
      await api.ensureAdminAuth();
      const data = await api.dispatch.getTower();
      if (data) {
        if (data.queueOrders) setOrders(data.queueOrders);
        if (data.activePartners) setPartners(data.activePartners);
        setIsLive(true);
      }
    } catch (err) {
      console.warn("Could not fetch dispatch tower data:", err);
      setIsLive(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTower();
    const interval = setInterval(fetchTower, 10000); // 10s live poll
    return () => clearInterval(interval);
  }, [fetchTower]);

  const assignOrder = async (orderId: string, partnerProfileId?: string) => {
    // 1. Locate order in live queue
    const liveOrder = orders.find(
      (o) => o.id === orderId || o.orderNumber === orderId
    );
    const targetOrderId = liveOrder?.id || orderId;
    const cleanPartnerId =
      partnerProfileId && partnerProfileId.trim() !== ""
        ? partnerProfileId.trim()
        : undefined;

    try {
      await api.ensureAdminAuth();
      const res = await api.dispatch.assignOrder(targetOrderId, cleanPartnerId);
      await fetchTower();
      return {
        success: true,
        message:
          res.message ||
          `Order #${liveOrder?.orderNumber || orderId} dispatched to partner`,
      };
    } catch (err: any) {
      console.warn("Assign order backend notice:", err?.message || err);
      return {
        success: false,
        error: err?.message || "Could not dispatch order to partner",
      };
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const liveOrder = orders.find(
      (o) => o.id === orderId || o.orderNumber === orderId
    );
    const targetOrderId = liveOrder?.id || orderId;

    try {
      await api.ensureAdminAuth();
      await api.orders.updateStatus(targetOrderId, status);
      await fetchTower();
      return {
        success: true,
        message: `Order #${liveOrder?.orderNumber || orderId} moved to ${status}`,
      };
    } catch (err: any) {
      console.warn("Update order status backend notice:", err?.message || err);
      return {
        success: false,
        error: err?.message || "Could not update order status",
      };
    }
  };

  return {
    orders,
    partners,
    isLoading,
    isLive,
    refetch: fetchTower,
    assignOrder,
    updateOrderStatus,
  };
}
