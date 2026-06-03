"use client";

import { useState, useTransition } from "react";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
} from "@/actions/product.actions";
import { formatINR } from "@/lib/formatters";
import {
  UNITS_BY_DIMENSION,
  UNIT_LABELS,
  UNIT_SHORT,
  priceInUnit,
  fromBaseUnits,
  type AnyUnit,
  type Dimension,
} from "@/lib/units";
import type { Product, Category } from "@/db/schema";

type ProductWithCategory = Product & { category: Category | null };

interface Props {
  initialProducts: ProductWithCategory[];
  categories: Category[];
}

const DIMENSION_ICONS: Record<string, string> = {
  weight: "⚖️",
  volume: "🧴",
  count: "📦",
};

const BASE_UNIT_FOR_DIM: Record<string, AnyUnit> = {
  weight: "g",
  volume: "ml",
  count: "item",
};

function ProductModal({
  product,
  categories,
  onClose,
}: {
  product?: ProductWithCategory | null;
  categories: Category[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [dimension, setDimension] = useState<Dimension>(
    (product?.dimension as Dimension) || "weight"
  );
  const [displayUnit, setDisplayUnit] = useState<AnyUnit>(
    (product?.displayUnit as AnyUnit) ||
      UNITS_BY_DIMENSION[dimension as Dimension][0]
  );

  const availableUnits = UNITS_BY_DIMENSION[dimension] || [];

  function handleDimensionChange(dim: Dimension) {
    setDimension(dim);
    setDisplayUnit(UNITS_BY_DIMENSION[dim][0]);
  }

  // If editing, compute display values from stored base values
  const editPrice = product
    ? priceInUnit(
        parseFloat(product.pricePerBaseUnit),
        product.displayUnit as AnyUnit
      )
    : "";
  const editStock = product
    ? fromBaseUnits(
        parseFloat(product.stockQuantity),
        product.displayUnit as AnyUnit
      )
    : "";
  const editMinOrder = product
    ? fromBaseUnits(
        parseFloat(product.minOrderQuantity),
        product.displayUnit as AnyUnit
      )
    : "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    // Inject derived fields
    fd.set("baseUnit", BASE_UNIT_FOR_DIM[dimension]);
    fd.set("displayUnit", displayUnit);
    fd.set("stockUnit", displayUnit);
    fd.set("minUnit", displayUnit);

    startTransition(async () => {
      try {
        if (product) {
          await updateProduct(product.id, fd);
        } else {
          await createProduct(fd);
        }
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    });
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <h2 className="modal-title">
            {product ? "Edit Product" : "New Product"}
          </h2>
          <button className="modal-close" onClick={onClose} id="modal-close-btn">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ marginBottom: "var(--space-4)" }}>
            <div className="form-group">
              <label className="form-label">SKU *</label>
              <input
                name="sku"
                className="form-input"
                defaultValue={product?.sku ?? ""}
                required
                placeholder="e.g. GRAIN-001"
                readOnly={!!product}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                name="name"
                className="form-input"
                defaultValue={product?.name ?? ""}
                required
                placeholder="e.g. Basmati Rice"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
            <label className="form-label">Description</label>
            <textarea
              name="description"
              className="form-textarea"
              defaultValue={product?.description ?? ""}
              placeholder="Product description…"
            />
          </div>

          <div className="form-grid" style={{ marginBottom: "var(--space-4)" }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                name="categoryId"
                className="form-select"
                defaultValue={product?.categoryId ?? ""}
              >
                <option value="">— No Category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit Dimension *</label>
              <select
                name="dimension"
                className="form-select"
                value={dimension}
                onChange={(e) =>
                  handleDimensionChange(e.target.value as Dimension)
                }
                disabled={!!product}
              >
                <option value="weight">⚖️ Weight (g / kg)</option>
                <option value="volume">🧴 Volume (mL / L)</option>
                <option value="count">📦 Count (items)</option>
              </select>
            </div>
          </div>

          <div className="form-grid" style={{ marginBottom: "var(--space-4)" }}>
            <div className="form-group">
              <label className="form-label">Display Unit (default for UI)</label>
              <select
                className="form-select"
                value={displayUnit}
                onChange={(e) => setDisplayUnit(e.target.value as AnyUnit)}
                disabled={!!product}
              >
                {availableUnits.map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABELS[u]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                Price per {UNIT_SHORT[displayUnit]} (₹) *
              </label>
              <input
                name="priceEntered"
                type="number"
                step="0.000001"
                min="0"
                className="form-input"
                defaultValue={editPrice !== "" ? String(editPrice) : ""}
                required
                placeholder={`e.g. 80`}
              />
              <span className="form-hint">
                Stored internally as ₹ per {BASE_UNIT_FOR_DIM[dimension]}
              </span>
            </div>
          </div>

          <div className="form-grid" style={{ marginBottom: "var(--space-4)" }}>
            <div className="form-group">
              <label className="form-label">
                Stock Quantity (in {UNIT_SHORT[displayUnit]}) *
              </label>
              <input
                name="stockEntered"
                type="number"
                step="0.000001"
                min="0"
                className="form-input"
                defaultValue={editStock !== "" ? String(editStock) : ""}
                required
                placeholder="e.g. 500"
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Min. Order (in {UNIT_SHORT[displayUnit]})
              </label>
              <input
                name="minOrderEntered"
                type="number"
                step="0.000001"
                min="0"
                className="form-input"
                defaultValue={editMinOrder !== "" ? String(editMinOrder) : "0"}
                placeholder="e.g. 1"
              />
            </div>
          </div>

          {product && (
            <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
              <label className="form-label">Status</label>
              <select
                name="isActive"
                className="form-select"
                defaultValue={product.isActive ? "true" : "false"}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ marginBottom: "var(--space-4)" }}>
              ⚠️ {error}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              id="save-product-btn"
              type="submit"
              className="btn btn-primary"
              disabled={isPending}
            >
              {isPending
                ? "Saving…"
                : product
                ? "Save Changes"
                : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminProductsClient({
  initialProducts,
  categories,
}: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] =
    useState<ProductWithCategory | null>(null);
  const [isPending, startTransition] = useTransition();
  const [categoryInput, setCategoryInput] = useState("");
  const [catError, setCatError] = useState("");

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  function openEdit(product: ProductWithCategory) {
    setEditProduct(product);
    setShowModal(true);
  }

  function openNew() {
    setEditProduct(null);
    setShowModal(true);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Archive product "${name}"? It will be hidden from sellers.`))
      return;
    startTransition(() => deleteProduct(id));
  }

  async function handleAddCategory() {
    if (!categoryInput.trim()) return;
    setCatError("");
    startTransition(async () => {
      try {
        await createCategory(categoryInput.trim());
        setCategoryInput("");
      } catch {
        setCatError("Category name already exists or error occurred.");
      }
    });
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">
            {filtered.length} product{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button id="new-product-btn" onClick={openNew} className="btn btn-primary">
          + New Product
        </button>
      </div>

      {/* Category management */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <h3 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "var(--space-3)" }}>
          Categories
        </h3>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
          {categories.map((c) => (
            <span key={c.id} className="badge badge-indigo">
              {c.name}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <input
            className="form-input"
            style={{ maxWidth: 220 }}
            placeholder="New category name"
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
            id="category-input"
          />
          <button
            id="add-category-btn"
            onClick={handleAddCategory}
            className="btn btn-secondary"
            disabled={isPending}
          >
            Add
          </button>
        </div>
        {catError && <p className="form-error" style={{ marginTop: "var(--space-2)" }}>{catError}</p>}
      </div>

      {/* Search */}
      <div className="search-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            id="product-search"
            className="form-input"
            placeholder="Search by name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Dimension</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📦</div>
                    <div className="empty-state-title">No products found</div>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map((p) => {
              const displayPricePerUnit = priceInUnit(
                parseFloat(p.pricePerBaseUnit),
                p.displayUnit as AnyUnit
              );
              const displayStock = fromBaseUnits(
                parseFloat(p.stockQuantity),
                p.displayUnit as AnyUnit
              );
              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {p.description?.slice(0, 40)}
                      {(p.description?.length ?? 0) > 40 ? "…" : ""}
                    </div>
                  </td>
                  <td className="mono">{p.sku}</td>
                  <td className="muted">{p.category?.name ?? "—"}</td>
                  <td>
                    <span>
                      {DIMENSION_ICONS[p.dimension]} {p.dimension}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--text-accent)" }}>
                    {formatINR(displayPricePerUnit)}/{UNIT_SHORT[p.displayUnit as AnyUnit]}
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      = {formatINR(parseFloat(p.pricePerBaseUnit), 6)}/{p.baseUnit}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>
                      {parseFloat(displayStock.toFixed(4))} {UNIT_SHORT[p.displayUnit as AnyUnit]}
                    </span>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      {parseFloat(p.stockQuantity)} {p.baseUnit}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${p.isActive ? "badge-green" : "badge-gray"}`}>
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        id={`edit-${p.sku}`}
                        onClick={() => openEdit(p)}
                        className="btn btn-secondary btn-sm"
                      >
                        Edit
                      </button>
                      <button
                        id={`delete-${p.sku}`}
                        onClick={() => handleDelete(p.id, p.name)}
                        className="btn btn-danger btn-sm"
                        disabled={isPending}
                      >
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ProductModal
          product={editProduct}
          categories={categories}
          onClose={() => {
            setShowModal(false);
            setEditProduct(null);
          }}
        />
      )}
    </>
  );
}
