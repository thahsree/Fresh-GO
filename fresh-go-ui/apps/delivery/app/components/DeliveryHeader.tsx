import { Bike, ShieldAlert } from "lucide-react";

type DeliveryHeaderProps = {
  isOnline: boolean;
  onOpenSafety?: () => void;
  partnerName?: string;
  hubName?: string;
  vehicleType?: string;
  codCashInHand?: number;
  codLimitExceeded?: boolean;
};

export function DeliveryHeader({
  isOnline,
  onOpenSafety,
  partnerName = "Delivery Partner",
  hubName = "FreshGo Hub",
  vehicleType = "Bike",
  codCashInHand = 0,
  codLimitExceeded = false,
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
        {codCashInHand > 0 && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px",
              borderRadius: "14px",
              background: codLimitExceeded ? "#FEE2E2" : "#FEF3C7",
              color: codLimitExceeded ? "#991B1B" : "#92400E",
              border: codLimitExceeded ? "1px solid #FCA5A5" : "1px solid #FDE68A",
              fontWeight: 800,
              fontSize: "11px",
              lineHeight: 1.2,
            }}
            title={
              codLimitExceeded
                ? "Cash limit reached! Please deposit collected COD cash at hub."
                : "COD Cash in hand to be settled with hub."
            }
          >
            <span>💵 ₹{codCashInHand.toLocaleString("en-IN")}</span>
          </div>
        )}
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
