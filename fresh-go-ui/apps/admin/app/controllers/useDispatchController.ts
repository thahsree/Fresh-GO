"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api, QueueOrder, ActivePartner } from "../lib/api";
import { playOrderAlertSound } from "../lib/sound";

export type OnNewOrderCallback = (newOrders: QueueOrder[]) => void;

export function useDispatchController(onNewOrder?: OnNewOrderCallback) {
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [partners, setPartners] = useState<ActivePartner[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef<boolean>(true);

  const fetchTower = useCallback(async () => {
    try {
      await api.ensureAdminAuth();
      const data = await api.dispatch.getTower();
      if (data) {
        if (data.queueOrders) {
          const freshOrders = data.queueOrders;
          setOrders(freshOrders);

          // Detect new incoming orders
          if (isFirstLoadRef.current) {
            freshOrders.forEach((o) => knownOrderIdsRef.current.add(o.id));
            isFirstLoadRef.current = false;
          } else {
            const newlyArrived = freshOrders.filter(
              (o) => !knownOrderIdsRef.current.has(o.id)
            );
            if (newlyArrived.length > 0) {
              newlyArrived.forEach((o) => knownOrderIdsRef.current.add(o.id));
              // Play dark store order chime alert
              playOrderAlertSound();
              onNewOrder?.(newlyArrived);
            }
          }
        }
        if (data.activePartners) setPartners(data.activePartners);
        setIsLive(true);
      }
    } catch (err) {
      console.warn("Could not fetch dispatch tower data:", err);
      setIsLive(false);
    } finally {
      setIsLoading(false);
    }
  }, [onNewOrder]);

  useEffect(() => {
    fetchTower();
    const interval = setInterval(fetchTower, 7000); // 7s live poll for prompt order alerts
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

  const updateOrderStatus = async (
    orderId: string,
    status: string,
    note?: string
  ) => {
    const liveOrder = orders.find(
      (o) => o.id === orderId || o.orderNumber === orderId
    );
    const targetOrderId = liveOrder?.id || orderId;

    try {
      await api.ensureAdminAuth();
      await api.orders.updateStatus(targetOrderId, status, note);
      await fetchTower();
      return {
        success: true,
        message:
          status === "CANCELLED"
            ? `Order #${liveOrder?.orderNumber || orderId} has been cancelled`
            : `Order #${liveOrder?.orderNumber || orderId} moved to ${status}`,
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
