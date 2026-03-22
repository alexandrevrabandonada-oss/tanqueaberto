import type { FuelType, PriceReport, StationWithReports, ReportWithStation } from "@/lib/types";

export type FuelFilter = "all" | FuelType;
export type RecencyFilter = "all" | "24h" | "48h";

export interface SearchableStation {
  name: string;
  brand: string;
  city: string;
  neighborhood: string;
  address: string;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function matchesSearchTerm(station: SearchableStation, query: string) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return true;
  }

  return [station.name, station.brand, station.city, station.neighborhood, station.address]
    .filter(Boolean)
    .some((value) => normalize(value).includes(normalizedQuery));
}

export function isWithinHours(reportedAt: string, hours: number, referenceDate = new Date()) {
  const diffHours = (referenceDate.getTime() - new Date(reportedAt).getTime()) / 3_600_000;
  return diffHours <= hours;
}

export function matchesRecencyFilter(reportedAt: string, filter: RecencyFilter, referenceDate = new Date()) {
  if (filter === "all") {
    return true;
  }

  return isWithinHours(reportedAt, filter === "24h" ? 24 : 48, referenceDate);
}

export function getSelectedStationReport(station: StationWithReports, fuelFilter: FuelFilter) {
  if (fuelFilter === "all") {
    return station.latestReports[0] ?? null;
  }

  return station.recentReports.find((report) => report.fuelType === fuelFilter) ?? null;
}

export function filterStations(stations: StationWithReports[], query: string, fuelFilter: FuelFilter, recencyFilter: RecencyFilter) {
  return stations.filter((station) => {
    if (!matchesSearchTerm(station, query)) {
      return false;
    }

    const report = getSelectedStationReport(station, fuelFilter);
    if (!report) {
      return false;
    }

    return matchesRecencyFilter(report.reportedAt, recencyFilter);
  });
}

export function filterReports(reports: ReportWithStation[], query: string, fuelFilter: FuelFilter, recencyFilter: RecencyFilter) {
  return reports.filter((report) => {
    if (!matchesSearchTerm({ ...report.station, address: "" }, query)) {
      return false;
    }

    if (fuelFilter !== "all" && report.fuelType !== fuelFilter) {
      return false;
    }

    return matchesRecencyFilter(report.reportedAt, recencyFilter);
  });
}

export function getStationCheapestReports(stations: StationWithReports[], fuelFilter: FuelFilter) {
  return stations
    .map((station) => {
      const selected = getSelectedStationReport(station, fuelFilter);
      return selected ? { station, report: selected } : null;
    })
    .filter((item): item is { station: StationWithReports; report: PriceReport } => Boolean(item))
    .sort((left, right) => left.report.price - right.report.price)
    .slice(0, 3);
}
