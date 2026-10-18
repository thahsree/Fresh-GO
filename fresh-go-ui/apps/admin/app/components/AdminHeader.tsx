"use client";

import { useEffect, useState } from "react";
import { AdminSection, navItems } from "./AdminNavigation";
import { api, AdminUser } from "../lib/api";
import { MapPin, LogOut } from "lucide-react";

type AdminHeaderProps = {
  section: AdminSection;
  onViewOrders?: () => void;
  isBackendConnected?: boolean;
  currentUser?: AdminUser | null;
  onToast?: (msg: string, type?: "success" | "error" | "info" | "delete") => void;
};

export function AdminHeader({
  section,
  isBackendConnected = false,
  currentUser,
  onToast,
}: AdminHeaderProps) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dateStr, setDateStr] = useState("Today");
  const [storeActive, setStoreActive] = useState<boolean>(true);
  const [updatingStore, setUpdatingStore] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const formatted = new Intl.DateTimeFormat("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date());
      setDateStr(formatted);
    } catch {
      setDateStr("Today");
    }

    if (!currentUser) {
      const cached = api.getAdminUser();
      if (cached) {
        setAdminUser(cached);
        if (cached.hub?.isActive !== undefined) setStoreActive(Boolean(cached.hub.isActive));
      }
      api.ensureAdminAuth().then((user) => {
        if (user) {
          setAdminUser(user);
          if (user.hub?.isActive !== undefined) setStoreActive(Boolean(user.hub.isActive));
        }
      });
    } else if (currentUser.hub?.isActive !== undefined) {
      setStoreActive(Boolean(currentUser.hub.isActive));
    }
  }, [currentUser]);

  const activeUser = currentUser || adminUser;
  const isSuperAdmin = activeUser?.role === "SUPER_ADMIN";
  const hubName =
    activeUser?.hub?.name ||
    (isSuperAdmin ? "Central Dispatch" : "FreshGo Hub");
  const hubCode = activeUser?.hub?.code || (isSuperAdmin ? "ALL" : "");

  const heading =
    section === "dashboard"
      ? mounted && activeUser?.name
        ? `Good day, ${activeUser.name}`
        : "Good day, Hub Dispatch Admin"
      : navItems.find(([id]) => id === section)?.[2];

  const handleLogout = () => {
    api.clearSession();
    window.location.href = "/login";
  };

  const handleToggleStoreActive = async () => {
    const hubId = activeUser?.hub?.id || activeUser?.hubId;
    if (!hubId) {
      onToast?.("No specific hub assigned to toggle store status.", "error");
      return;
    }
    const nextStatus = !storeActive;
    setUpdatingStore(true);
    try {
      await api.hubs.update(hubId, { isActive: nextStatus });
      setStoreActive(nextStatus);
      if (activeUser?.hub) {
        activeUser.hub.isActive = nextStatus;
      }
      onToast?.(
        nextStatus
          ? `Store is now ONLINE and accepting customer orders!`
          : `Store is now OFFLINE (Orders temporarily paused).`,
        nextStatus ? "success" : "info"
      );
    } catch (err: any) {
      onToast?.(err?.message || "Could not update store status", "error");
    } finally {
      setUpdatingStore(false);
    }
  };

  return (
    <header className="topbar">
      <div>
        <h1 className="heading">{heading}</h1>
        <p className="eyebrow" suppressHydrationWarning>
          <span style={{ fontWeight: 700, color: "#1F4D46", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <MapPin size={14} color="#E5623E" />
            {hubName} {hubCode ? `(${hubCode})` : ""}
          </span>
          {" · "}
          {dateStr}
        </p>
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {/* Store Active / Inactive Status Switch */}
        {mounted && activeUser && (activeUser.hub?.id || activeUser.hubId) && (
          <button
            type="button"
            onClick={handleToggleStoreActive}
            disabled={updatingStore}
            title={storeActive ? "Click to set store offline (pause orders)" : "Click to set store online (accept orders)"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 14px",
              borderRadius: "999px",
              background: storeActive ? "#E3F1E9" : "#FBE7E3",
              border: storeActive ? "1px solid #2E7D5B" : "1px solid #BE4436",
              color: storeActive ? "#1F4D46" : "#BE4436",
              fontSize: "12px",
              fontWeight: 800,
              cursor: updatingStore ? "wait" : "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: storeActive ? "#2E7D5B" : "#BE4436",
                boxShadow: storeActive ? "0 0 0 2px rgba(46,125,91,0.25)" : "none",
              }}
            />
            {updatingStore ? "Updating..." : storeActive ? "Store Online" : "Store Offline"}
          </button>
        )}

        {mounted && activeUser && (
          <span
            style={{
              fontSize: "12px",
              padding: "6px 12px",
              borderRadius: "999px",
              background: "#E4ECE9",
              color: "#1F4D46",
              fontWeight: 700,
            }}
          >
            {activeUser.role}: {activeUser.phone}
          </span>
        )}

        <button
          onClick={handleLogout}
          title="Switch Account / Sign Out"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E3DDCF",
            color: "#BE4436",
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
