import {
  pgTable,
  text,
  boolean,
  numeric,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // role: 'admin' | 'seller'
  role: text("role").notNull().default("seller"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// CATEGORIES
// ---------------------------------------------------------------------------
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// PRODUCTS
// ---------------------------------------------------------------------------
// dimension: 'weight' | 'volume' | 'count'
// base_unit:  'g'     | 'ml'     | 'item'   (canonical storage unit)
// display_unit: preferred UI unit (e.g., 'kg' for a weight product)
// price_per_base_unit: INR per 1 base-unit (g, ml, or item)
//   e.g., rice priced at ₹80/kg → stored as 0.08 (₹0.08 per gram)
// stock_quantity: in base units
// ---------------------------------------------------------------------------
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  // dimension tells us which unit family applies
  dimension: text("dimension").notNull(), // 'weight' | 'volume' | 'count'
  // base_unit is always g / ml / item  (canonical)
  baseUnit: text("base_unit").notNull(), // 'g' | 'ml' | 'item'
  // display_unit is what we show in the UI by default
  displayUnit: text("display_unit").notNull(), // 'g'|'kg'|'ml'|'L'|'item'
  // NUMERIC(20,6): 20 significant digits, 6 decimal places
  // handles sub-milligram pricing (e.g., ₹0.000080/g for saffron)
  pricePerBaseUnit: numeric("price_per_base_unit", {
    precision: 20,
    scale: 6,
  }).notNull(),
  stockQuantity: numeric("stock_quantity", {
    precision: 20,
    scale: 6,
  })
    .notNull()
    .default("0"),
  minOrderQuantity: numeric("min_order_quantity", {
    precision: 20,
    scale: 6,
  })
    .notNull()
    .default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// QUOTATIONS
// ---------------------------------------------------------------------------
// status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'fulfilled'
// total_amount: INR, NUMERIC(20,6) — sum of all line totals
// ---------------------------------------------------------------------------
export const quotations = pgTable("quotations", {
  id: uuid("id").primaryKey().defaultRandom(),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  totalAmount: numeric("total_amount", {
    precision: 20,
    scale: 6,
  })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// QUOTATION ITEMS
// ---------------------------------------------------------------------------
// We store BOTH the user's original order (ordered_quantity + ordered_unit)
// AND the canonical base-unit values for consistent backend math.
//
// ordered_quantity / ordered_unit  → what the seller typed (e.g., 2.5 kg)
// quantity_base_units              → converted value (e.g., 2500 g)
// base_unit                        → 'g' | 'ml' | 'item'
// price_per_base_unit              → snapshot of product price at order time
// line_total                       → quantity_base_units × price_per_base_unit (INR)
// ---------------------------------------------------------------------------
export const quotationItems = pgTable("quotation_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  quotationId: uuid("quotation_id")
    .notNull()
    .references(() => quotations.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  // What the seller entered
  orderedQuantity: numeric("ordered_quantity", {
    precision: 20,
    scale: 6,
  }).notNull(),
  orderedUnit: text("ordered_unit").notNull(), // 'g'|'kg'|'ml'|'L'|'item'
  // Canonical stored values
  quantityBaseUnits: numeric("quantity_base_units", {
    precision: 20,
    scale: 6,
  }).notNull(), // always in g / ml / item
  baseUnit: text("base_unit").notNull(),
  pricePerBaseUnit: numeric("price_per_base_unit", {
    precision: 20,
    scale: 6,
  }).notNull(), // INR snapshot
  lineTotal: numeric("line_total", {
    precision: 20,
    scale: 6,
  }).notNull(), // INR
});

// ---------------------------------------------------------------------------
// ORDERS  (approved quotations)
// ---------------------------------------------------------------------------
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  quotationId: uuid("quotation_id")
    .notNull()
    .unique()
    .references(() => quotations.id, { onDelete: "restrict" }),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  approvedBy: uuid("approved_by").references(() => users.id, {
    onDelete: "set null",
  }),
  // status: 'processing' | 'shipped' | 'delivered' | 'cancelled'
  status: text("status").notNull().default("processing"),
  totalAmount: numeric("total_amount", {
    precision: 20,
    scale: 6,
  }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// RELATIONS  (for Drizzle relational queries)
// ---------------------------------------------------------------------------
export const usersRelations = relations(users, ({ many }) => ({
  quotations: many(quotations),
  orders: many(orders),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  quotationItems: many(quotationItems),
}));

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  seller: one(users, {
    fields: [quotations.sellerId],
    references: [users.id],
  }),
  items: many(quotationItems),
  order: one(orders, {
    fields: [quotations.id],
    references: [orders.quotationId],
  }),
}));

export const quotationItemsRelations = relations(
  quotationItems,
  ({ one }) => ({
    quotation: one(quotations, {
      fields: [quotationItems.quotationId],
      references: [quotations.id],
    }),
    product: one(products, {
      fields: [quotationItems.productId],
      references: [products.id],
    }),
  })
);

export const ordersRelations = relations(orders, ({ one }) => ({
  quotation: one(quotations, {
    fields: [orders.quotationId],
    references: [quotations.id],
  }),
  seller: one(users, {
    fields: [orders.sellerId],
    references: [users.id],
  }),
  approvedByUser: one(users, {
    fields: [orders.approvedBy],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// TYPE EXPORTS
// ---------------------------------------------------------------------------
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Quotation = typeof quotations.$inferSelect;
export type NewQuotation = typeof quotations.$inferInsert;
export type QuotationItem = typeof quotationItems.$inferSelect;
export type NewQuotationItem = typeof quotationItems.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
