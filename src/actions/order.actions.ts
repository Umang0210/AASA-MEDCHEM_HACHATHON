"use server";

import { db } from "@/db";
import { orders, quotations, products, quotationItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { sql } from "drizzle-orm";

// ─── Admin: Approve Quotation → Create Order ──────────────────────────────────

export async function approveQuotation(quotationId: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const quotation = await db.query.quotations.findFirst({
    where: eq(quotations.id, quotationId),
    with: {
      items: { with: { product: true } },
    },
  });

  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status !== "submitted")
    throw new Error("Only submitted quotations can be approved");

  // Deduct stock for each item
  for (const item of quotation.items) {
    const deductQty = parseFloat(item.quantityBaseUnits);
    await db
      .update(products)
      .set({
        stockQuantity: sql`${products.stockQuantity} - ${deductQty}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, item.productId));
  }

  // Create the order
  await db.insert(orders).values({
    quotationId,
    sellerId: quotation.sellerId,
    approvedBy: session.user.id,
    status: "processing",
    totalAmount: quotation.totalAmount,
    notes: quotation.notes,
  });

  // Update quotation status
  await db
    .update(quotations)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(quotations.id, quotationId));

  revalidatePath("/admin/quotations");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/products");
  revalidatePath("/seller/quotations");
}

// ─── Admin: Reject Quotation ──────────────────────────────────────────────────

export async function rejectQuotation(quotationId: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  await db
    .update(quotations)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(quotations.id, quotationId));

  revalidatePath("/admin/quotations");
  revalidatePath("/seller/quotations");
}

// ─── Admin: Update Order Status ───────────────────────────────────────────────

export async function updateOrderStatus(orderId: string, status: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const validStatuses = ["processing", "shipped", "delivered", "cancelled"];
  if (!validStatuses.includes(status)) throw new Error("Invalid status");

  await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  revalidatePath("/admin/orders");
  revalidatePath("/seller/quotations");
}

// ─── Get Orders ───────────────────────────────────────────────────────────────

export async function getAllOrders() {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  return db.query.orders.findMany({
    with: {
      quotation: {
        with: {
          seller: true,
          items: {
            with: { product: { with: { category: true } } },
          },
        },
      },
      approvedByUser: true,
    },
    orderBy: (o, { desc }) => [desc(o.createdAt)],
  });
}
