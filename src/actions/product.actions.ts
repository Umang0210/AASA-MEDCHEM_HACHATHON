"use server";

import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq, ilike, and, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { toBasePricePerUnit } from "@/lib/units";
import type { AnyUnit } from "@/lib/units";

function requireAdmin() {
  // Called from server actions — session checked here
}

// ─── List / Search ────────────────────────────────────────────────────────────

export async function getProducts(
  search?: string,
  categoryId?: string,
  activeOnly = true
) {
  const conditions = [];
  if (activeOnly) conditions.push(eq(products.isActive, true));
  if (categoryId) conditions.push(eq(products.categoryId, categoryId));
  if (search) {
    conditions.push(
      or(
        ilike(products.name, `%${search}%`),
        ilike(products.sku, `%${search}%`),
        ilike(products.description, `%${search}%`)
      )
    );
  }

  const rows = await db.query.products.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: { category: true },
    orderBy: (p, { asc }) => [asc(p.name)],
  });

  return rows;
}

export async function getProductById(id: string) {
  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: { category: true },
  });
  return product ?? null;
}

export async function getCategories() {
  return db.select().from(categories).orderBy(categories.name);
}

// ─── Admin: Create ────────────────────────────────────────────────────────────

export async function createProduct(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const displayUnit = formData.get("displayUnit") as AnyUnit;
  const priceEntered = parseFloat(formData.get("priceEntered") as string);
  const stockEntered = parseFloat(formData.get("stockEntered") as string);
  const minOrderEntered = parseFloat(formData.get("minOrderEntered") as string);
  const stockUnit = formData.get("stockUnit") as AnyUnit;
  const minUnit = formData.get("minUnit") as AnyUnit;

  // Convert entered price (per display unit) to price per base unit
  const pricePerBaseUnit = toBasePricePerUnit(priceEntered, displayUnit);

  // Convert stock/min-order from entered unit to base unit
  const { toBaseUnits } = await import("@/lib/units");
  const stockBase = toBaseUnits(stockEntered, stockUnit);
  const minOrderBase = toBaseUnits(minOrderEntered, minUnit);

  const categoryId = formData.get("categoryId") as string | null;

  await db.insert(products).values({
    sku: formData.get("sku") as string,
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    categoryId: categoryId || null,
    dimension: formData.get("dimension") as string,
    baseUnit: formData.get("baseUnit") as string,
    displayUnit,
    pricePerBaseUnit: pricePerBaseUnit.toFixed(6),
    stockQuantity: stockBase.toFixed(6),
    minOrderQuantity: minOrderBase.toFixed(6),
    isActive: true,
  });

  revalidatePath("/admin/products");
  revalidatePath("/seller/products");
}

// ─── Admin: Update ────────────────────────────────────────────────────────────

export async function updateProduct(id: string, formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const displayUnit = formData.get("displayUnit") as AnyUnit;
  const priceEntered = parseFloat(formData.get("priceEntered") as string);
  const stockEntered = parseFloat(formData.get("stockEntered") as string);
  const minOrderEntered = parseFloat(formData.get("minOrderEntered") as string);
  const stockUnit = formData.get("stockUnit") as AnyUnit;
  const minUnit = formData.get("minUnit") as AnyUnit;

  const pricePerBaseUnit = toBasePricePerUnit(priceEntered, displayUnit);
  const { toBaseUnits } = await import("@/lib/units");
  const stockBase = toBaseUnits(stockEntered, stockUnit);
  const minOrderBase = toBaseUnits(minOrderEntered, minUnit);

  const categoryId = formData.get("categoryId") as string | null;

  await db
    .update(products)
    .set({
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      categoryId: categoryId || null,
      displayUnit,
      pricePerBaseUnit: pricePerBaseUnit.toFixed(6),
      stockQuantity: stockBase.toFixed(6),
      minOrderQuantity: minOrderBase.toFixed(6),
      isActive: formData.get("isActive") === "true",
      updatedAt: new Date(),
    })
    .where(eq(products.id, id));

  revalidatePath("/admin/products");
  revalidatePath("/seller/products");
}

// ─── Admin: Delete ────────────────────────────────────────────────────────────

export async function deleteProduct(id: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  // Soft delete
  await db
    .update(products)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(products.id, id));

  revalidatePath("/admin/products");
  revalidatePath("/seller/products");
}

// ─── Admin: Category CRUD ─────────────────────────────────────────────────────

export async function createCategory(name: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  await db.insert(categories).values({ name });
  revalidatePath("/admin/products");
  revalidatePath("/seller/products");
}

export async function deleteCategory(id: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath("/admin/products");
}
