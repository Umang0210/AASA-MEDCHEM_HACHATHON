/**
 * lib/formatters.ts
 * =================
 * Formatting utilities for INR currency and dates.
 */

/**
 * Format a number as Indian Rupees.
 * Uses the en-IN locale with INR currency symbol (₹).
 *
 * @param amount - numeric INR amount
 * @param decimals - decimal places (default 2)
 */
export function formatINR(amount: number | string, decimals = 2): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format a date as a readable Indian-locale string.
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Format a date as short date only (no time).
 */
export function formatDateShort(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Status badge color mapping for quotations and orders.
 */
export const QUOTATION_STATUS_COLORS: Record<string, string> = {
  draft: "badge-gray",
  submitted: "badge-blue",
  approved: "badge-green",
  rejected: "badge-red",
  fulfilled: "badge-purple",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  processing: "badge-blue",
  shipped: "badge-yellow",
  delivered: "badge-green",
  cancelled: "badge-red",
};

export const QUOTATION_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  fulfilled: "Fulfilled",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
