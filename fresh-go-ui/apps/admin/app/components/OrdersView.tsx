"use client";

import { orders } from "@fresh-food/design-tokens";
import { Button, OrderStatusBadge } from "@fresh-food/ui";

type OrdersViewProps = {
  assigned: string[];
  onAssign: (id: string) => void;
};

export function OrdersView({ assigned, onAssign }: OrdersViewProps) {
  return (
    <section className="panel">
      <div className="toolbar">
        <div>
          <h2>Order queue</h2>
          <span className="muted">312 orders today · COD only</span>
        </div>
        <input className="search" placeholder="Search order or customer" />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Zone</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const isAssigned = assigned.includes(order.id);
              return (
                <tr key={order.id}>
                  <td>
                    <strong>#{order.id}</strong>
                  </td>
                  <td>{order.customer}</td>
                  <td>{order.items}</td>
                  <td>Rs {order.amount.toLocaleString()}</td>
                  <td>
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td>{order.zone}</td>
                  <td>
                    <Button
                      size="sm"
                      variant={isAssigned ? "ghost" : "primary"}
                      disabled={isAssigned}
                      label={isAssigned ? "Assigned" : "Assign"}
                      onPress={() => onAssign(order.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
