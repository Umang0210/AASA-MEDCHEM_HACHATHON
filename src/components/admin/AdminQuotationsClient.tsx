"use client";

import { useState, useTransition } from "react";
import { approveQuotation, rejectQuotation } from "@/actions/order.actions";
import { formatINR, formatDate, QUOTATION_STATUS_COLORS, QUOTATION_STATUS_LABELS } from "@/lib/formatters";
import { UNIT_SHORT, fromBaseUnits, priceInUnit, type AnyUnit } from "@/lib/units";

// Types that come from the DB query
type QuotationItem = {
  id: string;
  orderedQuantity: string;
  orderedUnit: string;
  quantityBaseUnits: string;
  baseUnit: string;
  pricePerBaseUnit: string;
  lineTotal: string;
  product: {
    name: string;
    sku: string;
    displayUnit: string;
    category: { name: string } | null;
  };
};

type Quotation = {
  id: string;
  status: string;
  totalAmount: string;
  notes: string | null;
  createdAt: Date | null;
  seller: { name: string; email: string };
  items: QuotationItem[];
  order: { status: string } | null;
};

interface Props {
  quotations: Quotation[];
}

function QuotationDetail({
  q,
  onClose,
}: {
  q: Quotation;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleApprove() {
    startTransition(async () => {
      try {
        await approveQuotation(q.id);
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to approve");
      }
    });
  }

  async function handleReject() {
    if (!confirm("Reject this quotation?")) return;
    startTransition(async () => {
      try {
        await rejectQuotation(q.id);
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to reject");
      }
    });
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Quotation Detail</h2>
            <span className="font-mono text-xs text-muted">{q.id}</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Meta */}
        <div className="card" style={{ marginBottom: "var(--space-5)", background: "rgba(255,255,255,0.02)" }}>
          <div className="form-grid">
            <div>
              <div className="form-label">Seller</div>
              <div style={{ fontWeight: 600 }}>{q.seller.name}</div>
              <div className="text-muted text-xs">{q.seller.email}</div>
            </div>
            <div>
              <div className="form-label">Status</div>
              <span className={`badge ${QUOTATION_STATUS_COLORS[q.status]}`}>
                {QUOTATION_STATUS_LABELS[q.status]}
              </span>
              {q.order && (
                <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                  Order status: <strong>{q.order.status}</strong>
                </div>
              )}
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
          </div>
          {q.notes && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <div className="form-label">Notes</div>
              <div className="text-sm">{q.notes}</div>
            </div>
          )}
        </div>

        {/* Items */}
        <h3 className="section-title">Order Items</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
          {q.items.map((item) => {
            const orderedQty = parseFloat(item.orderedQuantity);
            const baseQty = parseFloat(item.quantityBaseUnits);
            const pricePerBase = parseFloat(item.pricePerBaseUnit);
            const displayUnit = item.product.displayUnit as AnyUnit;
            const pricePerDisplay = priceInUnit(pricePerBase, displayUnit);
            const displayQty = fromBaseUnits(baseQty, displayUnit);

            return (
              <div key={item.id} className="card" style={{ padding: "var(--space-4)", gap: "var(--space-3)", display: "flex", flexDirection: "column" }}>
                <div className="flex justify-between items-start">
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.product.name}</div>
                    <div className="text-xs font-mono text-muted">{item.product.sku}</div>
                    {item.product.category && (
                      <span className="badge badge-indigo" style={{ marginTop: 4 }}>
                        {item.product.category.name}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, color: "var(--text-accent)", fontSize: "1.1rem" }}>
                      {formatINR(parseFloat(item.lineTotal))}
                    </div>
                    <div className="text-xs text-muted">line total</div>
                  </div>
                </div>

                {/* Conversion detail — key transparency feature */}
                <div className="conversion-detail">
                  <div>📥 Ordered:   {orderedQty} {UNIT_SHORT[item.orderedUnit as AnyUnit]}</div>
                  <div>📦 In base:   {baseQty} {item.baseUnit}</div>
                  <div>💰 Rate:      {formatINR(pricePerBase, 6)} per {item.baseUnit}  =  {formatINR(pricePerDisplay, 2)} per {UNIT_SHORT[displayUnit]}</div>
                  <div>🧮 Calc:      {baseQty} {item.baseUnit} × {formatINR(pricePerBase, 6)}/{item.baseUnit} = {formatINR(parseFloat(item.lineTotal))}</div>
                  <div>✅ Displayed: {parseFloat(displayQty.toFixed(4))} {UNIT_SHORT[displayUnit]} @ {formatINR(pricePerDisplay)}/{UNIT_SHORT[displayUnit]}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="price-preview" style={{ marginBottom: "var(--space-5)" }}>
          <span style={{ fontWeight: 600 }}>Total Order Value</span>
          <span className="price-preview-amount">{formatINR(parseFloat(q.totalAmount))}</span>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: "var(--space-4)" }}>⚠️ {error}</div>}

        {/* Actions */}
        {q.status === "submitted" && (
          <div className="flex gap-3 justify-end">
            <button
              id={`reject-${q.id}`}
              onClick={handleReject}
              className="btn btn-danger"
              disabled={isPending}
            >
              Reject
            </button>
            <button
              id={`approve-${q.id}`}
              onClick={handleApprove}
              className="btn btn-success"
              disabled={isPending}
            >
              {isPending ? "Processing…" : "✓ Approve & Create Order"}
            </button>
          </div>
        )}
        {q.status !== "submitted" && (
          <div className="flex justify-end">
            <button onClick={onClose} className="btn btn-secondary">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminQuotationsClient({ quotations }: Props) {
  const [selected, setSelected] = useState<Quotation | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered =
    statusFilter === "all"
      ? quotations
      : quotations.filter((q) => q.status === statusFilter);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Quotations</h1>
          <p className="page-subtitle">{quotations.length} total quotations</p>
        </div>
      </div>

      {/* Filter */}
      <div className="search-bar">
        {["all", "submitted", "approved", "rejected", "fulfilled"].map((s) => (
          <button
            key={s}
            id={`filter-${s}`}
            onClick={() => setStatusFilter(s)}
            className={`btn ${statusFilter === s ? "btn-primary" : "btn-secondary"} btn-sm`}
          >
            {s === "all" ? "All" : QUOTATION_STATUS_LABELS[s]}
            {s !== "all" && (
              <span style={{ marginLeft: 4, opacity: 0.7 }}>
                ({quotations.filter((q) => q.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No quotations</div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Seller</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <tr key={q.id}>
                  <td className="mono">{q.id.slice(0, 8)}…</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{q.seller.name}</div>
                    <div className="text-xs text-muted">{q.seller.email}</div>
                  </td>
                  <td>{q.items.length} item{q.items.length !== 1 ? "s" : ""}</td>
                  <td style={{ fontWeight: 700 }}>
                    {formatINR(parseFloat(q.totalAmount))}
                  </td>
                  <td>
                    <span className={`badge ${QUOTATION_STATUS_COLORS[q.status]}`}>
                      {QUOTATION_STATUS_LABELS[q.status]}
                    </span>
                  </td>
                  <td className="muted text-sm">
                    {q.createdAt ? new Date(q.createdAt).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td>
                    <button
                      id={`view-quotation-${q.id.slice(0,8)}`}
                      onClick={() => setSelected(q)}
                      className="btn btn-secondary btn-sm"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <QuotationDetail
          q={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
