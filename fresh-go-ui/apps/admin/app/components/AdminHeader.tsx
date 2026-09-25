"use client";

import { useEffect, useState } from "react";
import { AdminSection, navItems } from "./AdminNavigation";
import { api, AdminUser } from "../lib/api";

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
      setDateStr(`${formatted} · Central Hub (Kozhikode)`);
    } catch {
      setDateStr("Central Hub (Kozhikode)");
    }

    api.ensureAdminAuth().then((user) => {
      if (user) setAdminUser(user);
    });
  }, []);

  const heading =
    section === "dashboard"
      ? mounted && adminUser?.name
        ? `Good day, ${adminUser.name}`
        : "Good day, Dispatch Admin"
      : navItems.find(([id]) => id === section)?.[2];

  return (
    <header className="topbar">
      <div>
        <h1 className="heading">{heading}</h1>
        <p className="eyebrow" suppressHydrationWarning>
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
                  ? "Backend Connected (Port 4000)"
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
      </div>
    </header>
  );
}
