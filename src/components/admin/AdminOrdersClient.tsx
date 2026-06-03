"use client";

import { useState, useTransition } from "react";
import { updateOrderStatus } from "@/actions/order.actions";
import { formatINR, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/formatters";
import { UNIT_SHORT, type AnyUnit } from "@/lib/units";

type OrderItem = {
  id: string;
  orderedQuantity: string;
  orderedUnit: string;
  quantityBaseUnits: string;
  baseUnit: string;
  pricePerBaseUnit: string;
  lineTotal: string;
  product: { name: string; sku: string; category: { name: string } | null };
};

type Order = {
  id: string;
  status: string;
  totalAmount: string;
  notes: string | null;
  createdAt: Date | null;
  quotation: {
    id: string;
    seller: { name: string; email: string };
    items: OrderItem[];
  };
  approvedByUser: { name: string } | null;
};

interface Props { orders: Order[] }

const STATUS_SEQUENCE = ["processing", "shipped", "delivered"];

export default function AdminOrdersClient({ orders }: Props) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered =
    statusFilter === "all"
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  async function advance(orderId: string, currentStatus: string) {
    const idx = STATUS_SEQUENCE.indexOf(currentStatus);
    if (idx === -1 || idx >= STATUS_SEQUENCE.length - 1) return;
    const next = STATUS_SEQUENCE[idx + 1];
    startTransition(() => updateOrderStatus(orderId, next));
  }

  async function cancel(orderId: string) {
    if (!confirm("Cancel this order?")) return;
    startTransition(() => updateOrderStatus(orderId, "cancelled"));
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">{orders.length} total orders</p>
        </div>
      </div>

      <div className="search-bar">
        {["all", "processing", "shipped", "delivered", "cancelled"].map((s) => (
          <button
            key={s}
            id={`order-filter-${s}`}
            onClick={() => setStatusFilter(s)}
            className={`btn ${statusFilter === s ? "btn-primary" : "btn-secondary"} btn-sm`}
          >
            {s === "all" ? "All" : ORDER_STATUS_LABELS[s]}
            {s !== "all" && (
              <span style={{ marginLeft: 4, opacity: 0.7 }}>
                ({orders.filter((o) => o.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🚚</div>
          <div className="empty-state-title">No orders yet</div>
          <p className="empty-state-description">
            Orders are created when you approve a quotation.
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Seller</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.id.slice(0, 8)}…</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{o.quotation.seller.name}</div>
                    <div className="text-xs text-muted">{o.quotation.seller.email}</div>
                  </td>
                  <td>
                    {o.quotation.items.map((item) => (
                      <div key={item.id} className="text-sm">
                        {item.product.name} —{" "}
                        <span className="font-mono text-xs">
                          {item.orderedQuantity}{" "}
                          {UNIT_SHORT[item.orderedUnit as AnyUnit]}
                        </span>
                      </div>
                    ))}
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {formatINR(parseFloat(o.totalAmount))}
                  </td>
                  <td>
                    <span className={`badge ${ORDER_STATUS_COLORS[o.status]}`}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td className="muted text-sm">
                    {o.createdAt
                      ? new Date(o.createdAt).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {STATUS_SEQUENCE.indexOf(o.status) >= 0 &&
                        STATUS_SEQUENCE.indexOf(o.status) < STATUS_SEQUENCE.length - 1 && (
                          <button
                            id={`advance-order-${o.id.slice(0,8)}`}
                            onClick={() => advance(o.id, o.status)}
                            className="btn btn-success btn-sm"
                            disabled={isPending}
                          >
                            → {ORDER_STATUS_LABELS[STATUS_SEQUENCE[STATUS_SEQUENCE.indexOf(o.status) + 1]]}
                          </button>
                        )}
                      {o.status !== "delivered" && o.status !== "cancelled" && (
                        <button
                          id={`cancel-order-${o.id.slice(0,8)}`}
                          onClick={() => cancel(o.id)}
                          className="btn btn-danger btn-sm"
                          disabled={isPending}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
