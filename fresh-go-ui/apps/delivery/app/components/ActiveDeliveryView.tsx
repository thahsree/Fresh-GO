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
  accepted: { action: "I’ve arrived at the store", heading: "Head to the pickup point", helper: "Confirm when you have reached Fresh Food Hub.", step: 1 },
  "at-pickup": { action: "Confirm pickup", heading: "Collect the order", helper: "Check the order count before leaving the store.", step: 2 },
  "on-the-way": { action: "Mark as delivered", heading: "On the way to the customer", helper: "Confirm delivery only after the hand-off is complete.", step: 3 },
};

export function ActiveDeliveryView({ delivery, onAdvance, onOpenDashboard, onOpenReport, onOpenSafety }: ActiveDeliveryViewProps) {
  if (!delivery) return <section className="empty-state active-empty"><span className="empty-icon"><Navigation size={24} /></span><h2>No active delivery</h2><p>Accept a nearby delivery request to start your next run.</p><button className="button button-primary" type="button" onClick={onOpenDashboard}>Find deliveries</button></section>;

  const details = phaseDetails[delivery.phase];
  const mapQuery = encodeURIComponent(delivery.phase === "on-the-way" ? delivery.dropAddress : delivery.pickupAddress);
  return <>
    <div className="view-heading compact"><p className="eyebrow">Order #{delivery.id} · {delivery.distance}</p><h1>{details.heading}</h1><p>{details.helper}</p></div>
    <div className="delivery-progress" aria-label="Delivery progress">
      {["Accepted", "At store", "Delivering", "Delivered"].map((label, index) => <div key={label} className={index < details.step ? "complete" : index === details.step ? "current" : ""}><span>{index < details.step ? <Check size={13} /> : index + 1}</span><small>{label}</small></div>)}
    </div>
    <section className="route-map"><div className="route-line" /><div className="map-location map-start"><MapPin size={18} /></div><div className="map-location map-end"><MapPin size={18} /></div><span>Live route · {delivery.eta}</span></section>
    <section className="card active-card">
      <div className="card-heading"><div><span className="status-label">{delivery.phase === "on-the-way" ? "Drop-off" : "Pickup"}</span><h2>{delivery.phase === "on-the-way" ? delivery.customer : delivery.pickup}</h2></div><span className="earnings-chip">Rs {delivery.earnings}</span></div>
      <p className="address">{delivery.phase === "on-the-way" ? delivery.dropAddress : delivery.pickupAddress}</p>
      {delivery.phase === "on-the-way" && <p className="instruction">“{delivery.instructions}”</p>}
      <div className="quick-actions">
        <a className="quick-action" href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noreferrer"><Navigation size={17} /> Navigate</a>
        <button className="quick-action" type="button"><Phone size={17} /> Call</button>
      </div>
      <div className="active-support-bar">
        {onOpenReport && (
          <button type="button" className="active-support-link" onClick={() => onOpenReport(delivery.id)}>
            <AlertCircle size={14} /> Report issue with order
          </button>
        )}
        {onOpenSafety && (
          <button type="button" className="active-support-link safety" onClick={onOpenSafety}>
            <ShieldAlert size={14} /> Safety SOS
          </button>
        )}
      </div>
    </section>
    <button className="button button-primary delivery-advance" type="button" onClick={onAdvance}>{details.action} <ChevronRight size={18} /></button>
  </>;
}
