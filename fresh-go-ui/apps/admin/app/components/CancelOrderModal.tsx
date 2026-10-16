"use client";

import { useState } from "react";
import { AlertTriangle, X, Loader2 } from "lucide-react";

export type CancelOrderModalProps = {
  isOpen: boolean;
  orderId: string | null;
  orderNumber?: string;
  customerName?: string;
  totalAmount?: number;
  onClose: () => void;
  onConfirm: (orderId: string, reason: string) => Promise<void> | void;
  isSubmitting?: boolean;
};

const COMMON_REASONS = [
  "No delivery riders available at hub",
  "Customer requested cancellation",
  "Item unavailable / out of stock",
  "Address outside delivery zone",
  "Duplicate / Test order",
];

export function CancelOrderModal({
  isOpen,
  orderId,
  orderNumber,
  customerName,
  totalAmount,
  onClose,
  onConfirm,
  isSubmitting = false,
}: CancelOrderModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(COMMON_REASONS[0]);
  const [customNote, setCustomNote] = useState<string>("");
  const [isBusy, setIsBusy] = useState(false);

  if (!isOpen || !orderId) return null;

  const handleConfirm = async () => {
    const finalReason = customNote.trim()
      ? `${selectedReason}: ${customNote.trim()}`
      : selectedReason;

    setIsBusy(true);
    try {
      await onConfirm(orderId, finalReason);
      onClose();
    } finally {
      setIsBusy(false);
    }
  };

  const displayId = orderNumber || orderId.slice(0, 8);
  const loading = isSubmitting || isBusy;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 46, 41, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.18s ease-out",
      }}
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#FFFFFF",
          borderRadius: "18px",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.3)",
          border: "1px solid rgba(190, 68, 54, 0.25)",
          overflow: "hidden",
          animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Warning Strip */}
        <div
          style={{
            height: "4px",
            background: "linear-gradient(90deg, #BE4436, #E5623E)",
          }}
        />

        {/* Header */}
        <div
          style={{
            padding: "22px 24px 16px 24px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "#FBE7E3",
                border: "1px solid rgba(190, 68, 54, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#BE4436",
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3
                style={{
                  margin: "0 0 4px 0",
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "#0F2E29",
                }}
              >
                Cancel Order #{displayId}?
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "12.5px",
                  color: "#5C6B66",
                  lineHeight: "1.4",
                }}
              >
                This will cancel fulfillment, unassign any rider, and send an instant notification to the customer.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#8C9B96",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "0 24px 20px 24px" }}>
          {/* Order Details Mini-Card */}
          <div
            style={{
              background: "#F8F6F0",
              border: "1px solid #EBE5D8",
              borderRadius: "10px",
              padding: "10px 14px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12.5px",
            }}
          >
            <div>
              <span style={{ color: "#7A8A85" }}>Customer: </span>
              <strong style={{ color: "#0F2E29" }}>
                {customerName || "FreshGo Customer"}
              </strong>
            </div>
            {totalAmount !== undefined && (
              <div>
                <span style={{ color: "#7A8A85" }}>Total: </span>
                <strong style={{ color: "#0F2E29" }}>
                  ₹{totalAmount.toLocaleString()}
                </strong>
              </div>
            )}
          </div>

          {/* Cancellation Reason Picker */}
          <div style={{ marginBottom: "14px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 800,
                color: "#1F4D46",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "8px",
              }}
            >
              Select Reason
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {COMMON_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(reason)}
                    style={{
                      background: isSelected ? "#0F2E29" : "#FFFFFF",
                      color: isSelected ? "#FFFFFF" : "#1F4D46",
                      border: isSelected ? "1px solid #0F2E29" : "1px solid #D5CFC2",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      fontSize: "11.5px",
                      fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 800,
                color: "#1F4D46",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "6px",
              }}
            >
              Additional note (Optional)
            </label>
            <textarea
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Spoke with customer, advised to place order tomorrow morning..."
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #D5CFC2",
                fontSize: "12px",
                fontFamily: "inherit",
                resize: "none",
                outline: "none",
                background: "#FFFFFF",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Actions Footer */}
        <div
          style={{
            padding: "14px 24px",
            background: "#FAF8F5",
            borderTop: "1px solid #EBE5D8",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              background: "#FFFFFF",
              border: "1px solid #D5CFC2",
              color: "#5C6B66",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Keep Order
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              background: "#BE4436",
              border: "none",
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 8px rgba(190, 68, 54, 0.25)",
              transition: "all 0.15s ease",
            }}
          >
            {loading && <Loader2 size={14} className="spin" />}
            {loading ? "Cancelling..." : "Yes, Cancel Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
