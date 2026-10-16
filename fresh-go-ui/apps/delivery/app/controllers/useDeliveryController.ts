"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  AlertSoundType,
  defaultSettings,
  DeliveryHistoryItem,
  DeliveryPhase,
  DeliveryRequest,
  DeliverySettings,
  DeliveryTab,
  IssueTicket,
} from "../models/delivery";
import {
  startOrderAlertLoop,
  stopOrderAlertLoop,
  playAlertSoundPreset,
  playOrderAlertSound,
  unlockAudioContext,
  ALERT_SOUND_OPTIONS,
} from "../lib/sound";

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
  const [cancelledTripInfo, setCancelledTripInfo] = useState<{
    orderId: string;
    orderNumber: string;
    cancelReason: string;
  } | null>(null);
  const [todayEarnings, setTodayEarnings] = useState<number>(0);
  const [codCashInHand, setCodCashInHand] = useState<number>(0);
  const [codLimitExceeded, setCodLimitExceeded] = useState<boolean>(false);
  const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Settings & Support (persisted in localStorage)
  const [settings, setSettings] = useState<DeliverySettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("freshgo_delivery_settings");
        if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
      } catch {}
    }
    return defaultSettings;
  });

  const [tickets, setTickets] = useState<IssueTicket[]>([]);
  const [selectedReportOrderId, setSelectedReportOrderId] = useState<string | undefined>(undefined);
  const [isLiveTripShared, setIsLiveTripShared] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);

  // Refs for callbacks to avoid re-binding socket listeners on each render
  const isOnlineRef = useRef(isOnline);
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const activeTripRef = useRef(activeTrip);
  useEffect(() => {
    activeTripRef.current = activeTrip;
  }, [activeTrip]);

  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  const hasInitialLoadedOrdersRef = useRef<boolean>(false);
  const dismissedCancelledIdsRef = useRef<Set<string>>(new Set());

  // Whether an unassigned order is waiting for this rider to accept
  const hasPendingOrderToAccept = Boolean(
    user &&
    isOnline &&
    settings.soundAlerts !== false &&
    availableOrders.length > 0 &&
    !activeTrip
  );

  // --- Continuous Looping Alert Sound (repeats until partner accepts/declines) ---
  useEffect(() => {
    if (hasPendingOrderToAccept) {
      startOrderAlertLoop(settings.alertSound || "chime", 0.85);
    } else {
      stopOrderAlertLoop();
    }

    return () => {
      stopOrderAlertLoop();
    };
  }, [hasPendingOrderToAccept, settings.alertSound, settings.soundAlerts]);

  // --- Load Available Orders from Selected Hub ---
  const loadAvailableOrders = useCallback(async (hubId?: string) => {
    if (!deliveryApi.getToken()) return;
    try {
      const orders = await deliveryApi.getAvailableOrders(hubId);
      const list = Array.isArray(orders) ? orders : [];
      setAvailableOrders(list);

      // Trigger order arrival sound loop when new order appears while online
      if (list.length > 0 && isOnlineRef.current && settingsRef.current.soundAlerts !== false && !activeTripRef.current) {
        startOrderAlertLoop(settingsRef.current.alertSound || "chime", 0.85);
      }
      prevOrderIdsRef.current = new Set(list.map((o: any) => o.id));
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
        setCodCashInHand(data.profile.codCashInHand || 0);
        setCodLimitExceeded(Boolean(data.profile.codLimitExceeded));
        setRecentDeliveries(data.recentDeliveries || []);

        if (data.cancelledTrip) {
          if (!dismissedCancelledIdsRef.current.has(data.cancelledTrip.orderId)) {
            setCancelledTripInfo(data.cancelledTrip);
          }
          if (activeTripRef.current?.orderId === data.cancelledTrip.orderId) {
            setActiveTrip(null);
          }
        }
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

      // Priority 1: User's assigned hub from backend profile
      const assignedHub = existingUser.hub || existingUser.partnerProfile?.hub;
      const initialHub = assignedHub || savedHub;
      if (initialHub) {
        setSelectedHubState(initialHub);
        deliveryApi.saveSelectedHub(initialHub);
      }

      // 1. Fetch available hubs
      deliveryApi.getHubs()
        .then((fetchedHubs) => {
          if (Array.isArray(fetchedHubs)) {
            setHubs(fetchedHubs);
            const userAssignedHub =
              fetchedHubs.find(
                (h) => h.id === existingUser.hubId || h.id === existingUser.partnerProfile?.hubId
              ) || initialHub;

            if (userAssignedHub) {
              setSelectedHubState(userAssignedHub);
              deliveryApi.saveSelectedHub(userAssignedHub);
            }
          }
        })
        .catch(console.warn);

      // 2. Load dashboard & available orders for this partner's hub
      loadDashboard();
      loadAvailableOrders(initialHub?.id);

      // 3. Connect Socket.io
      const socket = initDeliverySocket(token, {
        onConnect: () => {
          const currentHub = deliveryApi.getSelectedHub() || initialHub;
          if (currentHub) {
            subscribeToHub(currentHub.id);
          }
        },
        onNewHubOrder: (newOrder) => {
          console.log("[delivery] Real-time new order received via socket:", newOrder);
          if (isOnlineRef.current && settingsRef.current.soundAlerts !== false) {
            startOrderAlertLoop(settingsRef.current.alertSound || "chime", 0.85);
          }
          loadAvailableOrders(deliveryApi.getSelectedHub()?.id);
        },
        onOrderStatusChanged: (data: any) => {
          console.log("[delivery] Real-time order status changed via socket:", data);
          if (data?.status === "CANCELLED") {
            const isMyActive =
              activeTripRef.current?.orderId === data.orderId ||
              activeTripRef.current?.order?.orderNumber === data.orderNumber;

            if (isMyActive) {
              if (!dismissedCancelledIdsRef.current.has(data.orderId)) {
                setCancelledTripInfo({
                  orderId: data.orderId,
                  orderNumber: data.orderNumber || activeTripRef.current?.order?.orderNumber || data.orderId,
                  cancelReason: data.cancelReason || data.note || "Cancelled by store/admin",
                });
              }
              setActiveTrip(null);
            }

            // Remove from available orders list if cancelled
            setAvailableOrders((prev) => {
              const remaining = prev.filter(
                (o) => o.id !== data.orderId && o.orderNumber !== data.orderNumber
              );
              if (remaining.length === 0) {
                stopOrderAlertLoop();
              }
              return remaining;
            });
          }

          loadDashboard();
          loadAvailableOrders(deliveryApi.getSelectedHub()?.id);
        },
      });

      const currentHub = deliveryApi.getSelectedHub() || initialHub;
      if (currentHub) {
        subscribeToHub(currentHub.id);
      }
    }

    setIsLoading(false);

    return () => {
      stopOrderAlertLoop();
      disconnectDeliverySocket();
    };
  }, [loadDashboard, loadAvailableOrders]);

  // --- Periodic Polling (Every 5s when online to catch all order updates and cancellations) ---
  useEffect(() => {
    if (!user || !isOnline) return;
    const interval = setInterval(() => {
      loadAvailableOrders(selectedHub?.id || deliveryApi.getSelectedHub()?.id);
      loadDashboard();
    }, 5000);
    return () => clearInterval(interval);
  }, [user, isOnline, selectedHub, loadAvailableOrders, loadDashboard]);

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
        onNewHubOrder: (newOrder) => {
          console.log("[delivery] Real-time new order received via socket:", newOrder);
          if (isOnlineRef.current && settingsRef.current.soundAlerts !== false) {
            startOrderAlertLoop(settingsRef.current.alertSound || "chime", 0.85);
          }
          loadAvailableOrders(deliveryApi.getSelectedHub()?.id);
        },
        onOrderStatusChanged: (data: any) => {
          if (data?.status === "CANCELLED") {
            const isMyActive =
              activeTripRef.current?.orderId === data.orderId ||
              activeTripRef.current?.order?.orderNumber === data.orderNumber;

            if (isMyActive) {
              if (!dismissedCancelledIdsRef.current.has(data.orderId)) {
                setCancelledTripInfo({
                  orderId: data.orderId,
                  orderNumber: data.orderNumber || activeTripRef.current?.order?.orderNumber || data.orderId,
                  cancelReason: data.cancelReason || data.note || "Cancelled by store/admin",
                });
              }
              setActiveTrip(null);
            }
          }
          loadDashboard();
          loadAvailableOrders(deliveryApi.getSelectedHub()?.id);
        },
      });
    }

    deliveryApi.getHubs().then((hubsList) => {
      if (Array.isArray(hubsList)) {
        setHubs(hubsList);
        const matched =
          hubsList.find((h) => h.id === loggedInUser.hubId) ||
          hubsList.find((h) => h.code === "HUB-CLT-01" || h.name.includes("Mavoor")) ||
          hubsList[0];
        if (matched) {
          changeHub(matched);
        }
      }
    });

    loadDashboard();
  };

  // --- Logout Handler ---
  const logout = () => {
    stopOrderAlertLoop();
    disconnectDeliverySocket();
    deliveryApi.clearSession();
    setUser(null);
    setAvailableOrders([]);
    setActiveTrip(null);
    setTab("dashboard");
  };

  // --- Online / Offline Toggle ---
  const toggleOnline = async () => {
    unlockAudioContext();
    const nextStatus = !isOnline;
    if (!nextStatus) {
      stopOrderAlertLoop();
    }
    setIsOnlineState(nextStatus);
    isOnlineRef.current = nextStatus;
    try {
      await deliveryApi.updateOnlineStatus(nextStatus);
      if (nextStatus) {
        loadAvailableOrders(selectedHub?.id || deliveryApi.getSelectedHub()?.id);
      }
    } catch (err) {
      console.warn("[delivery] Failed to update duty status:", err);
    }
  };

  // --- Accept Order ---
  const acceptRequest = async (orderId?: string | any) => {
    let cleanId = "";
    if (
      typeof orderId === "string" &&
      orderId.trim().length > 0 &&
      orderId !== "[object Object]"
    ) {
      cleanId = orderId.trim();
    } else if (
      orderId &&
      typeof orderId === "object" &&
      !orderId.nativeEvent &&
      !orderId._reactName
    ) {
      cleanId = orderId.id || orderId.orderId || orderId.orderNumber || "";
    }

    const targetId =
      cleanId || (availableOrders.length > 0 ? availableOrders[0].id : "current");

    if (!isOnline) {
      alert("You are currently offline. Switch on Duty Status to accept orders.");
      return;
    }

    // Immediately stop looping chime on partner action
    stopOrderAlertLoop();

    try {
      const trip = await deliveryApi.acceptOrder(targetId);
      setActiveTrip(trip);
      setAvailableOrders((prev) =>
        prev.filter(
          (o) =>
            o.id !== trip.orderId &&
            o.id !== targetId &&
            o.orderNumber !== targetId
        )
      );
      setTab("active");
    } catch (err: any) {
      alert(err?.message || "Could not accept order");
    }
  };

  // --- Decline / Dismiss from list ---
  const declineRequest = (orderId?: string | any) => {
    const rawTarget =
      typeof orderId === "string" &&
      orderId.trim().length > 0 &&
      orderId !== "[object Object]"
        ? orderId.trim()
        : null;
    const targetId =
      rawTarget || (availableOrders.length > 0 ? availableOrders[0].id : null);
    if (!targetId) return;

    setAvailableOrders((prev) => {
      const remaining = prev.filter((o) => o.id !== targetId && o.orderNumber !== targetId);
      if (remaining.length === 0) {
        stopOrderAlertLoop();
      }
      return remaining;
    });
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

  const acknowledgeCancellation = () => {
    if (cancelledTripInfo?.orderId) {
      dismissedCancelledIdsRef.current.add(cancelledTripInfo.orderId);
    }
    setCancelledTripInfo(null);
    setTab("dashboard");
    stopOrderAlertLoop();
    loadDashboard();
    loadAvailableOrders(selectedHub?.id || deliveryApi.getSelectedHub()?.id);
  };

  const parseDropCoords = (order: any) => {
    try {
      if (order?.deliveryAddressSnapshotJson) {
        const parsed = JSON.parse(order.deliveryAddressSnapshotJson);
        if (parsed.latitude && parsed.longitude) {
          return { lat: Number(parsed.latitude), lng: Number(parsed.longitude) };
        }
      }
    } catch {}
    if (order?.zone?.centerLat && order?.zone?.centerLng) {
      return { lat: Number(order.zone.centerLat), lng: Number(order.zone.centerLng) };
    }
    const hLat = order?.hub?.latitude || selectedHub?.latitude;
    const hLng = order?.hub?.longitude || selectedHub?.longitude;
    if (hLat && hLng) {
      return { lat: Number(hLat) + 0.008, lng: Number(hLng) + 0.008 };
    }
    return undefined;
  };

  // Map Backend Order to UI DeliveryRequest
  const firstOrder = availableOrders[0];
  const firstDropCoords = firstOrder ? parseDropCoords(firstOrder) : null;

  const currentRequest: DeliveryRequest | null = firstOrder
    ? {
        id: firstOrder.id,
        orderNumber: firstOrder.orderNumber,
        customer: firstOrder.customer?.name || "Customer",
        customerPhone: firstOrder.customer?.phone,
        pickup: firstOrder.hub?.name || selectedHub?.name || "FreshGo Hub",
        pickupAddress: firstOrder.hub?.address || selectedHub?.address || "Hub Center",
        dropAddress:
          firstOrder.deliveryAddress ||
          firstOrder.dropAddress ||
          "Doorstep Delivery Point",
        hubLat: firstOrder.hub?.latitude || selectedHub?.latitude,
        hubLng: firstOrder.hub?.longitude || selectedHub?.longitude,
        dropLat: firstDropCoords?.lat,
        dropLng: firstDropCoords?.lng,
        instructions: "Fresh cold-chain delivery · Handle with care",
        payment: `${firstOrder.paymentMethod || "COD"} · ₹${firstOrder.totalAmount}`,
        paymentMethod: firstOrder.paymentMethod || "COD",
        totalAmount: firstOrder.totalAmount || 0,
        distance: "3.5 km",
        distanceKm: 3.5,
        eta: "15-20 min",
        earnings: Math.round(45 + 3.5 * 12), // ₹45 base + ₹12/km
        items: firstOrder.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1,
        itemsSummary: firstOrder.items?.map((i) => `${i.product?.name} x${i.quantity}`).join(", "),
      }
    : null;

  // Map ActiveTrip to UI ActiveDelivery
  const activeDropCoords = activeTrip ? parseDropCoords(activeTrip.order) : null;
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
        hubLat: activeTrip.order?.hub?.latitude || selectedHub?.latitude,
        hubLng: activeTrip.order?.hub?.longitude || selectedHub?.longitude,
        dropLat: activeDropCoords?.lat,
        dropLng: activeDropCoords?.lng,
        instructions: "Cold-chain vacuum packed · 15-min express delivery",
        payment: `${activeTrip.order?.paymentMethod || "COD"} · ₹${activeTrip.order?.totalAmount}`,
        paymentMethod: activeTrip.order?.paymentMethod || "COD",
        totalAmount: activeTrip.order?.totalAmount || 0,
        distance: `${activeTrip.distanceKm || 3.5} km`,
        distanceKm: activeTrip.distanceKm || 3.5,
        eta: "14 min",
        earnings: Math.round(45 + (activeTrip.distanceKm || 3.5) * 12),
        items: activeTrip.order?.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1,
        phase: (activeTrip.phase.toLowerCase().replace(/_/g, "-") as DeliveryPhase) || "accepted",
      }
    : null;

  // Map Recent Deliveries to UI DeliveryHistoryItem (deduplicated by order)
  const seenOrderIdsInHistory = new Set<string>();
  const historyItems: DeliveryHistoryItem[] = [];

  for (const item of recentDeliveries) {
    const uniqueKey = item.order?.orderNumber || item.orderId || item.id;
    if (seenOrderIdsInHistory.has(uniqueKey)) continue;
    seenOrderIdsInHistory.add(uniqueKey);

    let customerArea = item.order?.hub?.name || selectedHub?.name || "Delivery Area";
    if (item.order?.deliveryAddressSnapshotJson) {
      try {
        const snap = typeof item.order.deliveryAddressSnapshotJson === "string"
          ? JSON.parse(item.order.deliveryAddressSnapshotJson)
          : item.order.deliveryAddressSnapshotJson;
        if (snap?.area || snap?.street || snap?.city) {
          customerArea = [snap.area || snap.street, snap.city].filter(Boolean).join(", ");
        }
      } catch {}
    }
    const isCancelled = item.phase === "CANCELLED" || item.order?.status === "CANCELLED";
    const dateToFormat = item.completedAt || item.acceptedAt;

    historyItems.push({
      id: item.order?.orderNumber || item.id,
      tripId: item.id,
      orderNumber: item.order?.orderNumber,
      customer: "FreshGo Customer",
      area: customerArea,
      completedAt: dateToFormat
        ? new Date(dateToFormat).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "Recently",
      distance: `${item.distanceKm || 3.2} km`,
      earnings: isCancelled ? 0 : Math.round(45 + (item.distanceKm || 3.2) * 12),
      status: isCancelled ? "Cancelled" : "Delivered",
      cancelReason: isCancelled
        ? item.order?.cancelReason || item.order?.notes || "Cancelled from Admin Control Tower"
        : undefined,
    });
  }

  const updateSettings = (update: Partial<DeliverySettings>) => {
    unlockAudioContext();
    setSettings((current) => {
      const next = { ...current, ...update };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("freshgo_delivery_settings", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const testSoundAlert = (soundType?: AlertSoundType) => {
    unlockAudioContext();
    playAlertSoundPreset(soundType || settings.alertSound || "chime", 0.85);
  };

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
    cancelledTripInfo,
    acknowledgeCancellation,
    acceptRequest,

    declineRequest,
    advanceDelivery,
    history: historyItems,
    todayEarnings,
    codCashInHand,
    codLimitExceeded,
    settings,
    updateSettings,
    testSoundAlert,
    stopSoundAlert: stopOrderAlertLoop,
    soundOptions: ALERT_SOUND_OPTIONS,
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
