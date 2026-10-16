"use client";

import React from "react";
import { AlertTriangle, ArrowRight, X } from "lucide-react";

type OrderCancelledModalProps = {
  cancelledDelivery: {
    orderId: string;
    orderNumber: string;
    cancelReason: string;
  };
  onViewAvailableOrders: () => void;
};

export function OrderCancelledModal({
  cancelledDelivery,
  onViewAvailableOrders,
}: OrderCancelledModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.2s ease-out",
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          backgroundColor: "#FFFFFF",
          borderRadius: "20px",
          boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0, 0, 0, 0.1)",
          padding: "24px 20px 20px",
          position: "relative",
          textAlign: "center",
          animation: "scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dismiss X button */}
        <button
          type="button"
          onClick={onViewAvailableOrders}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "1px solid #E2E8F0",
            backgroundColor: "#F8FAFC",
            color: "#64748B",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Cancel Icon */}
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            backgroundColor: "#FEE2E2",
            color: "#DC2626",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 14px",
            boxShadow: "0 4px 14px rgba(220, 38, 38, 0.18)",
          }}
        >
          <AlertTriangle size={30} strokeWidth={2.4} />
        </div>

        {/* Heading & Order Number */}
        <span
          style={{
            fontSize: "11px",
            fontWeight: 800,
            color: "#DC2626",
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            display: "block",
            marginBottom: 4,
          }}
        >
          Order Cancelled
        </span>
        <h2
          style={{
            fontSize: "19px",
            fontWeight: 800,
            color: "#0F172A",
            margin: "0 0 14px",
          }}
        >
          Order #{cancelledDelivery.orderNumber}
        </h2>

        {/* Cancellation Reason Box */}
        <div
          style={{
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "14px",
            padding: "12px 14px",
            textAlign: "left",
            marginBottom: "14px",
          }}
        >
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 800,
              color: "#991B1B",
              textTransform: "uppercase",
              letterSpacing: "0.4px",
              display: "block",
              marginBottom: 4,
            }}
          >
            Cancellation Reason
          </span>
          <p
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#7F1D1D",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            "{cancelledDelivery.cancelReason || "Cancelled by store/admin"}"
          </p>
        </div>

        {/* Helpful return instructions */}
        <p
          style={{
            fontSize: "12px",
            color: "#64748B",
            lineHeight: 1.5,
            margin: "0 0 20px",
          }}
        >
          If you have already collected packages from the hub, please return items to the kitchen packing counter.
        </p>

        {/* Action Button */}
        <button
          type="button"
          onClick={onViewAvailableOrders}
          className="button button-primary"
          style={{
            width: "100%",
            padding: "13px 18px",
            borderRadius: "12px",
            fontSize: "13.5px",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <span>View Available Orders</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
