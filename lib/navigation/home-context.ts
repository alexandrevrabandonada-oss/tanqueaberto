import type { FuelFilter, RecencyFilter, StationPresenceFilter } from "@/lib/filters/public";

const HOME_CONTEXT_STORAGE_KEY = "bomba-aberta:home-context:v2";
const LAST_STATION_STORAGE_KEY = "bomba-aberta:last-station:v2";

export const priorityCities = ["Volta Redonda", "Barra Mansa", "Barra do Piraí"] as const;

export interface HomeContextSnapshot {
  query: string;
  city: string;
  fuelFilter: FuelFilter;
  recencyFilter: RecencyFilter;
  presenceFilter: StationPresenceFilter;
}

export interface LastStationSnapshot {
  id: string;
  name: string;
  city: string;
}

function safeParse<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function normalizeContextValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export function isPriorityCity(city: string) {
  const normalizedCity = normalizeContextValue(city);
  return priorityCities.some((item) => normalizeContextValue(item) === normalizedCity);
}

export function readHomeContext(): Partial<HomeContextSnapshot> {
  if (typeof window === "undefined") {
    return {};
  }

  const parsed = safeParse<Partial<HomeContextSnapshot>>(window.localStorage.getItem(HOME_CONTEXT_STORAGE_KEY));
  if (!parsed) {
    return {};
  }

  return {
    query: typeof parsed.query === "string" ? parsed.query : "",
    city: typeof parsed.city === "string" ? parsed.city : "",
    fuelFilter: parsed.fuelFilter,
    recencyFilter: parsed.recencyFilter,
    presenceFilter: parsed.presenceFilter
  };
}

export function persistHomeContext(snapshot: HomeContextSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(HOME_CONTEXT_STORAGE_KEY, JSON.stringify(snapshot));
}

export function readLastStationContext(): LastStationSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  return safeParse<LastStationSnapshot>(window.localStorage.getItem(LAST_STATION_STORAGE_KEY));
}

export function rememberStationVisit(station: LastStationSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  const currentHome = readHomeContext();
  window.localStorage.setItem(LAST_STATION_STORAGE_KEY, JSON.stringify(station));
  window.localStorage.setItem(
    HOME_CONTEXT_STORAGE_KEY,
    JSON.stringify({
      query: currentHome.query ?? "",
      city: station.city || currentHome.city || "",
      fuelFilter: currentHome.fuelFilter ?? "all",
      recencyFilter: currentHome.recencyFilter ?? "all",
      presenceFilter: currentHome.presenceFilter ?? "all"
    })
  );
}
