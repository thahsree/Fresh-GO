"use client";

import { useState } from "react";
import {
  ActiveDelivery,
  DeliveryNotification,
  DeliveryPhase,
  DeliveryRequest,
  DeliverySettings,
  DeliveryTab,
  initialHistory,
  initialNotifications,
  initialSettings,
  initialTickets,
  IssueTicket,
  pendingRequest,
} from "../models/delivery";

const baseTodayEarnings = 1120;
const baseWeeklyEarnings = 6840;
const nextPhase: Record<DeliveryPhase, DeliveryPhase | "complete"> = {
  accepted: "at-pickup",
  "at-pickup": "on-the-way",
  "on-the-way": "complete",
};

export function useDeliveryController() {
  const [tab, setTab] = useState<DeliveryTab>("dashboard");
  const [previousTab, setPreviousTab] = useState<DeliveryTab>("dashboard");
  const [isOnline, setIsOnline] = useState(true);
  const [request, setRequest] = useState<DeliveryRequest | null>(pendingRequest);
  const [activeDelivery, setActiveDelivery] = useState<ActiveDelivery | null>(null);
  const [history, setHistory] = useState(initialHistory);
  const [todayEarnings, setTodayEarnings] = useState(baseTodayEarnings);
  const [settings, setSettings] = useState<DeliverySettings>(initialSettings);
  const [tickets, setTickets] = useState<IssueTicket[]>(initialTickets);
  const [selectedReportOrderId, setSelectedReportOrderId] = useState<string | undefined>(undefined);
  const [isLiveTripShared, setIsLiveTripShared] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<DeliveryNotification[]>(initialNotifications);

  const acceptRequest = () => {
    if (!request || !isOnline) return;
    setActiveDelivery({ ...request, phase: "accepted" });
    setRequest(null);
    setTab("active");
  };

  const declineRequest = () => setRequest(null);

  const advanceDelivery = () => {
    if (!activeDelivery) return;
    const next = nextPhase[activeDelivery.phase];
    if (next === "complete") {
      setHistory((current) => [
        { id: activeDelivery.id, customer: activeDelivery.customer, area: activeDelivery.dropAddress.split(",")[0], completedAt: "Just now", distance: activeDelivery.distance, earnings: activeDelivery.earnings, status: "Delivered" },
        ...current,
      ]);
      setTodayEarnings((current) => current + activeDelivery.earnings);
      setActiveDelivery(null);
      setTab("history");
      return;
    }
    setActiveDelivery({ ...activeDelivery, phase: next });
  };

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
    setSelectedReportOrderId(orderId || (activeDelivery ? activeDelivery.id : undefined));
    setPreviousTab(tab);
    setTab("report");
  };

  const openNotifications = () => {
    setPreviousTab(tab);
    setTab("notifications");
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((current) =>
      current.map((notif) => (notif.id === id ? { ...notif, isRead: true } : notif))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((current) => current.map((notif) => ({ ...notif, isRead: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const goBack = () => {
    if (tab === "notifications") {
      setTab(previousTab === "notifications" ? "dashboard" : previousTab);
      return;
    }
    setTab(previousTab === "help" || previousTab === "safety" || previousTab === "report" ? "settings" : previousTab);
  };

  const submitTicket = (newTicketData: Omit<IssueTicket, "id" | "createdAt" | "status" | "resolutionNote">) => {
    const newTicket: IssueTicket = {
      ...newTicketData,
      id: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: "Just now",
      status: "under_review",
    };
    setTickets((prev) => [newTicket, ...prev]);
    return newTicket;
  };

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  return {
    activeDelivery,
    acceptRequest,
    advanceDelivery,
    clearNotifications,
    declineRequest,
    goBack,
    history,
    isLiveTripShared,
    isOnline,
    isSosModalOpen,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    notifications,
    openHelp,
    openNotifications,
    openReport,
    openSafety,
    request,
    selectedReportOrderId,
    setIsLiveTripShared,
    setIsOnline,
    setIsSosModalOpen,
    setSelectedReportOrderId,
    setTab,
    settings,
    submitTicket,
    tab,
    tickets,
    todayEarnings,
    unreadNotificationCount,
    updateSettings,
    weeklyEarnings: baseWeeklyEarnings + todayEarnings - baseTodayEarnings,
  };
}
