import { getCityComparison } from "@/lib/audit/queries";
import type { AuditComparisonItem, AuditWindowDays } from "@/lib/audit/types";
import type { FuelType } from "@/lib/types";

export async function getComparableCities(fuelType: FuelType, days: AuditWindowDays) {
  const items = await getCityComparison(fuelType, days);
  return items.sort((left, right) => (right.medianPrice ?? Infinity) - (left.medianPrice ?? Infinity) || right.coverageRatio - left.coverageRatio || left.city.localeCompare(right.city));
}

export function summarizeComparison(items: AuditComparisonItem[]) {
  if (items.length === 0) {
    return {
      leadingCity: null,
      trailingCity: null,
      spread: null
    };
  }

  const sorted = [...items].sort((left, right) => (left.medianPrice ?? Infinity) - (right.medianPrice ?? Infinity));
  const leading = sorted[0] ?? null;
  const trailing = sorted.at(-1) ?? null;
  return {
    leadingCity: leading,
    trailingCity: trailing,
    spread: leading && trailing && leading.medianPrice !== null && trailing.medianPrice !== null ? trailing.medianPrice - leading.medianPrice : null
  };
}
