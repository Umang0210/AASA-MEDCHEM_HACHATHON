/**
 * lib/units.ts
 * ============
 * SINGLE SOURCE OF TRUTH for all unit conversion logic.
 *
 * Storage strategy:
 * - Weight    → canonical: grams (g)
 * - Volume    → canonical: milliliters (mL)
 * - Count     → canonical: items (item)
 *
 * Prices are stored as INR per 1 canonical unit:
 *   e.g., Rice at ₹80/kg → stored as 0.08 (INR per gram)
 *
 * Conversions are pure functions — no side effects, easily testable.
 */

export type Dimension = "weight" | "volume" | "count";
export type WeightUnit = "g" | "kg";
export type VolumeUnit = "ml" | "L";
export type CountUnit = "item";
export type AnyUnit = WeightUnit | VolumeUnit | CountUnit;

// All units available per dimension
export const UNITS_BY_DIMENSION: Record<Dimension, AnyUnit[]> = {
  weight: ["g", "kg"],
  volume: ["ml", "L"],
  count: ["item"],
};

// Human-readable labels
export const UNIT_LABELS: Record<AnyUnit, string> = {
  g: "grams (g)",
  kg: "kilograms (kg)",
  ml: "milliliters (mL)",
  L: "liters (L)",
  item: "items (unit)",
};

export const UNIT_SHORT: Record<AnyUnit, string> = {
  g: "g",
  kg: "kg",
  ml: "mL",
  L: "L",
  item: "unit",
};

// Canonical (base) unit per dimension
export const BASE_UNIT: Record<Dimension, AnyUnit> = {
  weight: "g",
  volume: "ml",
  count: "item",
};

/**
 * Conversion factors: how many base units is 1 of this unit?
 * e.g., 1 kg = 1000 g  → factor = 1000
 *       1 g  = 1 g     → factor = 1
 *       1 L  = 1000 mL → factor = 1000
 *       1 mL = 1 mL    → factor = 1
 *       1 item = 1 item → factor = 1
 */
export const TO_BASE_FACTOR: Record<AnyUnit, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  L: 1000,
  item: 1,
};

/**
 * Convert a quantity from any unit to its canonical base unit.
 *
 * @param quantity  - the numeric amount (as entered by user)
 * @param unit      - the unit the quantity is expressed in
 * @returns quantity expressed in canonical base units
 *
 * Example:
 *   toBaseUnits(2.5, 'kg') → 2500   (grams)
 *   toBaseUnits(500, 'ml') → 500    (mL)
 *   toBaseUnits(1.5, 'L')  → 1500   (mL)
 */
export function toBaseUnits(quantity: number, unit: AnyUnit): number {
  return quantity * TO_BASE_FACTOR[unit];
}

/**
 * Convert a quantity from base units to a specified display unit.
 *
 * @param baseQuantity - the amount in canonical base units
 * @param toUnit       - the target display unit
 * @returns quantity in the target unit
 *
 * Example:
 *   fromBaseUnits(2500, 'kg') → 2.5
 *   fromBaseUnits(1500, 'L')  → 1.5
 */
export function fromBaseUnits(baseQuantity: number, toUnit: AnyUnit): number {
  return baseQuantity / TO_BASE_FACTOR[toUnit];
}

/**
 * Calculate the line total (INR) for a given ordered quantity.
 *
 * @param orderedQuantity    - amount entered by seller
 * @param orderedUnit        - unit of the ordered quantity
 * @param pricePerBaseUnit   - INR per canonical base unit (from product)
 * @returns total price in INR (as a number with up to 6 decimal places)
 *
 * Example:
 *   Rice: pricePerBaseUnit = 0.08 (₹0.08/g), ordered 2.5 kg
 *   calculateLineTotal(2.5, 'kg', 0.08) → 200 (₹200)
 */
export function calculateLineTotal(
  orderedQuantity: number,
  orderedUnit: AnyUnit,
  pricePerBaseUnit: number
): number {
  const baseQty = toBaseUnits(orderedQuantity, orderedUnit);
  return baseQty * pricePerBaseUnit;
}

/**
 * Get the "display price" for a product in a user-friendly unit.
 * e.g., show "₹80 per kg" even though internally stored as ₹0.08/g
 *
 * @param pricePerBaseUnit - INR per 1 base unit (as stored in DB)
 * @param displayUnit      - the unit to express the price in
 * @returns price per 1 displayUnit in INR
 *
 * Example:
 *   priceInUnit(0.08, 'kg') → 80     (₹80/kg)
 *   priceInUnit(0.08, 'g')  → 0.08   (₹0.08/g)
 *   priceInUnit(2.5,  'L')  → 2500   (₹2500/L)
 */
export function priceInUnit(
  pricePerBaseUnit: number,
  displayUnit: AnyUnit
): number {
  return pricePerBaseUnit * TO_BASE_FACTOR[displayUnit];
}

/**
 * Convert a price expressed per displayUnit to the canonical per-base-unit price.
 * Use this when SAVING a product — the admin enters "₹80 per kg", we store 0.08/g.
 *
 * @param pricePerDisplayUnit - price per 1 display unit (as entered by admin)
 * @param displayUnit         - unit the admin entered price in
 * @returns price per 1 base unit (INR)
 *
 * Example:
 *   toBasePricePerUnit(80, 'kg')  → 0.08
 *   toBasePricePerUnit(2.5, 'L')  → 0.0025
 *   toBasePricePerUnit(150, 'item') → 150
 */
export function toBasePricePerUnit(
  pricePerDisplayUnit: number,
  displayUnit: AnyUnit
): number {
  return pricePerDisplayUnit / TO_BASE_FACTOR[displayUnit];
}

/**
 * Format a quantity for display, rounding to reasonable decimal places.
 */
export function formatQuantity(quantity: number, unit: AnyUnit): string {
  const decimals = unit === "item" ? 0 : 4;
  const rounded = parseFloat(quantity.toFixed(decimals));
  return `${rounded} ${UNIT_SHORT[unit]}`;
}
