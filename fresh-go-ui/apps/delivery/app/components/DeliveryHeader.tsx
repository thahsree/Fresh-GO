import { Bike, ShieldAlert } from "lucide-react";

type DeliveryHeaderProps = {
  isOnline: boolean;
  onOpenSafety?: () => void;
  partnerName?: string;
  hubName?: string;
  vehicleType?: string;
};

export function DeliveryHeader({
  isOnline,
  onOpenSafety,
  partnerName = "Delivery Partner",
  hubName = "FreshGo Hub",
  vehicleType = "Bike",
}: DeliveryHeaderProps) {
  return (
    <header className="delivery-header">
      <div className="driver-profile">
        <span className="driver-avatar" aria-hidden="true">
          <Bike size={19} />
        </span>
        <div>
          <strong>{partnerName}</strong>
          <span>{vehicleType} · {hubName}</span>
        </div>
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
