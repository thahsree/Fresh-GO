import { Button } from "@fresh-food/ui";
import { CheckCircle2, CircleDollarSign, PackageCheck, X } from "lucide-react";
import { DeliveryRequest } from "../models/delivery";

type DashboardViewProps = { isOnline: boolean; onAccept: () => void; onDecline: () => void; onOpenHistory: () => void; request: DeliveryRequest | null; todayEarnings: number };

export function DashboardView({ isOnline, onAccept, onDecline, onOpenHistory, request, todayEarnings }: DashboardViewProps) {
  return <>
    <div className="view-heading"><p className="eyebrow">Thursday, 17 September</p><h1>Ready for your next run?</h1><p>Stay online to receive nearby delivery requests.</p></div>
    <section className="metric-grid" aria-label="Today’s delivery summary">
      <div className="metric-card"><PackageCheck size={18} /><strong>14</strong><span>Deliveries today</span></div>
      <div className="metric-card"><CheckCircle2 size={18} /><strong>{request ? "1" : "0"}</strong><span>Requests nearby</span></div>
      <div className="metric-card highlight"><CircleDollarSign size={18} /><strong>Rs {todayEarnings.toLocaleString()}</strong><span>Earned today</span></div>
    </section>
    {request ? <section className="card request-card">
      <div className="card-heading"><div><span className="status-label">New request</span><h2>Order #{request.id}</h2></div><span className="eta-chip">{request.eta}</span></div>
      <div className="delivery-route"><div><i className="route-point pickup" /><span>Pickup</span><strong>{request.pickup}</strong><small>{request.pickupAddress}</small></div><div><i className="route-point drop" /><span>Drop-off</span><strong>{request.dropAddress}</strong><small>{request.distance} · {request.items} items</small></div></div>
      <div className="request-meta"><span>{request.payment}</span><strong>Earn Rs {request.earnings}</strong></div>
      {!isOnline && <p className="inline-notice">Go online to accept this request.</p>}
      <div className="split-actions">
        <Button
          variant="outline"
          label="Decline"
          icon={<X size={17} />}
          onPress={onDecline}
        />
        <Button
          variant="primary"
          label="Accept delivery"
          disabled={!isOnline}
          onPress={onAccept}
        />
      </div>
    </section> : <section className="empty-state"><span className="empty-icon"><PackageCheck size={24} /></span><h2>You’re all caught up</h2><p>New nearby requests will appear here while you are online.</p></section>}
    <button className="text-action" type="button" onClick={onOpenHistory}>View today’s completed deliveries</button>
  </>;
}
