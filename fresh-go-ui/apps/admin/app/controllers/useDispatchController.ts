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

    // If order is not present in live backend queue (e.g. static/demo order), handle locally
    if (!liveOrder) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId || o.orderNumber === orderId
            ? { ...o, status: "ASSIGNED" }
            : o
        )
      );
      return {
        success: true,
        isDemo: true,
        message: `Order #${orderId} assigned locally (demo)`,
      };
    }

    try {
      await api.ensureAdminAuth();
      const res = await api.dispatch.assignOrder(liveOrder.id, partnerProfileId);
      await fetchTower();
      return {
        success: true,
        message:
          res.message ||
          `Order #${liveOrder.orderNumber} dispatched to partner`,
      };
    } catch (err: any) {
      console.warn("Assign order backend notice:", err?.message || err);
      // Optimistically mark as assigned in local state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === liveOrder.id ? { ...o, status: "ASSIGNED" } : o
        )
      );
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

    if (!liveOrder) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId || o.orderNumber === orderId
            ? { ...o, status }
            : o
        )
      );
      return {
        success: true,
        isDemo: true,
        message: `Status updated to ${status} (demo)`,
      };
    }

    try {
      await api.ensureAdminAuth();
      await api.orders.updateStatus(liveOrder.id, status);
      await fetchTower();
      return {
        success: true,
        message: `Order #${liveOrder.orderNumber} moved to ${status}`,
      };
    } catch (err: any) {
      console.warn("Update order status backend notice:", err?.message || err);
      setOrders((prev) =>
        prev.map((o) => (o.id === liveOrder.id ? { ...o, status } : o))
      );
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
