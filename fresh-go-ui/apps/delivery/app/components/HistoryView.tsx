import { CheckCircle2, CircleX, Clock, MapPin } from "lucide-react";
import { useState } from "react";
import { DeliveryHistoryItem, HistoryStatus } from "../models/delivery";

type HistoryViewProps = { history: DeliveryHistoryItem[] };
type HistoryFilter = "All" | HistoryStatus;

export function HistoryView({ history }: HistoryViewProps) {
  const [filter, setFilter] = useState<HistoryFilter>("All");
  const visibleHistory =
    filter === "All"
      ? history
      : history.filter((delivery) => delivery.status === filter);

  return (
    <>
      <div className="view-heading">
        <p className="eyebrow">Recent Activity</p>
        <h1>Delivery History</h1>
        <p>Review completed runs, mileage distance, and credited earnings.</p>
      </div>

      <div className="filter-pills" aria-label="Filter delivery history">
        {(["All", "Delivered", "Cancelled"] as const).map((option) => (
          <button
            key={option}
            className={filter === option ? "active" : ""}
            type="button"
            onClick={() => setFilter(option)}
          >
            {option}
          </button>
        ))}
      </div>

      {visibleHistory.length === 0 ? (
        <section className="empty-state">
          <span className="empty-icon" style={{ background: "#e4ece9", color: "#1f4d46" }}>
            <Clock size={24} />
          </span>
          <h2>No Completed Runs Yet</h2>
          <p>Deliveries you complete from your assigned hub will appear here with instant earnings reconciliation.</p>
        </section>
      ) : (
        <section className="history-list">
          {visibleHistory.map((delivery) => (
            <article className="history-item" key={delivery.id}>
              <span
                className={`history-icon ${
                  delivery.status === "Delivered" ? "delivered" : "cancelled"
                }`}
              >
                {delivery.status === "Delivered" ? (
                  <CheckCircle2 size={19} />
                ) : (
                  <CircleX size={19} />
                )}
              </span>
              <div className="history-main">
                <div>
                  <strong>#{delivery.id}</strong>
                  <span>{delivery.customer}</span>
                </div>
                <small>
                  <MapPin size={12} /> {delivery.area} · {delivery.distance}
                </small>
                <small>{delivery.completedAt}</small>
              </div>
              <div className="history-earning">
                <strong>{delivery.earnings ? `₹${delivery.earnings}` : "—"}</strong>
                <span
                  className={
                    delivery.status === "Delivered" ? "delivered" : "cancelled"
                  }
                >
                  {delivery.status}
                </span>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
