import { AlertCircle, Check, ChevronRight, MapPin, Navigation, Phone, ShieldAlert } from "lucide-react";
import { ActiveDelivery, DeliveryPhase } from "../models/delivery";

type ActiveDeliveryViewProps = {
  delivery: ActiveDelivery | null;
  onAdvance: () => void;
  onOpenDashboard: () => void;
  onOpenReport?: (orderId?: string) => void;
  onOpenSafety?: () => void;
};

const phaseDetails: Record<DeliveryPhase, { action: string; heading: string; helper: string; step: number }> = {
  accepted: {
    action: "I’ve Arrived at the Hub",
    heading: "Head to the Hub Pickup Point",
    helper: "Navigate to the fulfillment hub to collect the fresh cold-chain bag.",
    step: 1,
  },
  "at-pickup": {
    action: "Picked Up & Out for Delivery",
    heading: "Verify & Collect Order",
    helper: "Check order number and cold-chain seal before leaving the store.",
    step: 2,
  },
  "on-the-way": {
    action: "Mark Order as Delivered",
    heading: "Delivering to Customer Doorstep",
    helper: "Confirm hand-off only after handing over package and collecting payment if COD.",
    step: 3,
  },
};

export function ActiveDeliveryView({
  delivery,
  onAdvance,
  onOpenDashboard,
  onOpenReport,
  onOpenSafety,
}: ActiveDeliveryViewProps) {
  if (!delivery) {
    return (
      <section className="empty-state active-empty">
        <span className="empty-icon">
          <Navigation size={24} />
        </span>
        <h2>No Active Delivery</h2>
        <p>Accept an incoming order from your assigned hub to start your run.</p>
        <button className="button button-primary" type="button" onClick={onOpenDashboard}>
          View Hub Orders
        </button>
      </section>
    );
  }

  const details = phaseDetails[delivery.phase] || phaseDetails.accepted;
  const targetAddress =
    delivery.phase === "on-the-way" ? delivery.dropAddress : delivery.pickupAddress;
  const mapQuery = encodeURIComponent(targetAddress);

  return (
    <>
      <div className="view-heading compact">
        <p className="eyebrow">
          Order #{delivery.id} · {delivery.distance}
        </p>
        <h1>{details.heading}</h1>
        <p>{details.helper}</p>
      </div>

      <div className="delivery-progress" aria-label="Delivery progress">
        {["Accepted", "At Hub", "On Way", "Delivered"].map((label, index) => (
          <div
            key={label}
            className={
              index < details.step
                ? "complete"
                : index === details.step
                ? "current"
                : ""
            }
          >
            <span>{index < details.step ? <Check size={13} /> : index + 1}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>

      <section className="route-map">
        <div className="route-line" />
        <div className="map-location map-start">
          <MapPin size={18} />
        </div>
        <div className="map-location map-end">
          <MapPin size={18} />
        </div>
        <span>Live Route · {delivery.eta}</span>
      </section>

      <section className="card active-card">
        <div className="card-heading">
          <div>
            <span className="status-label">
              {delivery.phase === "on-the-way" ? "Customer Drop-off" : "Hub Pickup"}
            </span>
            <h2>{delivery.phase === "on-the-way" ? delivery.customer : delivery.pickup}</h2>
          </div>
          {/* Earnings on active order section commented out
          <span className="earnings-chip" style={{ background: "#e4ece9", color: "#1f4d46" }}>
            Earn ₹{delivery.earnings}
          </span>
          */}
        </div>

        <p className="address">{targetAddress}</p>
        {delivery.instructions && (
          <p className="instruction">“{delivery.instructions}”</p>
        )}

        <div className="quick-actions">
          <a
            className="quick-action"
            href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
            target="_blank"
            rel="noreferrer"
          >
            <Navigation size={17} /> Navigate GPS
          </a>
          {delivery.customerPhone && (
            <a
              className="quick-action"
              href={`tel:${delivery.customerPhone}`}
            >
              <Phone size={17} /> Call Customer
            </a>
          )}
        </div>

        <div className="active-support-bar">
          {onOpenReport && (
            <button
              type="button"
              className="active-support-link"
              onClick={() => onOpenReport(delivery.id)}
            >
              <AlertCircle size={14} /> Report Issue
            </button>
          )}
          {onOpenSafety && (
            <button
              type="button"
              className="active-support-link safety"
              onClick={onOpenSafety}
            >
              <ShieldAlert size={14} /> Safety SOS
            </button>
          )}
        </div>
      </section>

      <button
        className="button button-primary delivery-advance"
        type="button"
        onClick={onAdvance}
      >
        {details.action} <ChevronRight size={18} />
      </button>
    </>
  );
}
