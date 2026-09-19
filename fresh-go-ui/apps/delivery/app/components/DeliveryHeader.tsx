import { Bell, Bike, ShieldAlert } from "lucide-react";

type DeliveryHeaderProps = {
  isOnline: boolean;
  onToggleOnline: () => void;
  onOpenSafety?: () => void;
};

export function DeliveryHeader({ isOnline, onToggleOnline, onOpenSafety }: DeliveryHeaderProps) {
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
        <button className="icon-control" type="button" aria-label="Notifications"><Bell size={18} /><span className="notification-dot" /></button>
        <button className={`availability ${isOnline ? "online" : "offline"}`} type="button" aria-pressed={isOnline} onClick={onToggleOnline}><i /> {isOnline ? "Online" : "Offline"}</button>
      </div>
    </header>
  );
}
