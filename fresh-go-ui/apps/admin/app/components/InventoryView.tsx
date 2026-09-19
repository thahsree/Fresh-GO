import { getStockState, Product } from "../models/product";

type InventoryViewProps = { products: Product[] };

export function InventoryView({ products }: InventoryViewProps) {
  return (
    <section className="panel">
      <h2>Freshness and stock</h2>
      <div className="inventory">
        {products.map((product) => {
          const state = getStockState(product.stock);
          const percent = Math.min(product.stock * 4, 100);
          return (
            <div className="row" key={product.id}>
              <strong>{product.name}</strong>
              <span className="muted">
                {product.stock} {product.unit}
              </span>
              <div className={`progress ${state !== "Healthy" ? "low" : ""}`}>
                <i style={{ width: `${percent}%` }} />
              </div>
              <span
                className={`badge ${state === "Healthy" ? "success" : state === "Low stock" ? "warning" : "error"}`}
              >
                {state}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
