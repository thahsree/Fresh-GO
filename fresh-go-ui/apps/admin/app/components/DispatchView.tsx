"use client";

type DispatchViewProps = { assigned: string[]; onAssign: (id: string) => void };

export function DispatchView({ assigned, onAssign }: DispatchViewProps) {
  return (
    <div className="grid">
      <section className="panel">
        <h2>Live dispatch map</h2>
        <div className="map-placeholder">Kozhikode delivery zones</div>
      </section>
      <section className="panel">
        <h2>Unassigned orders</h2>
        {["FF10282", "FF10286"].map((id) => (
          <div className="row" key={id}>
            <span>#{id} · Zone 2</span>
            <button
              className="assign"
              disabled={assigned.includes(id)}
              onClick={() => onAssign(id)}
            >
              {assigned.includes(id) ? "Assigned" : "Assign"}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
