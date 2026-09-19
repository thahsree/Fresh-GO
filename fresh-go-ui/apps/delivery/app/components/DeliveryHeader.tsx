import { Bell, Bike, ShieldAlert } from "lucide-react";

type DeliveryHeaderProps = {
  isOnline: boolean;
  onToggleOnline?: () => void;
  onOpenSafety?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
};

export function DeliveryHeader({
  isOnline,
  onOpenSafety,
  onOpenNotifications,
  unreadNotificationsCount = 0,
}: DeliveryHeaderProps) {
  return (
    <header className="delivery-header">
      <div className="driver-profile">
        <span className="driver-avatar" aria-hidden="true"><Bike size={19} /></span>
        <div><strong>Arun K.</strong><span>Bike · Zone 1</span></div>
      </div>
      <div className="header-actions">
        {onOpenSafety && (
          <button
            className="icon-control safety-header-btn"
            type="button"
            aria-label="Safety Toolkit"
            onClick={onOpenSafety}
            title="Safety Toolkit"
          >
            <ShieldAlert size={18} />
          </button>
        )}
        <button
          className="icon-control"
          type="button"
          aria-label={`Notifications${unreadNotificationsCount > 0 ? ` (${unreadNotificationsCount} unread)` : ""}`}
          onClick={onOpenNotifications}
          title="Notifications"
        >
          <Bell size={18} />
          {unreadNotificationsCount > 0 && <span className="notification-dot" aria-hidden="true" />}
        </button>
        <div
          className={`availability ${isOnline ? "online" : "offline"} display-only`}
          role="status"
          aria-label={`Current status: ${isOnline ? "Online" : "Offline"}`}
        >
          <i /> {isOnline ? "Online" : "Offline"}
        </div>
      </div>
    </header>
  );
}
