"use client";

export const navItems = [
  ["dashboard", "◈", "Dashboard"],
  ["orders", "▤", "Orders"],
  ["products", "▦", "Products"],
  ["inventory", "▥", "Inventory"],
  ["dispatch", "⇢", "Dispatch"],
] as const;

export type AdminSection = (typeof navItems)[number][0];

type AdminNavigationProps = {
  section: AdminSection;
  onSectionChange: (section: AdminSection) => void;
};

export function AdminNavigation({
  section,
  onSectionChange,
}: AdminNavigationProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/FreshGOlogo.png" alt="FreshGO" />
      </div>
      <nav className="nav">
        {navItems.map(([id, icon, label]) => (
          <button
            key={id}
            className={section === id ? "active" : ""}
            onClick={() => onSectionChange(id)}
          >
            <span>{icon} </span>
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
