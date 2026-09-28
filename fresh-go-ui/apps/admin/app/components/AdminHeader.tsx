"use client";

import { useEffect, useState } from "react";
import { AdminSection, navItems } from "./AdminNavigation";
import { api, AdminUser } from "../lib/api";
import { MapPin, LogOut } from "lucide-react";

type AdminHeaderProps = {
  section: AdminSection;
  onViewOrders: () => void;
  isBackendConnected?: boolean;
};

export function AdminHeader({
  section,
  onViewOrders,
  isBackendConnected = false,
}: AdminHeaderProps) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dateStr, setDateStr] = useState("Kozhikode Central Hub");

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

    api.ensureAdminAuth().then((user) => {
      if (user) setAdminUser(user);
    });
  }, []);

  const hubName =
    adminUser?.hub?.name || "FreshGo Central Hub (Mavoor Road)";
  const hubCode = adminUser?.hub?.code || "HUB-CLT-01";

  const heading =
    section === "dashboard"
      ? mounted && adminUser?.name
        ? `Good day, ${adminUser.name}`
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
            {hubName} ({hubCode})
          </span>
          {" · "}
          {dateStr}
          {mounted && (
            <>
              {" · "}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontWeight: 700,
                  color: isBackendConnected ? "#2E7D5B" : "#B9791F",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: isBackendConnected ? "#2E7D5B" : "#B9791F",
                  }}
                />
                {isBackendConnected
                  ? "Backend Connected"
                  : "Local Mode"}
              </span>
            </>
          )}
        </p>
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {mounted && adminUser && (
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
            {adminUser.role}: {adminUser.phone}
          </span>
        )}

        <button className="primary" onClick={onViewOrders}>
          View order queue
        </button>

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
