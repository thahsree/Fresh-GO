import { Clock3, LayoutDashboard, MapPinned, Settings2, WalletCards } from "lucide-react";
import { DeliveryTab } from "../models/delivery";

type DeliveryNavigationProps = { activeTab: DeliveryTab; onTabChange: (tab: DeliveryTab) => void };
const navigationItems = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "active", label: "Active", icon: MapPinned },
  { id: "earnings", label: "Earnings", icon: WalletCards },
  { id: "history", label: "History", icon: Clock3 },
  { id: "settings", label: "Settings", icon: Settings2 },
] as const;

export function DeliveryNavigation({ activeTab, onTabChange }: DeliveryNavigationProps) {
  const isTabActive = (id: string) => {
    if (activeTab === id) return true;
    if (id === "settings" && (activeTab === "help" || activeTab === "safety" || activeTab === "report")) return true;
    return false;
  };

  return <nav className="delivery-navigation" aria-label="Delivery app navigation">
    {navigationItems.map(({ id, label, icon: Icon }) => (
      <button key={id} className={isTabActive(id) ? "active" : ""} type="button" onClick={() => onTabChange(id)}>
        <Icon size={18} strokeWidth={isTabActive(id) ? 2.5 : 2} />
        <span>{label}</span>
      </button>
    ))}
  </nav>;
}
