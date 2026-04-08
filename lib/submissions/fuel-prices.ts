import type { FuelType } from "@/lib/types";

export const submissionFuelOptions: FuelType[] = [
  "gasolina_comum",
  "gasolina_aditivada",
  "etanol",
  "diesel_s10",
  "diesel_comum",
  "gnv"
];

export type FuelPriceMap = Partial<Record<FuelType, string>>;

export interface FuelPriceEntry {
  fuelType: FuelType;
  price: string;
}

export function isFuelType(value: string): value is FuelType {
  return submissionFuelOptions.includes(value as FuelType);
}

export function createEmptyFuelPriceMap(): FuelPriceMap {
  return submissionFuelOptions.reduce<FuelPriceMap>((acc, fuelType) => {
    acc[fuelType] = "";
    return acc;
  }, {});
}

export function normalizeFuelPriceMap(
  input?: FuelPriceMap | null,
  legacyFuelType?: FuelType | null,
  legacyPrice?: string | null
) {
  const next = createEmptyFuelPriceMap();

  submissionFuelOptions.forEach((fuelType) => {
    const value = input?.[fuelType];
    next[fuelType] = typeof value === "string" ? value.trim() : "";
  });

  if (legacyFuelType && typeof legacyPrice === "string" && legacyPrice.trim() && !next[legacyFuelType]) {
    next[legacyFuelType] = legacyPrice.trim();
  }

  return next;
}

export function getFilledFuelPriceEntries(input?: FuelPriceMap | null) {
  return submissionFuelOptions.flatMap<FuelPriceEntry>((fuelType) => {
    const price = input?.[fuelType]?.trim() ?? "";
    return price ? [{ fuelType, price }] : [];
  });
}

export function getPrimaryFuelSelection(input: FuelPriceMap | null | undefined, fallbackFuelType: FuelType) {
  const filled = getFilledFuelPriceEntries(input);
  if (filled.length > 0) {
    return filled[0];
  }

  return {
    fuelType: fallbackFuelType,
    price: input?.[fallbackFuelType]?.trim() ?? ""
  };
}

export function countFilledFuelPrices(input?: FuelPriceMap | null) {
  return getFilledFuelPriceEntries(input).length;
}

export function parseSerializedFuelPriceEntries(value: string | null | undefined) {
  if (!value) {
    return [] as FuelPriceEntry[];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const seen = new Set<FuelType>();
    const entries: FuelPriceEntry[] = [];

    parsed.forEach((item) => {
      if (!item || typeof item !== "object") {
        return;
      }

      const fuelType = typeof (item as { fuelType?: unknown }).fuelType === "string"
        ? (item as { fuelType: string }).fuelType
        : "";
      const price = typeof (item as { price?: unknown }).price === "string"
        ? (item as { price: string }).price.trim()
        : "";

      if (!isFuelType(fuelType) || !price || seen.has(fuelType)) {
        return;
      }

      seen.add(fuelType);
      entries.push({ fuelType, price });
    });

    return entries;
  } catch {
    return [] as FuelPriceEntry[];
  }
}
