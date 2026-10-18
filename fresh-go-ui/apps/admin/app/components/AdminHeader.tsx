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
};

export function AdminHeader({
  section,
  isBackendConnected = false,
  currentUser,
}: AdminHeaderProps) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dateStr, setDateStr] = useState("Today");

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
      if (cached) setAdminUser(cached);
      api.ensureAdminAuth().then((user) => {
        if (user) setAdminUser(user);
      });
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
