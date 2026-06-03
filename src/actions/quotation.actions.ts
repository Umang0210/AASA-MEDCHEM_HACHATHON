"use server";

import { db } from "@/db";
import { quotations, quotationItems, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { toBaseUnits, calculateLineTotal } from "@/lib/units";
import type { AnyUnit } from "@/lib/units";

// Cart item passed from client
export interface CartItemInput {
  productId: string;
  orderedQuantity: number;
  orderedUnit: AnyUnit;
}

// ─── Seller: Submit Quotation ─────────────────────────────────────────────────

export async function submitQuotation(
  cartItems: CartItemInput[],
  notes?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const sellerId = session.user.id;

  if (cartItems.length === 0) throw new Error("Cart is empty");

  // Fetch product details for all items
  const productIds = cartItems.map((i) => i.productId);
  const productRows = await db.query.products.findMany({
    where: (p, { inArray }) => inArray(p.id, productIds),
  });

  const productMap = Object.fromEntries(productRows.map((p) => [p.id, p]));

  // Validate stock and build quotation items
  let totalAmount = 0;
  const itemsToInsert = [];

  for (const item of cartItems) {
    const product = productMap[item.productId];
    if (!product) throw new Error(`Product not found: ${item.productId}`);
    if (!product.isActive) throw new Error(`Product ${product.name} is inactive`);

    const baseQty = toBaseUnits(item.orderedQuantity, item.orderedUnit);
    const pricePerBase = parseFloat(product.pricePerBaseUnit);
    const lineTotal = calculateLineTotal(
      item.orderedQuantity,
      item.orderedUnit,
      pricePerBase
    );

    // Stock check
    const currentStock = parseFloat(product.stockQuantity);
    if (baseQty > currentStock) {
      throw new Error(
        `Insufficient stock for "${product.name}". Available: ${currentStock} ${product.baseUnit}`
      );
    }

    totalAmount += lineTotal;

    itemsToInsert.push({
      productId: item.productId,
      orderedQuantity: item.orderedQuantity.toFixed(6),
      orderedUnit: item.orderedUnit,
      quantityBaseUnits: baseQty.toFixed(6),
      baseUnit: product.baseUnit,
      pricePerBaseUnit: pricePerBase.toFixed(6),
      lineTotal: lineTotal.toFixed(6),
    });
  }

  // Create quotation + items in sequence
  const [quotation] = await db
    .insert(quotations)
    .values({
      sellerId,
      status: "submitted",
      notes: notes || null,
      totalAmount: totalAmount.toFixed(6),
    })
    .returning();

  await db.insert(quotationItems).values(
    itemsToInsert.map((item) => ({
      ...item,
      quotationId: quotation.id,
    }))
  );

  revalidatePath("/seller/quotations");
  revalidatePath("/admin/quotations");
  return quotation.id;
}

// ─── Get quotations ───────────────────────────────────────────────────────────

export async function getMyQuotations() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return db.query.quotations.findMany({
    where: eq(quotations.sellerId, session.user.id),
    with: {
      items: {
        with: { product: { with: { category: true } } },
      },
      order: true,
    },
    orderBy: (q, { desc }) => [desc(q.createdAt)],
  });
}

export async function getAllQuotations() {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  return db.query.quotations.findMany({
    with: {
      seller: true,
      items: {
        with: { product: { with: { category: true } } },
      },
      order: true,
    },
    orderBy: (q, { desc }) => [desc(q.createdAt)],
  });
}

export async function getQuotationById(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const quotation = await db.query.quotations.findFirst({
    where: eq(quotations.id, id),
    with: {
      seller: true,
      items: {
        with: { product: { with: { category: true } } },
      },
      order: true,
    },
  });

  if (!quotation) return null;

  // Sellers can only see their own quotations
  if (
    session.user.role !== "admin" &&
    quotation.sellerId !== session.user.id
  ) {
    throw new Error("Unauthorized");
  }

  return quotation;
}
