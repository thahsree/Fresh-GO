import { ArrowUpRight, CalendarDays, CircleDollarSign, Landmark } from "lucide-react";
import { weeklyEarnings } from "../models/delivery";

type EarningsViewProps = { onOpenHistory: () => void; todayEarnings: number; weeklyTotal: number };

export function EarningsView({ onOpenHistory, todayEarnings, weeklyTotal }: EarningsViewProps) {
  const maxEarning = Math.max(...weeklyEarnings.map(({ amount }) => amount));
  return <>
    <div className="view-heading"><p className="eyebrow">This week</p><h1>Your earnings</h1><p>A clear view of every delivery and incentive.</p></div>
    <section className="earnings-hero"><div><span>Weekly total</span><strong>Rs {weeklyTotal.toLocaleString()}</strong><small><ArrowUpRight size={14} /> 8.2% from last week</small></div><CircleDollarSign size={34} /></section>
    <section className="card chart-card"><div className="card-heading"><div><span className="status-label">Daily earnings</span><h2>Weekly activity</h2></div><span className="chart-total">Rs {todayEarnings.toLocaleString()} today</span></div><div className="earnings-chart" aria-label="Weekly earnings chart">{weeklyEarnings.map(({ day, amount }) => <div key={day}><i style={{ height: `${Math.max(22, (amount / maxEarning) * 100)}%` }} /><span>{day}</span></div>)}</div></section>
    <section className="card payout-card"><div className="payout-icon"><Landmark size={20} /></div><div><span className="status-label">Next payout</span><h2>Sunday, 9:00 AM</h2><p>Bank account ending in 4421</p></div><CalendarDays size={19} /></section>
    <section className="card earnings-breakdown"><div className="row"><span>Delivery earnings</span><strong>Rs {Math.max(0, todayEarnings - 60).toLocaleString()}</strong></div><div className="row"><span>Peak-hour incentive</span><strong>Rs 60</strong></div><div className="row total"><span>Today’s total</span><strong>Rs {todayEarnings.toLocaleString()}</strong></div></section>
    <button className="text-action" type="button" onClick={onOpenHistory}>See delivery history</button>
  </>;
}
