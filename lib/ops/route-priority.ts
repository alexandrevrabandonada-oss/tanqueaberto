import { computeStationPriorityScore } from "@/lib/quality/stations";
import { hasRecentStationPriceForFilter } from "@/lib/filters/public";
import type { RouteContext } from "@/lib/navigation/route-context";
import { calculateDistance } from "@/lib/geo/distance";
import type { FuelType, StationWithReports } from "@/lib/types";
import { isValidStationCoordinate } from "@/lib/quality/stations";

interface RouteLocation {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  trustStatus: "confiável" | "provável" | "incerto";
}

export function getNextPriorityStation(
  stations: StationWithReports[],
  context: RouteContext,
  currentStationId: string | null,
  userLocation?: RouteLocation | null
): StationWithReports | null {
  if (!context.active) return null;

  const fuelFilter = context.fuelFilter === "all" ? "gasolina_comum" : (context.fuelFilter as FuelType);

  // Filter candidates
  const candidates = stations.filter((station) => {
    // Basic context filtering
    if (context.city && station.city.toUpperCase() !== context.city.toUpperCase()) return false;

    // Exclude exclusions
    if (station.id === currentStationId) return false;
    if (context.skippedStationIds.includes(station.id)) return false;
    if (context.completedStationIds.includes(station.id)) return false;

    // Must be a "gap" (no recent price for this fuel)
    if (hasRecentStationPriceForFilter(station, fuelFilter)) return false;

    return true;
  });

  if (candidates.length === 0) return null;

  const speedKmh = Math.max(0, Number(userLocation?.speed ?? 0) * 3.6);
  const canTrustProximity = Boolean(userLocation && userLocation.trustStatus !== "incerto");
  const arrivalRadiusMeters = userLocation ? Math.min(450, Math.max(180, Math.round(userLocation.accuracy * 3))) : 220;
  const retainTargetRadiusMeters = Math.max(650, arrivalRadiusMeters * 2);
  const localRadiusMeters = !canTrustProximity
    ? null
    : speedKmh >= 70
      ? 2200
      : speedKmh >= 40
        ? 1600
        : 1000;

  const ranked = candidates.map((station) => {
    const score = computeStationPriorityScore({
      city: station.city,
      geoConfidence: station.geoConfidence,
      hasRecentReport: false, // We already filtered for GAPs
      reportCount: station.latestReports.length,
      isReviewed: station.geoReviewStatus === "ok"
    });

    let distance: number | null = null;
    if (userLocation && isValidStationCoordinate(station.lat, station.lng)) {
      distance = calculateDistance(userLocation.lat, userLocation.lng, station.lat, station.lng);
    }

    let distanceBoost = 0;
    if (distance !== null) {
      if (distance <= arrivalRadiusMeters) {
        distanceBoost += 160;
      } else if (localRadiusMeters !== null && distance <= localRadiusMeters) {
        distanceBoost += Math.max(45, 110 - Math.round(distance / 35));
      } else {
        distanceBoost += Math.max(0, 28 - Math.round(distance / 300));
      }
    }

    const geoQualityBoost = station.geoReviewStatus === "ok"
      ? 18
      : station.geoConfidence === "high"
        ? 12
        : station.geoConfidence === "medium"
          ? 6
          : 0;

    return {
      station: {
        ...station,
        distance: distance ?? station.distance
      },
      score: score + distanceBoost + geoQualityBoost,
      distance
    };
  });

  const lockedCandidate = context.targetStationId
    ? ranked.find((candidate) => candidate.station.id === context.targetStationId) ?? null
    : null;

  if (lockedCandidate) {
    if (!canTrustProximity) {
      return lockedCandidate.station;
    }

    if (lockedCandidate.distance !== null && lockedCandidate.distance <= retainTargetRadiusMeters) {
      return lockedCandidate.station;
    }
  }

  if (canTrustProximity) {
    const arrivalCandidates = ranked
      .filter((candidate) => candidate.distance !== null && (candidate.distance ?? Infinity) <= arrivalRadiusMeters)
      .sort((left, right) => (left.distance ?? Infinity) - (right.distance ?? Infinity) || right.score - left.score);

    if (arrivalCandidates.length > 0) {
      return arrivalCandidates[0]?.station ?? null;
    }

    const localCandidates = ranked
      .filter((candidate) => localRadiusMeters !== null && candidate.distance !== null && (candidate.distance ?? Infinity) <= localRadiusMeters)
      .sort((left, right) => {
        const distanceDelta = (left.distance ?? Infinity) - (right.distance ?? Infinity);
        if (Math.abs(distanceDelta) > 120) {
          return distanceDelta;
        }
        return right.score - left.score;
      });

    if (localCandidates.length > 0) {
      if (
        lockedCandidate
        && lockedCandidate.distance !== null
        && localCandidates[0]?.distance !== null
        && (lockedCandidate.distance ?? Infinity) <= (localCandidates[0]?.distance ?? Infinity) + 180
      ) {
        return lockedCandidate.station;
      }

      return localCandidates[0]?.station ?? null;
    }
  }

  ranked.sort((a, b) => {
    if (canTrustProximity && a.distance !== null && b.distance !== null) {
      const distanceDelta = a.distance - b.distance;
      if (Math.abs(distanceDelta) > 400) {
        return distanceDelta;
      }
    }

    return b.score - a.score;
  });

  return ranked[0]?.station ?? null;
}

