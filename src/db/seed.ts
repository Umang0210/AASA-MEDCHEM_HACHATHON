/**
 * db/seed.ts
 * ==========
 * Seeds the database with:
 *   - 1 admin user (admin@inventory.com / admin123)
 *   - 2 seller users
 *   - 5 categories
 *   - 12 products across weight, volume, and count dimensions
 *
 * Run with: npx tsx src/db/seed.ts
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import bcrypt from "bcryptjs";
import { toBasePricePerUnit } from "../lib/units";

// Load env manually for the seed script
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  console.log("🌱 Seeding database...\n");

  // -------------------------------------------------------------------------
  // USERS
  // -------------------------------------------------------------------------
  const adminHash = await bcrypt.hash("admin123", 10);
  const sellerHash = await bcrypt.hash("seller123", 10);

  const [admin] = await db
    .insert(schema.users)
    .values([
      {
        name: "Admin User",
        email: "admin@inventory.com",
        passwordHash: adminHash,
        role: "admin",
      },
    ])
    .onConflictDoNothing()
    .returning();

  const sellers = await db
    .insert(schema.users)
    .values([
      {
        name: "Priya Sharma",
        email: "priya@seller.com",
        passwordHash: sellerHash,
        role: "seller",
      },
      {
        name: "Ravi Mehta",
        email: "ravi@seller.com",
        passwordHash: sellerHash,
        role: "seller",
      },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`✅ Users seeded (admin: admin@inventory.com / admin123)`);
  console.log(`✅ Sellers: priya@seller.com / seller123, ravi@seller.com / seller123`);

  // -------------------------------------------------------------------------
  // CATEGORIES
  // -------------------------------------------------------------------------
  const categoryData = [
    { name: "Grains & Cereals" },
    { name: "Spices & Condiments" },
    { name: "Dairy & Beverages" },
    { name: "Oils & Ghee" },
    { name: "Packaged Goods" },
  ];

  const cats = await db
    .insert(schema.categories)
    .values(categoryData)
    .onConflictDoNothing()
    .returning();

  const catMap = Object.fromEntries(cats.map((c) => [c.name, c.id]));
  console.log(`✅ ${cats.length} categories seeded`);

  // -------------------------------------------------------------------------
  // PRODUCTS
  // -------------------------------------------------------------------------
  // pricePerBaseUnit = INR per 1 base unit (g, ml, or item)
  // Use toBasePricePerUnit(price, displayUnit) to convert from "₹X per kg" etc.
  const productData = [
    // --- WEIGHT products (base unit: g) ---
    {
      sku: "GRAIN-001",
      name: "Basmati Rice (Premium)",
      description: "Long-grain aromatic basmati rice from Punjab",
      categoryId: catMap["Grains & Cereals"],
      dimension: "weight",
      baseUnit: "g",
      displayUnit: "kg",
      // ₹80 per kg → per gram
      pricePerBaseUnit: toBasePricePerUnit(80, "kg").toFixed(6),
      stockQuantity: String(500_000), // 500 kg in grams
      minOrderQuantity: String(toBasePricePerUnit(1, "kg")), // 1 kg min
    },
    {
      sku: "GRAIN-002",
      name: "Whole Wheat Flour (Atta)",
      description: "Stone-ground whole wheat flour",
      categoryId: catMap["Grains & Cereals"],
      dimension: "weight",
      baseUnit: "g",
      displayUnit: "kg",
      pricePerBaseUnit: toBasePricePerUnit(45, "kg").toFixed(6), // ₹45/kg
      stockQuantity: String(200_000), // 200 kg
      minOrderQuantity: String(toBasePricePerUnit(2, "kg")), // 2 kg min
    },
    {
      sku: "SPICE-001",
      name: "Turmeric Powder (Haldi)",
      description: "Pure Erode turmeric, high curcumin content",
      categoryId: catMap["Spices & Condiments"],
      dimension: "weight",
      baseUnit: "g",
      displayUnit: "g",
      pricePerBaseUnit: toBasePricePerUnit(0.18, "g").toFixed(6), // ₹180/kg = ₹0.18/g
      stockQuantity: String(50_000), // 50 kg
      minOrderQuantity: String(100), // 100g min
    },
    {
      sku: "SPICE-002",
      name: "Red Chilli Powder",
      description: "Medium-hot Kashmiri red chilli powder",
      categoryId: catMap["Spices & Condiments"],
      dimension: "weight",
      baseUnit: "g",
      displayUnit: "g",
      pricePerBaseUnit: toBasePricePerUnit(0.22, "g").toFixed(6), // ₹220/kg
      stockQuantity: String(30_000),
      minOrderQuantity: String(100),
    },
    {
      sku: "SPICE-003",
      name: "Saffron (Kesar)",
      description: "Premium Kashmiri saffron strands",
      categoryId: catMap["Spices & Condiments"],
      dimension: "weight",
      baseUnit: "g",
      displayUnit: "g",
      pricePerBaseUnit: toBasePricePerUnit(500, "g").toFixed(6), // ₹500/g
      stockQuantity: String(500), // 500g
      minOrderQuantity: String(1), // 1g min
    },
    // --- VOLUME products (base unit: ml) ---
    {
      sku: "OIL-001",
      name: "Cold-Pressed Groundnut Oil",
      description: "Traditional cold-pressed peanut oil",
      categoryId: catMap["Oils & Ghee"],
      dimension: "volume",
      baseUnit: "ml",
      displayUnit: "L",
      pricePerBaseUnit: toBasePricePerUnit(180, "L").toFixed(6), // ₹180/L
      stockQuantity: String(500_000), // 500 L
      minOrderQuantity: String(1000), // 1 L min
    },
    {
      sku: "OIL-002",
      name: "Desi Cow Ghee",
      description: "A2 milk grass-fed cow ghee",
      categoryId: catMap["Oils & Ghee"],
      dimension: "volume",
      baseUnit: "ml",
      displayUnit: "L",
      pricePerBaseUnit: toBasePricePerUnit(750, "L").toFixed(6), // ₹750/L
      stockQuantity: String(100_000), // 100 L
      minOrderQuantity: String(500), // 500 mL min
    },
    {
      sku: "DAI-001",
      name: "Full-Cream Milk",
      description: "Fresh pasteurized full-cream milk",
      categoryId: catMap["Dairy & Beverages"],
      dimension: "volume",
      baseUnit: "ml",
      displayUnit: "L",
      pricePerBaseUnit: toBasePricePerUnit(68, "L").toFixed(6), // ₹68/L
      stockQuantity: String(1_000_000), // 1000 L
      minOrderQuantity: String(1000), // 1 L min
    },
    {
      sku: "DAI-002",
      name: "Coconut Water",
      description: "Natural tender coconut water",
      categoryId: catMap["Dairy & Beverages"],
      dimension: "volume",
      baseUnit: "ml",
      displayUnit: "ml",
      pricePerBaseUnit: toBasePricePerUnit(0.08, "ml").toFixed(6), // ₹80/L = ₹0.08/ml
      stockQuantity: String(200_000), // 200 L
      minOrderQuantity: String(200), // 200 mL min
    },
    // --- COUNT products (base unit: item) ---
    {
      sku: "PKG-001",
      name: "Organic Eggs (Farm Fresh)",
      description: "Free-range organic eggs",
      categoryId: catMap["Packaged Goods"],
      dimension: "count",
      baseUnit: "item",
      displayUnit: "item",
      pricePerBaseUnit: toBasePricePerUnit(12, "item").toFixed(6), // ₹12/egg
      stockQuantity: String(5000),
      minOrderQuantity: String(6), // 6 eggs min
    },
    {
      sku: "PKG-002",
      name: "Amul Butter (500g pack)",
      description: "Amul pasteurised butter, 500g pack",
      categoryId: catMap["Packaged Goods"],
      dimension: "count",
      baseUnit: "item",
      displayUnit: "item",
      pricePerBaseUnit: toBasePricePerUnit(280, "item").toFixed(6), // ₹280/pack
      stockQuantity: String(1000),
      minOrderQuantity: String(1),
    },
    {
      sku: "GRAIN-003",
      name: "Toor Dal (Split Pigeon Peas)",
      description: "Premium Maharashtrian toor dal",
      categoryId: catMap["Grains & Cereals"],
      dimension: "weight",
      baseUnit: "g",
      displayUnit: "kg",
      pricePerBaseUnit: toBasePricePerUnit(120, "kg").toFixed(6), // ₹120/kg
      stockQuantity: String(300_000), // 300 kg
      minOrderQuantity: String(500), // 500g min
    },
  ];

  const insertedProducts = await db
    .insert(schema.products)
    .values(productData as typeof schema.products.$inferInsert[])
    .onConflictDoNothing()
    .returning();

  console.log(`✅ ${insertedProducts.length} products seeded`);
  console.log("\n🎉 Seed complete!\n");
  console.log("Test credentials:");
  console.log("  Admin:  admin@inventory.com  /  admin123");
  console.log("  Seller: priya@seller.com     /  seller123");
  console.log("  Seller: ravi@seller.com      /  seller123");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
