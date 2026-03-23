import { getSelectedStationReport, type FuelFilter } from "@/lib/filters/public";
import { isPriorityCity, normalizeContextValue, priorityCities } from "@/lib/navigation/home-context";
import { getRecencyTone } from "@/lib/format/time";
import type { StationWithReports } from "@/lib/types";

interface SortOptions {
  cityFilter?: string;
  fuelFilter?: FuelFilter;
}

function getCityBias(city: string, selectedCity?: string) {
  if (selectedCity && normalizeContextValue(city) === normalizeContextValue(selectedCity)) {
    return 1_000;
  }

  const priorityIndex = priorityCities.findIndex((candidate) => normalizeContextValue(candidate) === normalizeContextValue(city));
  if (priorityIndex >= 0) {
    return 500 - priorityIndex * 50;
  }

  if (isPriorityCity(city)) {
    return 350;
  }

  return 0;
}

function getRecencyBoost(station: StationWithReports, fuelFilter: FuelFilter) {
  const report = getSelectedStationReport(station, fuelFilter);
  if (!report) {
    return 0;
  }

  const tone = getRecencyTone(report.reportedAt);
  if (tone === "fresh") {
    return 220;
  }

  if (tone === "warning") {
    return 120;
  }

  return 20;
}

function getLatestAgeBoost(station: StationWithReports) {
  const latest = station.latestReports[0];
  if (!latest) {
    return 0;
  }

  const ageHours = (Date.now() - new Date(latest.reportedAt).getTime()) / 3_600_000;
  if (!Number.isFinite(ageHours)) {
    return 0;
  }

  return Math.max(0, 180 - Math.min(180, ageHours * 6));
}

export function sortStationsForPublicView(stations: StationWithReports[], options: SortOptions = {}) {
  const selectedCity = options.cityFilter ?? "";
  const fuelFilter = options.fuelFilter ?? "all";

  return [...stations].sort((left, right) => {
    const leftCity = getCityBias(left.city, selectedCity);
    const rightCity = getCityBias(right.city, selectedCity);
    if (leftCity !== rightCity) {
      return rightCity - leftCity;
    }

    const leftRecency = getRecencyBoost(left, fuelFilter);
    const rightRecency = getRecencyBoost(right, fuelFilter);
    if (leftRecency !== rightRecency) {
      return rightRecency - leftRecency;
    }

    const leftLatest = getLatestAgeBoost(left);
    const rightLatest = getLatestAgeBoost(right);
    if (leftLatest !== rightLatest) {
      return rightLatest - leftLatest;
    }

    const leftPriority = left.priorityScore ?? 0;
    const rightPriority = right.priorityScore ?? 0;
    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority;
    }

    const cityCompare = left.city.localeCompare(right.city, "pt-BR");
    if (cityCompare !== 0) {
      return cityCompare;
    }

    const neighborhoodCompare = left.neighborhood.localeCompare(right.neighborhood, "pt-BR");
    if (neighborhoodCompare !== 0) {
      return neighborhoodCompare;
    }

    return left.name.localeCompare(right.name, "pt-BR");
  });
}
