"use client";

import { QueueOrder, ActivePartner } from "../lib/api";
import { Product } from "../models/product";

type DashboardViewProps = {
  orders?: QueueOrder[];
  products?: Product[];
  partners?: ActivePartner[];
};

export function DashboardView({
  orders = [],
  products = [],
  partners = [],
}: DashboardViewProps) {
  const preparingCount = orders.filter(
    (o) => o.status === "CUTTING_PREPARING" || o.status === "CONFIRMED"
  ).length;

  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock < 5);
  const outOfStockProducts = products.filter((p) => p.stock === 0);

  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const formattedRevenue =
    totalRevenue > 0
      ? `Rs ${totalRevenue.toLocaleString()}`
      : "Rs 0";

  const totalOrdersCount = orders.length;

  return (
    <>
      <section className="kpis">
        <div className="kpi featured">
          <strong>{formattedRevenue}</strong>
          <span>Live revenue · Kozhikode Hub</span>
        </div>
        <div className="kpi">
          <strong>{totalOrdersCount}</strong>
          <span>Orders in queue</span>
        </div>
        <div className="kpi">
          <strong>{preparingCount}</strong>
          <span>Preparing in cutting hub</span>
        </div>
        <div className="kpi">
          <strong>{lowStockProducts.length + outOfStockProducts.length}</strong>
          <span>Low stock catalogue items</span>
        </div>
      </section>

      <div className="grid">
        <section className="panel">
          <h2>Order & revenue trajectory</h2>
          <div className="bar-chart">
            {[52, 64, 48, 80, 92, 70, 85].map((height, index) => (
              <div className="bar" style={{ height: `${height}%` }} key={index}>
                <small>
                  {["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"][index]}
                </small>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Operational alerts</h2>
          <div className="attention">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.slice(0, 2).map((p) => (
                <div key={p.id}>
                  <span>{p.name} low stock</span>
                  <b className="badge warning">
                    {p.stock} {p.unit} left
                  </b>
                </div>
              ))
            ) : (
              <div>
                <span>Catalogue stock levels</span>
                <b className="badge success">All Healthy</b>
              </div>
            )}

            <div>
              <span>Active delivery partners</span>
              <b className={partners.length > 0 ? "badge success" : "badge"}>
                {partners.length} online
              </b>
            </div>

            <div>
              <span>Freshness audit</span>
              <b className="badge success">100% Passed</b>
            </div>

            <div>
              <span>Average dispatch time</span>
              <b className="badge success">18 mins</b>
            </div>
          </div>
        </section>
      </div>

      <div className="grid">
        <section className="panel">
          <h2>Category breakdown</h2>
          <div className="row">
            <span>🐟 Fresh Fish & Seafood</span>
            <strong>
              {products.filter((p) => p.category.toLowerCase().includes("fish")).length} varieties
            </strong>
          </div>
          <div className="row">
            <span>🥩 Fresh Halal Meat & Poultry</span>
            <strong>
              {products.filter((p) => p.category.toLowerCase().includes("meat")).length} varieties
            </strong>
          </div>
          <div className="row">
            <span>🥬 Farm Vegetables</span>
            <strong>
              {products.filter((p) => p.category.toLowerCase().includes("veg")).length} varieties
            </strong>
          </div>
        </section>

        <section className="panel">
          <h2>Live catalogue sample</h2>
          {products.slice(0, 4).map((p) => (
            <div className="row" key={p.id}>
              <span>{p.name}</span>
              <strong>
                Rs {p.price} / {p.unit}
              </strong>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
