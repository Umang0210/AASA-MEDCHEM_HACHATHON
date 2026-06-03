# InventoryOS — Inventory & Order Management System

A full-stack inventory and quotation/order management system with multi-unit support, INR pricing, and role-based access control.

**Live URL**: *(to be filled after Vercel deploy)*

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [System Design](#system-design)
4. [Database Schema](#database-schema)
5. [Unit Storage & Conversion Strategy](#unit-storage--conversion-strategy)
6. [Price & Quantity Storage](#price--quantity-storage)
7. [Setup Instructions](#setup-instructions)
8. [Vercel Deployment](#vercel-deployment)
9. [Test Credentials & Usage Guide](#test-credentials--usage-guide)

---

## Features

| Feature | Admin | Seller |
|---------|-------|--------|
| Login / auth | ✅ | ✅ |
| Dashboard with KPIs | ✅ | ✅ |
| Create / edit / archive products | ✅ | — |
| Manage categories | ✅ | — |
| View all quotations with full audit trail | ✅ | — |
| Approve / reject quotations | ✅ | — |
| Create orders (on approval) | ✅ | — |
| Update order status | ✅ | — |
| Browse & search products | — | ✅ |
| Filter by category / dimension | — | ✅ |
| Add to cart with any supported unit | — | ✅ |
| Live price preview per unit | — | ✅ |
| Submit quotations | — | ✅ |
| View own quotation & order history | — | ✅ |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| ORM | Drizzle ORM |
| Database | Neon PostgreSQL (serverless) |
| Auth | NextAuth v5 (Auth.js) — credentials + JWT |
| Styling | Vanilla CSS (custom design system) |
| Deployment | Vercel |
| DB Migrations | drizzle-kit push |

---

## System Design

```
Browser
  │
  ├── /login             → Public (NextAuth credentials)
  ├── /admin/**          → Auth guard: role = 'admin' only
  └── /seller/**         → Auth guard: any logged-in user
       │
       ▼
Next.js App Router (Vercel Serverless Functions)
  │  ├── Server Components  → Fetch data directly (no API layer needed)
  │  ├── Server Actions     → Mutate data, run after form submits/button clicks
  │  └── Client Components  → Cart (localStorage), modals, live price calcs
       │
       ▼
Drizzle ORM (type-safe queries)
       │
       ▼
Neon PostgreSQL
  (HTTP-based @neondatabase/serverless driver — no persistent connections)
```

**Why no REST API layer?** Next.js Server Actions are colocated mutation handlers that run on the server. They remove the need for a separate `/api` layer for data mutations, keep the codebase lean, and are fully type-safe end-to-end.

---

## Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` PK | `gen_random_uuid()` default |
| `name` | `TEXT NOT NULL` | Display name |
| `email` | `TEXT UNIQUE NOT NULL` | Login email |
| `password_hash` | `TEXT NOT NULL` | bcrypt hash (cost 10) |
| `role` | `TEXT NOT NULL` | `'admin'` or `'seller'` |
| `created_at` | `TIMESTAMPTZ` | Auto |

### `categories`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` PK | |
| `name` | `TEXT UNIQUE NOT NULL` | |

### `products`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` PK | |
| `sku` | `TEXT UNIQUE NOT NULL` | |
| `name` | `TEXT NOT NULL` | |
| `description` | `TEXT` | |
| `category_id` | `UUID FK → categories` | Nullable |
| `dimension` | `TEXT` | `'weight'` \| `'volume'` \| `'count'` |
| `base_unit` | `TEXT` | `'g'` \| `'ml'` \| `'item'` |
| `display_unit` | `TEXT` | Default UI unit (e.g., `'kg'`) |
| `price_per_base_unit` | `NUMERIC(20,6)` | INR per 1 base unit |
| `stock_quantity` | `NUMERIC(20,6)` | In base units |
| `min_order_quantity` | `NUMERIC(20,6)` | In base units |
| `is_active` | `BOOLEAN` | Soft-delete flag |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | |

### `quotations`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` PK | |
| `seller_id` | `UUID FK → users` | |
| `status` | `TEXT` | `draft` \| `submitted` \| `approved` \| `rejected` \| `fulfilled` |
| `notes` | `TEXT` | |
| `total_amount` | `NUMERIC(20,6)` | INR |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | |

### `quotation_items`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` PK | |
| `quotation_id` | `UUID FK → quotations` | |
| `product_id` | `UUID FK → products` | |
| `ordered_quantity` | `NUMERIC(20,6)` | **What seller entered** |
| `ordered_unit` | `TEXT` | **What seller chose** (e.g., `'kg'`) |
| `quantity_base_units` | `NUMERIC(20,6)` | Converted to base unit |
| `base_unit` | `TEXT` | `'g'` \| `'ml'` \| `'item'` |
| `price_per_base_unit` | `NUMERIC(20,6)` | **Price snapshot** at order time |
| `line_total` | `NUMERIC(20,6)` | INR = qty_base × price_per_base |

### `orders`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` PK | |
| `quotation_id` | `UUID UNIQUE FK → quotations` | 1:1 |
| `seller_id` | `UUID FK → users` | |
| `approved_by` | `UUID FK → users` | Admin who approved |
| `status` | `TEXT` | `processing` \| `shipped` \| `delivered` \| `cancelled` |
| `total_amount` | `NUMERIC(20,6)` | INR |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | |

---

## Unit Storage & Conversion Strategy

### Core Principle: Canonical Base Units

Every quantity in the database is stored in a **single canonical base unit** per dimension:

| Dimension | Canonical Base Unit | Reason |
|-----------|---------------------|--------|
| Weight | **grams (g)** | Smallest practical weight unit in use |
| Volume | **milliliters (mL)** | Smallest practical volume unit in use |
| Count | **items (item)** | Indivisible unit |

### Conversion Factors (`src/lib/units.ts`)

```
Weight:   1 kg = 1000 g    → TO_BASE_FACTOR['kg'] = 1000
          1 g  = 1 g       → TO_BASE_FACTOR['g']  = 1

Volume:   1 L  = 1000 mL   → TO_BASE_FACTOR['L']  = 1000
          1 mL = 1 mL      → TO_BASE_FACTOR['ml'] = 1

Count:    1 item = 1 item  → TO_BASE_FACTOR['item'] = 1
```

### Where Conversions Are Applied

| Phase | Location | Operation |
|-------|----------|-----------|
| **Admin sets price** | `product.actions.ts` → `lib/units.ts#toBasePricePerUnit()` | `₹80/kg → ₹0.08/g` before INSERT |
| **Admin sets stock** | `product.actions.ts` → `lib/units.ts#toBaseUnits()` | `500 kg → 500,000 g` before INSERT |
| **UI displays price** | `lib/units.ts#priceInUnit()` | `₹0.08/g → ₹80/kg` for display |
| **UI displays stock** | `lib/units.ts#fromBaseUnits()` | `500,000 g → 500 kg` for display |
| **Seller picks unit** | Client component (live) | Price preview = `qty × priceInUnit(pricePerBase, selectedUnit)` |
| **Seller submits cart** | `quotation.actions.ts` | Each item: `toBaseUnits(qty, unit)` → `calculateLineTotal()` |
| **DB stores quotation item** | DB write | Both `ordered_quantity + ordered_unit` AND `quantity_base_units` are stored |
| **Admin views quotation** | `AdminQuotationsClient.tsx` | Shows full audit: ordered → base → rate → calc |

### Example: Basmati Rice

```
Admin creates product:
  Entered: ₹80 per kg, stock 500 kg
  Stored:  price_per_base_unit = 0.08 (₹0.08/g)
           stock_quantity = 500000 (g)

Seller orders 2.5 kg:
  Stored in quotation_items:
    ordered_quantity    = 2.5
    ordered_unit        = 'kg'
    quantity_base_units = 2500   (g)
    price_per_base_unit = 0.08   (snapshot)
    line_total          = 200    (₹200.00)

Admin sees:
  "2.5 kg = 2500 g × ₹0.08/g = ₹200.00"
```

---

## Price & Quantity Storage

### PostgreSQL Type: `NUMERIC(20, 6)`

Used for **all** price and quantity columns.

| Spec | Value | Reasoning |
|------|-------|-----------|
| Total digits | 20 | Handles planetary-scale inventory (up to 99,999,999,999,999.999999) |
| Decimal places | 6 | Sub-milligram precision for high-value items (e.g., saffron at ₹500/g) |
| Type choice | `NUMERIC` not `FLOAT` | **Exact** decimal arithmetic. `FLOAT` has rounding errors unacceptable for money |
| Alternative considered | `BIGINT` (store in paise) | Rejected — decimal prices (per-gram) would require scale factors, adding complexity |

### INR Display

- All UI monetary values use `Intl.NumberFormat('en-IN', { currency: 'INR' })`
- Prices shown to 2 decimal places in UI (₹200.00), 6 decimal places for internal/base rates
- No rounding until display layer — arithmetic always done in full precision

### Rounding Rules

- **Storage**: Full `NUMERIC(20,6)` precision — no rounding on write
- **Line totals**: Computed as `quantity_base × price_per_base`, stored with 6dp
- **Display only**: `toFixed(2)` applied only in the formatINR() function, never before DB write

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- A [Neon](https://neon.tech) database (free tier is sufficient)

### Local Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd inventory-app

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.local.example .env.local
# Edit .env.local and set your DATABASE_URL from Neon console

# 4. Push schema to database
npm run db:push

# 5. Seed with demo data
npm run seed

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string (from Neon console → Connection Details → Pooled connection) |
| `AUTH_SECRET` | Random string for JWT signing. Generate with: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Full URL of the app (`http://localhost:3000` locally, `https://your-app.vercel.app` in production) |

---

## Vercel Deployment

```bash
# 1. Push code to GitHub
git add .
git commit -m "Initial deploy"
git push origin main

# 2. Go to https://vercel.com → New Project → Import your GitHub repo

# 3. In Vercel project settings → Environment Variables, add:
#    DATABASE_URL      = (your Neon connection string)
#    AUTH_SECRET       = (run: openssl rand -base64 32)
#    NEXTAUTH_URL      = https://your-app.vercel.app

# 4. Deploy (Vercel auto-builds on git push)
```

> **Tip**: In the Neon dashboard, use the **Pooled connection** string (not direct) for Vercel — it's optimised for serverless.

---

## Test Credentials & Usage Guide

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@inventory.com` | `admin123` |
| Seller | `priya@seller.com` | `seller123` |
| Seller | `ravi@seller.com` | `seller123` |

### Admin Flow

1. Log in as admin → lands on **Dashboard** (KPI overview)
2. Go to **Products** → see all 12 seeded products with dual price display (display unit + base unit)
3. Click **+ New Product** → fill form → prices/stock entered in display units, stored in base units automatically
4. Go to **Quotations** → click **View Details** to see full unit conversion audit per item
5. Click **Approve & Create Order** → stock is deducted, order is created
6. Go to **Orders** → advance status: Processing → Shipped → Delivered

### Seller Flow

1. Log in as seller → lands on **Dashboard**
2. Go to **Browse Products** → search/filter by name, category, unit type
3. Click a product card → **Add to Cart** modal opens
4. Choose your unit (e.g., select `kg` for Rice) → enter quantity → **live price preview updates**
5. Switch to `g` → see price recalculate correctly (e.g., 500g = ₹40.00)
6. Click **Add to Cart** → redirected to cart
7. In **My Cart**: adjust quantities, switch units — price recalculates live with conversion audit shown
8. Add notes → click **Submit Quotation**
9. Go to **My Quotations** → see status (Submitted)
10. After admin approves → status changes to Approved with order status shown

### Unit Conversion Demo

| Product | Admin enters | Stored as | Seller orders | Shows |
|---------|-------------|-----------|---------------|-------|
| Basmati Rice | ₹80/kg | ₹0.08/g | 2.5 kg | ₹200.00 |
| Basmati Rice | ₹80/kg | ₹0.08/g | 500 g | ₹40.00 |
| Groundnut Oil | ₹180/L | ₹0.18/mL | 2 L | ₹360.00 |
| Groundnut Oil | ₹180/L | ₹0.18/mL | 500 mL | ₹90.00 |
| Eggs | ₹12/item | ₹12/item | 6 items | ₹72.00 |
