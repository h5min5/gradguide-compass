import type { CurrencyCode } from "./types";

/**
 * Approximate rates used only to compare a budget with a published fee.
 * They are not a university invoice conversion.
 */
export const EUR_PER_UNIT: Record<CurrencyCode, number> = {
  EUR: 1,
  GBP: 1.17,
  USD: 0.92,
};

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
