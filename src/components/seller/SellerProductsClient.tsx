"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UNITS_BY_DIMENSION,
  UNIT_SHORT,
  UNIT_LABELS,
  priceInUnit,
  fromBaseUnits,
  calculateLineTotal,
  type AnyUnit,
  type Dimension,
} from "@/lib/units";
import { formatINR } from "@/lib/formatters";
import type { Product, Category } from "@/db/schema";

type ProductWithCategory = Product & { category: Category | null };

interface Props {
  products: ProductWithCategory[];
  categories: Category[];
}

const DIMENSION_ICONS: Record<string, string> = {
  weight: "⚖️",
  volume: "🧴",
  count: "📦",
};

const DIMENSION_COLORS: Record<string, string> = {
  weight: "#f59e0b",
  volume: "#3b82f6",
  count: "#8b5cf6",
};

function AddToCartModal({
  product,
  onAdd,
  onClose,
}: {
  product: ProductWithCategory;
  onAdd: (productId: string, qty: number, unit: AnyUnit) => void;
  onClose: () => void;
}) {
  const availableUnits = UNITS_BY_DIMENSION[product.dimension as Dimension] || [];
  const [selectedUnit, setSelectedUnit] = useState<AnyUnit>(
    product.displayUnit as AnyUnit
  );
  const [qty, setQty] = useState("");

  const pricePerBase = parseFloat(product.pricePerBaseUnit);
  const qtyNum = parseFloat(qty) || 0;
  const lineTotal = qtyNum > 0 ? calculateLineTotal(qtyNum, selectedUnit, pricePerBase) : 0;
  const pricePerSelectedUnit = priceInUnit(pricePerBase, selectedUnit);

  const stockInSelectedUnit = fromBaseUnits(
    parseFloat(product.stockQuantity),
    selectedUnit
  );

  function handleAdd() {
    if (qtyNum <= 0) return;
    onAdd(product.id, qtyNum, selectedUnit);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Add to Cart</h2>
          <button className="modal-close" onClick={onClose} id="add-to-cart-close">✕</button>
        </div>

        {/* Product info */}
        <div className="card" style={{ marginBottom: "var(--space-5)", background: "rgba(255,255,255,0.02)" }}>
          <div className="product-name" style={{ fontSize: "1rem", marginBottom: "var(--space-2)" }}>
            {product.name}
          </div>
          <div className="flex gap-2 items-center" style={{ marginBottom: "var(--space-1)" }}>
            <span className="badge badge-gray">{product.category?.name ?? "Uncategorised"}</span>
            <span className="badge badge-indigo">
              {DIMENSION_ICONS[product.dimension]} {product.dimension}
            </span>
          </div>
          <div className="product-sku">{product.sku}</div>
        </div>

        {/* Unit selector */}
        <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
          <label className="form-label">Select Unit</label>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {availableUnits.map((u) => (
              <button
                key={u}
                id={`unit-btn-${u}`}
                onClick={() => setSelectedUnit(u)}
                className={`btn ${selectedUnit === u ? "btn-primary" : "btn-secondary"} btn-sm`}
              >
                {UNIT_SHORT[u]}
                <span style={{ opacity: 0.7, fontSize: "0.65rem", marginLeft: 3 }}>
                  ({UNIT_LABELS[u].split(" ")[0]})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Price display */}
        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
            background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(99,102,241,0.15)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--space-4)",
            fontSize: "0.875rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-muted)" }}>
              Rate per {UNIT_SHORT[selectedUnit]}:
            </span>
            <strong style={{ color: "var(--text-accent)" }}>
              {formatINR(pricePerSelectedUnit)} / {UNIT_SHORT[selectedUnit]}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--space-1)" }}>
            <span style={{ color: "var(--text-muted)" }}>Available stock:</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
              {parseFloat(stockInSelectedUnit.toFixed(4))} {UNIT_SHORT[selectedUnit]}
            </span>
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "var(--space-1)", fontFamily: "var(--font-mono)" }}>
            Internal: {formatINR(pricePerBase, 6)} / {product.baseUnit}
          </div>
        </div>

        {/* Quantity input */}
        <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
          <label className="form-label">
            Quantity ({UNIT_LABELS[selectedUnit]})
          </label>
          <input
            id="qty-input"
            type="number"
            step="0.001"
            min="0"
            className="form-input"
            placeholder={`Enter quantity in ${UNIT_SHORT[selectedUnit]}`}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>

        {/* Live price preview */}
        <div className="price-preview" style={{ marginBottom: "var(--space-5)" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Estimated Price</div>
            {qtyNum > 0 && (
              <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginTop: 2 }}>
                {qtyNum} {UNIT_SHORT[selectedUnit]} × {formatINR(pricePerSelectedUnit)}/{UNIT_SHORT[selectedUnit]}
              </div>
            )}
          </div>
          <div className="price-preview-amount">
            {qtyNum > 0 ? formatINR(lineTotal) : "₹0.00"}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button
            id="confirm-add-to-cart"
            onClick={handleAdd}
            className="btn btn-primary"
            disabled={qtyNum <= 0}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SellerProductsClient({ products, categories }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dimensionFilter, setDimensionFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<ProductWithCategory | null>(null);

  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || p.categoryId === categoryFilter;
    const matchDim = dimensionFilter === "all" || p.dimension === dimensionFilter;
    return matchSearch && matchCat && matchDim;
  });

  function handleAddToCart(productId: string, qty: number, unit: AnyUnit) {
    // Read existing cart from localStorage
    const raw = localStorage.getItem("inventory_cart") || "[]";
    const cart: Array<{ productId: string; qty: number; unit: AnyUnit }> =
      JSON.parse(raw);

    // Merge if same product+unit exists
    const existing = cart.find(
      (i) => i.productId === productId && i.unit === unit
    );
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ productId, qty, unit });
    }

    localStorage.setItem("inventory_cart", JSON.stringify(cart));

    // Trigger storage event for cart page sync
    window.dispatchEvent(new Event("storage"));

    // Show feedback and optionally redirect
    router.push("/seller/cart");
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Browse Products</h1>
          <p className="page-subtitle">
            {filtered.length} product{filtered.length !== 1 ? "s" : ""} available
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="search-bar">
        <div className="search-input-wrap" style={{ minWidth: 280 }}>
          <span className="search-icon">🔍</span>
          <input
            id="seller-product-search"
            className="form-input"
            placeholder="Search products, SKU, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          id="category-filter"
          className="form-select"
          style={{ width: "auto" }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          id="dimension-filter"
          className="form-select"
          style={{ width: "auto" }}
          value={dimensionFilter}
          onChange={(e) => setDimensionFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="weight">⚖️ Weight</option>
          <option value="volume">🧴 Volume</option>
          <option value="count">📦 Count</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">No products found</div>
          <p className="empty-state-description">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className="product-grid">
          {filtered.map((p) => {
            const pricePerDisplay = priceInUnit(
              parseFloat(p.pricePerBaseUnit),
              p.displayUnit as AnyUnit
            );
            const stockDisplay = fromBaseUnits(
              parseFloat(p.stockQuantity),
              p.displayUnit as AnyUnit
            );
            const stockPct = Math.min(
              (parseFloat(p.stockQuantity) / 1_000_000) * 100,
              100
            );
            const stockClass =
              stockDisplay <= 0 ? "out" : stockDisplay < 50 ? "low" : "";
            const dimColor = DIMENSION_COLORS[p.dimension] || "#6366f1";

            return (
              <div key={p.id} className="product-card" id={`product-${p.sku}`}>
                <div className="product-card-header">
                  <div
                    className="product-icon"
                    style={{ background: `linear-gradient(135deg, ${dimColor}22, ${dimColor}11)` }}
                  >
                    {DIMENSION_ICONS[p.dimension]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="product-name truncate">{p.name}</div>
                    <div className="product-sku">{p.sku}</div>
                  </div>
                </div>

                {p.category && (
                  <span className="badge badge-indigo">{p.category.name}</span>
                )}

                {p.description && (
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    {p.description}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div className="product-price">
                      {formatINR(pricePerDisplay)}
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 400,
                          color: "var(--text-muted)",
                          marginLeft: 2,
                        }}
                      >
                        / {UNIT_SHORT[p.displayUnit as AnyUnit]}
                      </span>
                    </div>
                    <div className={`product-stock ${stockClass}`}>
                      Stock:{" "}
                      {parseFloat(stockDisplay.toFixed(2))}{" "}
                      {UNIT_SHORT[p.displayUnit as AnyUnit]}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-1)",
                      alignItems: "center",
                    }}
                  >
                    {availableUnitsDisplay(p)}
                  </div>
                </div>

                {/* Stock bar */}
                <div className="stock-bar">
                  <div
                    className={`stock-bar-fill ${stockClass}`}
                    style={{ width: `${Math.min(stockPct, 100)}%` }}
                  />
                </div>

                <button
                  id={`add-to-cart-${p.sku}`}
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  onClick={() => setSelectedProduct(p)}
                  disabled={parseFloat(p.stockQuantity) <= 0}
                >
                  {parseFloat(p.stockQuantity) <= 0
                    ? "Out of Stock"
                    : "Add to Cart"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedProduct && (
        <AddToCartModal
          product={selectedProduct}
          onAdd={handleAddToCart}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  );
}

function availableUnitsDisplay(p: ProductWithCategory) {
  const units = UNITS_BY_DIMENSION[p.dimension as Dimension] || [];
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {units.map((u) => (
        <span
          key={u}
          className="badge badge-gray"
          style={{ fontSize: "0.65rem" }}
        >
          {UNIT_SHORT[u]}
        </span>
      ))}
    </div>
  );
}
