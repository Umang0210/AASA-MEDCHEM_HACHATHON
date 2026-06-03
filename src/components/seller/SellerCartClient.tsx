"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitQuotation } from "@/actions/quotation.actions";
import {
  UNITS_BY_DIMENSION,
  UNIT_SHORT,
  UNIT_LABELS,
  priceInUnit,
  calculateLineTotal,
  toBaseUnits,
  type AnyUnit,
  type Dimension,
} from "@/lib/units";
import { formatINR } from "@/lib/formatters";
import type { Product, Category } from "@/db/schema";
import Link from "next/link";

type ProductWithCat = Product & { category: Category | null };

interface CartEntry {
  productId: string;
  qty: number;
  unit: AnyUnit;
}

interface Props {
  products: ProductWithCat[];
}

export default function SellerCartClient({ products }: Props) {
  const router = useRouter();
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Load cart from localStorage
  useEffect(() => {
    function loadCart() {
      try {
        const raw = localStorage.getItem("inventory_cart") || "[]";
        setCart(JSON.parse(raw));
      } catch {
        setCart([]);
      }
    }
    loadCart();
    window.addEventListener("storage", loadCart);
    return () => window.removeEventListener("storage", loadCart);
  }, []);

  function saveCart(updated: CartEntry[]) {
    setCart(updated);
    localStorage.setItem("inventory_cart", JSON.stringify(updated));
  }

  function updateQty(idx: number, qty: number) {
    const updated = [...cart];
    updated[idx] = { ...updated[idx], qty };
    saveCart(updated);
  }

  function updateUnit(idx: number, unit: AnyUnit) {
    const updated = [...cart];
    updated[idx] = { ...updated[idx], unit };
    saveCart(updated);
  }

  function removeItem(idx: number) {
    const updated = cart.filter((_, i) => i !== idx);
    saveCart(updated);
  }

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  // Compute totals with proper types
  interface LineItem {
    entry: CartEntry;
    product: ProductWithCat;
    lineTotal: number;
    pricePerUnit: number;
  }

  const lineItems: LineItem[] = cart
    .map((entry) => {
      const product = productMap[entry.productId];
      if (!product) return null;
      const pricePerBase = parseFloat(product.pricePerBaseUnit);
      const lineTotal =
        entry.qty > 0
          ? calculateLineTotal(entry.qty, entry.unit, pricePerBase)
          : 0;
      const pricePerUnit = priceInUnit(pricePerBase, entry.unit);
      return { entry, product, lineTotal, pricePerUnit };
    })
    .filter((x): x is LineItem => x !== null);

  const grandTotal = lineItems.reduce((s, li) => s + li.lineTotal, 0);

  async function handleSubmit() {
    setError("");
    if (cart.length === 0) { setError("Cart is empty."); return; }
    const invalid = cart.some(e => e.qty <= 0);
    if (invalid) { setError("All quantities must be greater than 0."); return; }

    startTransition(async () => {
      try {
        const quotationId = await submitQuotation(
          cart.map((e) => ({
            productId: e.productId,
            orderedQuantity: e.qty,
            orderedUnit: e.unit,
          })),
          notes
        );
        localStorage.removeItem("inventory_cart");
        setCart([]);
        setSubmitted(true);
        setTimeout(() => router.push("/seller/quotations"), 1500);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to submit quotation");
      }
    });
  }

  if (submitted) {
    return (
      <div className="page-content">
        <div className="empty-state" style={{ marginTop: "var(--space-16)" }}>
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-title">Quotation Submitted!</div>
          <p className="empty-state-description">
            Your quotation has been sent for admin approval. Redirecting…
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">My Cart</h1>
          <p className="page-subtitle">
            Review and submit your quotation request
          </p>
        </div>
        <Link href="/seller/products" className="btn btn-secondary">
          ← Continue Shopping
        </Link>
      </div>

      {cart.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🛍️</div>
          <div className="empty-state-title">Your cart is empty</div>
          <p className="empty-state-description">
            Browse products and add items to your cart to place a quotation.
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "var(--space-6)", alignItems: "start" }}>
          {/* Cart Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {lineItems.map((li, idx) => {
              const { entry, product } = li;
              const availableUnits = UNITS_BY_DIMENSION[product.dimension as Dimension] || [];
              const pricePerBase = parseFloat(product.pricePerBaseUnit);
              const pricePerSelectedUnit = priceInUnit(pricePerBase, entry.unit);
              const lineTotal = li.lineTotal;

              return (
                <div key={`${entry.productId}-${entry.unit}-${idx}`} className="card">
                  <div className="flex justify-between items-start" style={{ marginBottom: "var(--space-4)" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1rem" }}>{product.name}</div>
                      <div className="text-xs font-mono text-muted">{product.sku}</div>
                      {product.category && (
                        <span className="badge badge-indigo" style={{ marginTop: 4 }}>
                          {product.category.name}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      className="btn btn-danger btn-sm btn-icon"
                      id={`remove-item-${idx}`}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="form-grid" style={{ gap: "var(--space-3)" }}>
                    {/* Unit selector */}
                    <div className="form-group">
                      <label className="form-label">Unit</label>
                      <select
                        id={`unit-select-${idx}`}
                        className="form-select"
                        value={entry.unit}
                        onChange={(e) => updateUnit(idx, e.target.value as AnyUnit)}
                      >
                        {availableUnits.map((u) => (
                          <option key={u} value={u}>
                            {UNIT_LABELS[u]}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity input */}
                    <div className="form-group">
                      <label className="form-label">Quantity ({UNIT_SHORT[entry.unit]})</label>
                      <input
                        id={`qty-${idx}`}
                        type="number"
                        step="0.001"
                        min="0.001"
                        className="form-input"
                        value={entry.qty}
                        onChange={(e) => updateQty(idx, parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Price breakdown */}
                  <div
                    style={{
                      marginTop: "var(--space-3)",
                      padding: "var(--space-3) var(--space-4)",
                      background: "rgba(99,102,241,0.05)",
                      border: "1px solid rgba(99,102,241,0.12)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.8rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>
                      {entry.qty} {UNIT_SHORT[entry.unit]} ×{" "}
                      {formatINR(pricePerSelectedUnit)}/{UNIT_SHORT[entry.unit]}
                    </span>
                    <strong style={{ color: "var(--text-accent)", fontSize: "1rem" }}>
                      {formatINR(lineTotal)}
                    </strong>
                  </div>

                  {/* Internal conversion audit — uses units lib */}
                  <div className="conversion-detail" style={{ marginTop: "var(--space-3)" }}>
                    🧮 {entry.qty} {UNIT_SHORT[entry.unit]} = {toBaseUnits(entry.qty, entry.unit).toFixed(4)} {product.baseUnit} × {formatINR(pricePerBase, 6)}/{product.baseUnit} = {formatINR(lineTotal)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="card" style={{ position: "sticky", top: 80 }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "var(--space-5)" }}>
              Order Summary
            </h2>

            {lineItems.map((li, idx) => {
              const { entry, product, lineTotal } = li;
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.8rem",
                    marginBottom: "var(--space-2)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <span className="truncate" style={{ maxWidth: 160 }}>
                    {product.name}
                    <span style={{ opacity: 0.6 }}>
                      {" "}({entry.qty} {UNIT_SHORT[entry.unit]})
                    </span>
                  </span>
                  <span style={{ fontWeight: 600 }}>{formatINR(lineTotal)}</span>
                </div>
              );
            })}

            <div className="divider" />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 800,
                fontSize: "1.1rem",
                marginBottom: "var(--space-5)",
              }}
            >
              <span>Total</span>
              <span style={{ color: "var(--text-accent)" }}>
                {formatINR(grandTotal)}
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
              <label className="form-label">Notes (optional)</label>
              <textarea
                id="quotation-notes"
                className="form-textarea"
                placeholder="Any special instructions…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ minHeight: 70 }}
              />
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: "var(--space-4)" }}>
                ⚠️ {error}
              </div>
            )}

            <button
              id="submit-quotation-btn"
              onClick={handleSubmit}
              className="btn btn-primary btn-lg"
              style={{ width: "100%" }}
              disabled={isPending || cart.length === 0}
            >
              {isPending ? "Submitting…" : "Submit Quotation →"}
            </button>

            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", marginTop: "var(--space-3)" }}>
              Your quotation will be reviewed by the admin before becoming an order.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
