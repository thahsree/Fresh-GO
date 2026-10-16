"use client";

import { AlertCircle, Check, ChevronRight, Navigation, Phone, ShieldAlert, XCircle } from "lucide-react";
import { ActiveDelivery, DeliveryPhase } from "../models/delivery";
import { DeliveryRouteMap } from "./DeliveryRouteMap";

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
  // 1. No Active Delivery Empty State
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

      {/* Real Live OpenStreetMap & OSRM Routing Map */}
      <DeliveryRouteMap
        pickupAddress={delivery.pickupAddress}
        dropAddress={delivery.dropAddress}
        hubLat={delivery.hubLat}
        hubLng={delivery.hubLng}
        dropLat={delivery.dropLat}
        dropLng={delivery.dropLng}
        phase={delivery.phase}
        eta={delivery.eta}
        distance={delivery.distance}
      />

      <section className="card active-card">
        <div className="card-heading">
          <div>
            <span className="status-label">
              {delivery.phase === "on-the-way" ? "Customer Drop-off" : "Hub Pickup"}
            </span>
            <h2>{delivery.phase === "on-the-way" ? delivery.customer : delivery.pickup}</h2>
          </div>
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

      {delivery.phase === "on-the-way" && (delivery.paymentMethod === "COD" || delivery.payment?.includes("COD")) && (
        <div
          style={{
            margin: "14px 0",
            padding: "14px 16px",
            borderRadius: "12px",
            background: "#FEF3C7",
            border: "1.5px solid #F59E0B",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 6px rgba(245, 158, 11, 0.15)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "#92400E",
              }}
            >
              💵 Cash on Delivery (COD)
            </div>
            <div style={{ fontSize: "12.5px", color: "#78350F", marginTop: "2px" }}>
              Collect physical cash from customer before hand-off
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "19px", fontWeight: 900, color: "#92400E" }}>
              ₹{delivery.totalAmount || delivery.payment?.replace(/[^0-9]/g, "") || "0"}
            </span>
          </div>
        </div>
      )}

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
