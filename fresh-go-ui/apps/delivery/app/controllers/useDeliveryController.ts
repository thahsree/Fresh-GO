"use client";

import { useEffect, useState, useCallback } from "react";
import {
  deliveryApi,
  DeliveryHub,
  DeliveryUser,
  BackendOrder,
  ActiveTrip,
} from "../lib/api";
import {
  initDeliverySocket,
  subscribeToHub,
  unsubscribeFromHub,
  disconnectDeliverySocket,
} from "../lib/socket";
import {
  ActiveDelivery,
  defaultSettings,
  DeliveryHistoryItem,
  DeliveryPhase,
  DeliveryRequest,
  DeliverySettings,
  DeliveryTab,
  IssueTicket,
} from "../models/delivery";

export function useDeliveryController() {
  const [user, setUser] = useState<DeliveryUser | null>(null);
  const [tab, setTab] = useState<DeliveryTab>("dashboard");
  const [previousTab, setPreviousTab] = useState<DeliveryTab>("dashboard");
  const [isOnline, setIsOnlineState] = useState<boolean>(true);
  const [hubs, setHubs] = useState<DeliveryHub[]>([]);
  const [selectedHub, setSelectedHubState] = useState<DeliveryHub | null>(null);

  // Real backend orders and trip state
  const [availableOrders, setAvailableOrders] = useState<BackendOrder[]>([]);
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [todayEarnings, setTodayEarnings] = useState<number>(0);
  const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Settings & Support
  const [settings, setSettings] = useState<DeliverySettings>(defaultSettings);
  const [tickets, setTickets] = useState<IssueTicket[]>([]);
  const [selectedReportOrderId, setSelectedReportOrderId] = useState<string | undefined>(undefined);
  const [isLiveTripShared, setIsLiveTripShared] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);

  // --- Load Available Orders from Selected Hub ---
  const loadAvailableOrders = useCallback(async (hubId?: string) => {
    if (!deliveryApi.getToken()) return;
    try {
      const orders = await deliveryApi.getAvailableOrders(hubId);
      setAvailableOrders(Array.isArray(orders) ? orders : []);
    } catch (err) {
      console.warn("[delivery] Failed to load available orders:", err);
    }
  }, []);

  // --- Load Full Partner Dashboard ---
  const loadDashboard = useCallback(async () => {
    if (!deliveryApi.getToken()) return;
    try {
      const data = await deliveryApi.getDashboard();
      if (data) {
        setIsOnlineState(data.profile.isOnline);
        setActiveTrip(data.activeTrip);
        setTodayEarnings(data.todayEarnings || 0);
        setRecentDeliveries(data.recentDeliveries || []);
      }
    } catch (err) {
      console.warn("[delivery] Failed to load dashboard:", err);
    }
  }, []);

  // --- Initialize Partner Session and Sockets ---
  useEffect(() => {
    const existingUser = deliveryApi.getUser();
    const token = deliveryApi.getToken();
    const savedHub = deliveryApi.getSelectedHub();

    if (existingUser && token) {
      setUser(existingUser);
      setSelectedHubState(savedHub);

      // 1. Fetch available hubs
      deliveryApi.getHubs()
        .then((fetchedHubs) => {
          if (Array.isArray(fetchedHubs)) {
            setHubs(fetchedHubs);
            // Default to first hub or user's assigned hub if none selected
            if (!savedHub && fetchedHubs.length > 0) {
              const defaultHub =
                fetchedHubs.find((h) => h.id === existingUser.hubId) ||
                fetchedHubs[0];
              setSelectedHubState(defaultHub);
              deliveryApi.saveSelectedHub(defaultHub);
            }
          }
        })
        .catch(console.warn);

      // 2. Load dashboard & available orders
      loadDashboard();
      loadAvailableOrders(savedHub?.id);

      // 3. Connect Socket.io
      const socket = initDeliverySocket(token, {
        onConnect: () => {
          if (savedHub) {
            subscribeToHub(savedHub.id);
          }
        },
        onNewHubOrder: (newOrder) => {
          console.log("[delivery] Real-time new order received:", newOrder);
          loadAvailableOrders(deliveryApi.getSelectedHub()?.id);
        },
        onOrderStatusChanged: () => {
          loadDashboard();
          loadAvailableOrders(deliveryApi.getSelectedHub()?.id);
        },
      });

      if (savedHub) {
        subscribeToHub(savedHub.id);
      }
    }

    setIsLoading(false);

    return () => {
      disconnectDeliverySocket();
    };
  }, [loadDashboard, loadAvailableOrders]);

  // --- Hub Selection ---
  const changeHub = (hub: DeliveryHub) => {
    if (selectedHub) {
      unsubscribeFromHub(selectedHub.id);
    }
    setSelectedHubState(hub);
    deliveryApi.saveSelectedHub(hub);
    subscribeToHub(hub.id);
    loadAvailableOrders(hub.id);
  };

  // --- Login Handler ---
  const handleLoginSuccess = (loggedInUser: DeliveryUser) => {
    setUser(loggedInUser);
    const token = deliveryApi.getToken();
    if (token) {
      initDeliverySocket(token, {
        onConnect: () => {
          const activeHub = deliveryApi.getSelectedHub();
          if (activeHub) subscribeToHub(activeHub.id);
        },
        onNewHubOrder: () => loadAvailableOrders(deliveryApi.getSelectedHub()?.id),
        onOrderStatusChanged: () => {
          loadDashboard();
          loadAvailableOrders(deliveryApi.getSelectedHub()?.id);
        },
      });
    }

    deliveryApi.getHubs().then((hubsList) => {
      if (Array.isArray(hubsList)) {
        setHubs(hubsList);
        const matched =
          hubsList.find((h) => h.id === loggedInUser.hubId) || hubsList[0];
        if (matched) {
          changeHub(matched);
        }
      }
    });

    loadDashboard();
  };

  // --- Logout Handler ---
  const logout = () => {
    disconnectDeliverySocket();
    deliveryApi.clearSession();
    setUser(null);
    setAvailableOrders([]);
    setActiveTrip(null);
    setTab("dashboard");
  };

  // --- Online / Offline Toggle ---
  const toggleOnline = async () => {
    const nextStatus = !isOnline;
    setIsOnlineState(nextStatus);
    try {
      await deliveryApi.updateOnlineStatus(nextStatus);
    } catch (err) {
      console.warn("[delivery] Failed to update duty status:", err);
    }
  };

  // --- Accept Order ---
  const acceptRequest = async (orderId?: string) => {
    const targetId = orderId || (availableOrders.length > 0 ? availableOrders[0].id : null);
    if (!targetId || !isOnline) return;

    try {
      const trip = await deliveryApi.acceptOrder(targetId);
      setActiveTrip(trip);
      setAvailableOrders((prev) => prev.filter((o) => o.id !== targetId));
      setTab("active");
    } catch (err: any) {
      alert(err?.message || "Could not accept order");
    }
  };

  // --- Decline / Dismiss from list ---
  const declineRequest = (orderId?: string) => {
    const targetId = orderId || (availableOrders.length > 0 ? availableOrders[0].id : null);
    if (!targetId) return;
    setAvailableOrders((prev) => prev.filter((o) => o.id !== targetId));
  };

  // --- Advance Active Delivery Milestone ---
  const advanceDelivery = async () => {
    if (!activeTrip) return;

    try {
      if (activeTrip.phase === "ACCEPTED") {
        const updated = await deliveryApi.updateTripPhase(activeTrip.id, "AT_PICKUP");
        setActiveTrip(updated);
      } else if (activeTrip.phase === "AT_PICKUP") {
        const updated = await deliveryApi.updateTripPhase(activeTrip.id, "ON_THE_WAY");
        setActiveTrip(updated);
      } else if (activeTrip.phase === "ON_THE_WAY") {
        await deliveryApi.updateTripPhase(activeTrip.id, "DELIVERED");
        setActiveTrip(null);
        await loadDashboard();
        setTab("history");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to update delivery milestone");
    }
  };

  // Map Backend Order to UI DeliveryRequest
  const currentRequest: DeliveryRequest | null = availableOrders.length > 0
    ? {
        id: availableOrders[0].orderNumber || availableOrders[0].id,
        orderNumber: availableOrders[0].orderNumber,
        customer: availableOrders[0].customer?.name || "Customer",
        customerPhone: availableOrders[0].customer?.phone,
        pickup: availableOrders[0].hub?.name || selectedHub?.name || "FreshGo Hub",
        pickupAddress: availableOrders[0].hub?.address || selectedHub?.address || "Hub Center",
        dropAddress:
          availableOrders[0].deliveryAddress ||
          availableOrders[0].dropAddress ||
          "Doorstep Delivery Point",
        instructions: "Fresh cold-chain delivery · Handle with care",
        payment: `${availableOrders[0].paymentMethod || "COD"} · ₹${availableOrders[0].totalAmount}`,
        distance: "3.5 km",
        distanceKm: 3.5,
        eta: "15-20 min",
        earnings: Math.round(45 + 3.5 * 12), // ₹45 base + ₹12/km
        items: availableOrders[0].items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1,
        itemsSummary: availableOrders[0].items?.map((i) => `${i.product?.name} x${i.quantity}`).join(", "),
      }
    : null;

  // Map ActiveTrip to UI ActiveDelivery
  const currentActiveDelivery: ActiveDelivery | null = activeTrip
    ? {
        id: activeTrip.order?.orderNumber || activeTrip.orderId,
        orderNumber: activeTrip.order?.orderNumber,
        tripId: activeTrip.id,
        customer: activeTrip.order?.customer?.name || "Customer",
        customerPhone: activeTrip.order?.customer?.phone,
        pickup: activeTrip.order?.hub?.name || selectedHub?.name || "FreshGo Hub",
        pickupAddress: activeTrip.order?.hub?.address || selectedHub?.address || "Hub Center",
        dropAddress:
          activeTrip.order?.deliveryAddress ||
          activeTrip.order?.dropAddress ||
          "Doorstep Delivery Point",
        instructions: "Cold-chain vacuum packed · 15-min express delivery",
        payment: `${activeTrip.order?.paymentMethod || "COD"} · ₹${activeTrip.order?.totalAmount}`,
        distance: `${activeTrip.distanceKm || 3.5} km`,
        distanceKm: activeTrip.distanceKm || 3.5,
        eta: "14 min",
        earnings: Math.round(45 + (activeTrip.distanceKm || 3.5) * 12),
        items: activeTrip.order?.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1,
        phase: (activeTrip.phase.toLowerCase().replace(/_/g, "-") as DeliveryPhase) || "accepted",
      }
    : null;

  // Map Recent Deliveries to UI DeliveryHistoryItem
  const historyItems: DeliveryHistoryItem[] = recentDeliveries.map((item) => ({
    id: item.order?.orderNumber || item.id,
    orderNumber: item.order?.orderNumber,
    customer: "FreshGo Customer",
    area: item.order?.hub?.name || selectedHub?.name || "Kozhikode",
    completedAt: item.completedAt ? new Date(item.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently",
    distance: `${item.distanceKm || 3.2} km`,
    earnings: Math.round(45 + (item.distanceKm || 3.2) * 12),
    status: item.phase === "DELIVERED" ? "Delivered" : "Cancelled",
  }));

  const updateSettings = (update: Partial<DeliverySettings>) =>
    setSettings((current) => ({ ...current, ...update }));

  const openHelp = () => {
    setPreviousTab(tab);
    setTab("help");
  };

  const openSafety = () => {
    setPreviousTab(tab);
    setTab("safety");
  };

  const openReport = (orderId?: string) => {
    setSelectedReportOrderId(orderId || (currentActiveDelivery ? currentActiveDelivery.id : undefined));
    setPreviousTab(tab);
    setTab("report");
  };

  const goBack = () => {
    setTab(
      previousTab === "help" || previousTab === "safety" || previousTab === "report"
        ? "settings"
        : previousTab
    );
  };

  const submitTicket = (newTicketData: Omit<IssueTicket, "id" | "createdAt" | "status" | "resolutionNote">): IssueTicket => {
    const newTicket: IssueTicket = {
      ...newTicketData,
      id: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: "Just now",
      status: "under_review",
    };
    setTickets((prev) => [newTicket, ...prev]);

    deliveryApi.reportIssue({
      tripId: activeTrip?.id,
      orderId: selectedReportOrderId,
      category: newTicketData.category,
      description: newTicketData.description,
      priority: newTicketData.priority,
    }).catch(() => {});

    return newTicket;
  };

  return {
    user,
    isLoading,
    handleLoginSuccess,
    logout,
    tab,
    setTab,
    isOnline,
    toggleOnline,
    hubs,
    selectedHub,
    changeHub,
    request: currentRequest,
    availableOrders,
    activeDelivery: currentActiveDelivery,
    acceptRequest,
    declineRequest,
    advanceDelivery,
    history: historyItems,
    todayEarnings,
    settings,
    updateSettings,
    tickets,
    submitTicket,
    openHelp,
    openSafety,
    openReport,
    goBack,
    isLiveTripShared,
    setIsLiveTripShared,
    isSosModalOpen,
    setIsSosModalOpen,
    selectedReportOrderId,
  };
}
