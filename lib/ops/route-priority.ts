import { computeStationPriorityScore } from "@/lib/quality/stations";
import { hasRecentStationPriceForFilter } from "@/lib/filters/public";
import type { RouteContext } from "@/lib/navigation/route-context";
import type { FuelType, StationWithReports } from "@/lib/types";

export function getNextPriorityStation(
  stations: StationWithReports[],
  context: RouteContext,
  currentStationId: string | null
): StationWithReports | null {
  if (!context.active) return null;

  const fuelFilter = context.fuelFilter === "all" ? "gasolina_comum" : (context.fuelFilter as FuelType);

  // Filter candidates
  const candidates = stations.filter((station) => {
    // Basic context filtering
    if (context.city && station.city.toUpperCase() !== context.city.toUpperCase()) return false;
    // Note: groupId filtering would require station.groupId which might not exist directly yet
    // For now we use city as the primary route boundary as requested in the "simple" rules.

    // Exclude exclusions
    if (station.id === currentStationId) return false;
    if (context.skippedStationIds.includes(station.id)) return false;
    if (context.completedStationIds.includes(station.id)) return false;

    // Must be a "gap" (no recent price for this fuel)
    if (hasRecentStationPriceForFilter(station, fuelFilter)) return false;

    return true;
  });

  if (candidates.length === 0) return null;

  // Rank candidates
  const ranked = candidates.map((station) => {
    const score = computeStationPriorityScore({
      city: station.city,
      geoConfidence: station.geoConfidence,
      hasRecentReport: false, // We already filtered for GAPs
      reportCount: station.latestReports.length,
      isReviewed: station.geoReviewStatus === "ok"
    });

    return { station, score };
  });

  // Sort by score descending
  ranked.sort((a, b) => b.score - a.score);

  return ranked[0]?.station ?? null;
}
