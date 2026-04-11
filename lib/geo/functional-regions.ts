import { normalizeContextValue } from "@/lib/navigation/home-context";

export interface FunctionalRegion {
  id: string;
  label: string;
  cities: string[];
}

const FUNCTIONAL_REGIONS: FunctionalRegion[] = [
  {
    id: "eixo-sul-fluminense",
    label: "Volta Redonda + Barra Mansa + Barra do Pirai",
    cities: ["Volta Redonda", "Barra Mansa", "Barra do Piraí"]
  }
];

function normalizeCity(value: string) {
  return normalizeContextValue(value);
}

export function getFunctionalRegion(city: string): FunctionalRegion | null {
  const normalizedCity = normalizeCity(city);
  if (!normalizedCity) {
    return null;
  }

  return FUNCTIONAL_REGIONS.find((region) => region.cities.some((item) => normalizeCity(item) === normalizedCity)) ?? null;
}

export function getFunctionalRegionCities(city: string): string[] {
  const region = getFunctionalRegion(city);
  return region ? region.cities : (city ? [city] : []);
}

export function isCityInFunctionalRegion(city: string, referenceCity: string) {
  const allowedCities = new Set(getFunctionalRegionCities(referenceCity).map((item) => normalizeCity(item)));
  if (allowedCities.size === 0) {
    return false;
  }

  return allowedCities.has(normalizeCity(city));
}

export function filterItemsToFunctionalRegion<T extends { city: string }>(items: T[], referenceCity: string) {
  if (!referenceCity) {
    return items;
  }

  return items.filter((item) => isCityInFunctionalRegion(item.city, referenceCity));
}
