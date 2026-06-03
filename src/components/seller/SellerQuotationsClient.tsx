"use client";

import { useState } from "react";
import { formatINR, formatDate, QUOTATION_STATUS_COLORS, QUOTATION_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/formatters";
import { UNIT_SHORT, type AnyUnit } from "@/lib/units";
import Link from "next/link";

type QuotationItem = {
  id: string;
  orderedQuantity: string;
  orderedUnit: string;
  quantityBaseUnits: string;
  baseUnit: string;
  pricePerBaseUnit: string;
  lineTotal: string;
  product: { name: string; sku: string; category: { name: string } | null };
};

type Quotation = {
  id: string;
  status: string;
  totalAmount: string;
  notes: string | null;
  createdAt: Date | null;
  items: QuotationItem[];
  order: { status: string } | null;
};

interface Props { quotations: Quotation[] }

function QuotationDetailModal({ q, onClose }: { q: Quotation; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Quotation Details</h2>
            <span className="font-mono text-xs text-muted">{q.id}</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-grid" style={{ marginBottom: "var(--space-5)" }}>
          <div>
            <div className="form-label">Status</div>
            <span className={`badge ${QUOTATION_STATUS_COLORS[q.status]}`}>
              {QUOTATION_STATUS_LABELS[q.status]}
            </span>
          </div>
          <div>
            <div className="form-label">Submitted</div>
            <div>{formatDate(q.createdAt)}</div>
          </div>
          <div>
            <div className="form-label">Total Amount</div>
            <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--text-accent)" }}>
              {formatINR(parseFloat(q.totalAmount))}
            </div>
          </div>
          {q.order && (
            <div>
              <div className="form-label">Order Status</div>
              <span className={`badge ${ORDER_STATUS_COLORS[q.order.status]}`}>
                {ORDER_STATUS_LABELS[q.order.status]}
              </span>
            </div>
          )}
        </div>

        {q.notes && (
          <div className="card" style={{ marginBottom: "var(--space-5)", background: "rgba(255,255,255,0.02)" }}>
            <div className="form-label">Notes</div>
            <div className="text-sm">{q.notes}</div>
          </div>
        )}

        <h3 className="section-title">Items Ordered</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {q.items.map((item) => (
            <div key={item.id} className="card" style={{ padding: "var(--space-4)" }}>
              <div className="flex justify-between items-start" style={{ marginBottom: "var(--space-3)" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{item.product.name}</div>
                  <div className="text-xs font-mono text-muted">{item.product.sku}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: "var(--text-accent)" }}>
                    {formatINR(parseFloat(item.lineTotal))}
                  </div>
                  <div className="text-xs text-muted">line total</div>
                </div>
              </div>
              <div className="conversion-detail">
                <div>📥 You ordered:  {item.orderedQuantity} {UNIT_SHORT[item.orderedUnit as AnyUnit]}</div>
                <div>📦 Stored as:    {item.quantityBaseUnits} {item.baseUnit}</div>
                <div>💰 Rate:         {formatINR(parseFloat(item.pricePerBaseUnit), 6)} / {item.baseUnit}</div>
                <div>🧮 Total:        {item.quantityBaseUnits} {item.baseUnit} × {formatINR(parseFloat(item.pricePerBaseUnit), 6)} = {formatINR(parseFloat(item.lineTotal))}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="price-preview" style={{ marginTop: "var(--space-5)" }}>
          <span style={{ fontWeight: 600 }}>Total</span>
          <span className="price-preview-amount">{formatINR(parseFloat(q.totalAmount))}</span>
        </div>

        <div className="flex justify-end" style={{ marginTop: "var(--space-5)" }}>
          <button onClick={onClose} className="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}

export default function SellerQuotationsClient({ quotations }: Props) {
  const [selected, setSelected] = useState<Quotation | null>(null);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">My Quotations</h1>
          <p className="page-subtitle">{quotations.length} quotation{quotations.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/seller/cart" className="btn btn-primary">
          🛍️ Go to Cart
        </Link>
      </div>

      {quotations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No quotations yet</div>
          <p className="empty-state-description">
            Browse products and add items to your cart to place your first quotation.
          </p>
          <Link
            href="/seller/products"
            className="btn btn-primary"
            style={{ marginTop: "var(--space-4)" }}
          >
            Browse Products →
          </Link>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Order Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id}>
                  <td className="mono">{q.id.slice(0, 8)}…</td>
                  <td>
                    {q.items.slice(0, 2).map((item) => (
                      <div key={item.id} className="text-sm">
                        {item.product.name}{" "}
                        <span className="font-mono text-xs text-muted">
                          ({item.orderedQuantity} {UNIT_SHORT[item.orderedUnit as AnyUnit]})
                        </span>
                      </div>
                    ))}
                    {q.items.length > 2 && (
                      <div className="text-xs text-muted">+{q.items.length - 2} more</div>
                    )}
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {formatINR(parseFloat(q.totalAmount))}
                  </td>
                  <td>
                    <span className={`badge ${QUOTATION_STATUS_COLORS[q.status]}`}>
                      {QUOTATION_STATUS_LABELS[q.status]}
                    </span>
                  </td>
                  <td>
                    {q.order ? (
                      <span className={`badge ${ORDER_STATUS_COLORS[q.order.status]}`}>
                        {ORDER_STATUS_LABELS[q.order.status]}
                      </span>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="muted text-sm">
                    {q.createdAt ? new Date(q.createdAt).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td>
                    <button
                      id={`view-my-quotation-${q.id.slice(0,8)}`}
                      onClick={() => setSelected(q)}
                      className="btn btn-secondary btn-sm"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <QuotationDetailModal q={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
