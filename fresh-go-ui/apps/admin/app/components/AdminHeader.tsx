"use client";

import { AdminSection, navItems } from "./AdminNavigation";

type AdminHeaderProps = {
  section: AdminSection;
  onViewOrders: () => void;
};

export function AdminHeader({ section, onViewOrders }: AdminHeaderProps) {
  const heading =
    section === "dashboard"
      ? "Good morning, Thashreef"
      : navItems.find(([id]) => id === section)?.[2];

  return (
    <header className="topbar">
      <div>
        <h1 className="heading">{heading}</h1>
        <p className="eyebrow">Wednesday, 16 Sep 2026 · Kozhikode hub</p>
      </div>
      <button className="primary" onClick={onViewOrders}>
        View order queue
      </button>
    </header>
  );
}
