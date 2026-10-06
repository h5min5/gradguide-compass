import type { CurrencyCode } from "./types";

/**
 * Approximate rates used only to compare a budget with a published fee.
 * They are not a university invoice conversion.
 */
export const EUR_PER_UNIT: Record<CurrencyCode, number> = {
  EUR: 1,
  GBP: 1.17,
  USD: 0.92,
  AUD: 0.6,
  CAD: 0.66,
  INR: 0.0104,
};

/** Shown wherever a budget is compared with a published fee. */
export const FX_COMPARISON_NOTE =
  "Budget fit uses approximate rates of 1 GBP = 1.17 EUR, 1 USD = 0.92 EUR, 1 AUD = 0.60 EUR, 1 CAD = 0.66 EUR, and 1 INR = 0.0104 EUR. Cards still show the fee in the currency printed by the university.";

export function toEur(
  amount: number,
  currency: CurrencyCode | null,
): number | null {
  if (!currency || !Number.isFinite(amount)) return null;
  return amount * EUR_PER_UNIT[currency];
}

export function formatMoney(
  amount: number | null,
  currency: CurrencyCode | null,
): string {
  if (amount == null || !currency) return "Not captured";
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDuration(months: number | null): string {
  if (months == null) return "Not captured";
  if (months === 12) return "12 months";
  return `${months} months`;
}
