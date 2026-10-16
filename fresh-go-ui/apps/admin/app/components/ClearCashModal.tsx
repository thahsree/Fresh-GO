"use client";

import { useState, useEffect } from "react";
import { Banknote, X, Loader2, CheckCircle2 } from "lucide-react";

export type ClearCashModalProps = {
  isOpen: boolean;
  partner: {
    id: string;
    name?: string;
    phone?: string;
    vehicleType?: string;
    codCashInHand?: number;
    hubName?: string;
  } | null;
  onClose: () => void;
  onConfirm: (partnerId: string, amount: number, notes?: string) => Promise<void> | void;
};

export function ClearCashModal({
  isOpen,
  partner,
  onClose,
  onConfirm,
}: ClearCashModalProps) {
  const currentCash = partner?.codCashInHand || 0;
  const [amountStr, setAmountStr] = useState<string>(String(currentCash));
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (partner) {
      setAmountStr(String(partner.codCashInHand || 0));
      setNotes("");
    }
  }, [partner]);

  if (!isOpen || !partner) return null;

  const parsedAmount = parseFloat(amountStr) || 0;
  const isValidAmount = parsedAmount > 0 && parsedAmount <= currentCash;

  const handleConfirm = async () => {
    if (!isValidAmount || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm(partner.id, parsedAmount, notes.trim() || undefined);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="delete-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="delete-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "460px", padding: "26px" }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "#E3F1E9",
                color: "#2E7D5B",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Banknote size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", color: "var(--dark)", fontWeight: 800 }}>
                Clear Cash in Hand
              </h3>
              <p className="muted" style={{ margin: "2px 0 0", fontSize: "12px" }}>
                Collect and settle physical COD cash from delivery partner
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: "transparent",
              border: 0,
              color: "var(--muted)",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Rider Summary Card */}
        <div
          style={{
            background: "#F6F2EA",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "12px 14px",
            marginBottom: "16px",
            fontSize: "13px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ color: "var(--dark)", display: "block" }}>
                {partner.name || "Delivery Partner"}
              </strong>
              <span className="muted" style={{ fontSize: "11px" }}>
                {partner.vehicleType || "BIKE"} {partner.phone ? `· ${partner.phone}` : ""}{" "}
                {partner.hubName ? `· 📍 ${partner.hubName}` : ""}
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>
                Cash in Hand:
              </span>
              <strong style={{ fontSize: "18px", color: currentCash > 0 ? "#BE4436" : "#2E7D5B" }}>
                ₹{currentCash.toLocaleString("en-IN")}
              </strong>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--dark)", marginBottom: "6px" }}>
            Settlement / Deposit Amount (₹):
          </label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                fontWeight: 700,
                color: "var(--muted)",
              }}
            >
              ₹
            </span>
            <input
              type="number"
              step="any"
              min="1"
              max={currentCash}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "10px 12px 10px 28px",
                fontSize: "15px",
                fontWeight: 800,
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--dark)",
                background: "#FFF",
                outline: "none",
              }}
            />
          </div>

          {/* Quick Amount Buttons */}
          <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
            <button
              type="button"
              onClick={() => setAmountStr(String(currentCash))}
              style={{
                padding: "4px 9px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                background: parsedAmount === currentCash ? "var(--primary)" : "#FFF",
                color: parsedAmount === currentCash ? "#FFF" : "var(--primary)",
                border: "1px solid var(--primary)",
                cursor: "pointer",
              }}
            >
              Clear Full (₹{currentCash.toLocaleString("en-IN")})
            </button>
            {currentCash > 100 && (
              <button
                type="button"
                onClick={() => setAmountStr(String(Math.round(currentCash / 2)))}
                style={{
                  padding: "4px 9px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 700,
                  background: "#FFF",
                  color: "var(--muted)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                Half (₹{Math.round(currentCash / 2).toLocaleString("en-IN")})
              </button>
            )}
          </div>
        </div>

        {/* Optional Notes Input */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--muted)", marginBottom: "6px" }}>
            Settlement Notes / Reference (Optional):
          </label>
          <input
            type="text"
            placeholder="e.g. Counter deposit collected by Admin"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "9px 12px",
              fontSize: "12px",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              background: "#FFF",
              outline: "none",
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "#FFF",
              color: "var(--muted)",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValidAmount || isSubmitting}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              border: 0,
              background: !isValidAmount ? "#E2E8F0" : "#2E7D5B",
              color: !isValidAmount ? "#94A3B8" : "#FFF",
              fontSize: "13px",
              fontWeight: 800,
              cursor: !isValidAmount || isSubmitting ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Settling Cash...
              </>
            ) : (
              <>
                <CheckCircle2 size={15} />
                Confirm Settlement (₹{parsedAmount.toLocaleString("en-IN")})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
