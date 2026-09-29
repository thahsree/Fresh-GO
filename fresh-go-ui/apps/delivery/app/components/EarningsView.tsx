import React from "react";
import { ArrowUpRight, CircleDollarSign, Landmark } from "lucide-react";

type EarningsViewProps = {
  onOpenHistory: () => void;
  todayEarnings: number;
};

export function EarningsView({ onOpenHistory, todayEarnings }: EarningsViewProps) {
  // Base pay ₹45 + approx ₹12/km
  const estimatedTrips = todayEarnings > 0 ? Math.max(1, Math.round(todayEarnings / 75)) : 0;

  return (
    <>
      <div className="view-heading">
        <p className="eyebrow">Real-Time Earnings</p>
        <h1>Your Earnings</h1>
        <p>Live payout summary calculated per completed run.</p>
      </div>

      <section className="earnings-hero">
        <div>
          <span>Today's Total Credited</span>
          <strong>₹{todayEarnings.toLocaleString()}</strong>
          <small>
            <ArrowUpRight size={14} /> ₹45 base + ₹12/km distance pay
          </small>
        </div>
        <CircleDollarSign size={34} />
      </section>

      <section className="card payout-card">
        <div className="payout-icon">
          <Landmark size={20} />
        </div>
        <div>
          <span className="status-label">Direct Bank Deposit</span>
          <h2>Weekly Tuesday Payout</h2>
          <p>Credited automatically to your linked partner bank account</p>
        </div>
      </section>

      <section className="card earnings-breakdown">
        <div className="row">
          <span>Completed Deliveries Today</span>
          <strong>{estimatedTrips} runs</strong>
        </div>
        <div className="row">
          <span>Base Drop Fee Rate</span>
          <strong>₹45 / delivery</strong>
        </div>
        <div className="row">
          <span>Distance Mileage Rate</span>
          <strong>₹12 / km</strong>
        </div>
        <div className="row total">
          <span>Today’s Earnings</span>
          <strong>₹{todayEarnings.toLocaleString()}</strong>
        </div>
      </section>

      <button className="text-action" type="button" onClick={onOpenHistory}>
        See completed delivery history
      </button>
    </>
  );
}
