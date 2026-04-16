import type { RecencyTone } from "@/lib/format/time";

const NEARBY_DISTANCE_WINDOW_METERS = 3_500;
const NEARBY_REFERENCE_LITERS = 20;
const NEARBY_ROUND_TRIP_COST_PER_KM = 1;

export interface NearbyRecommendationCandidate {
  price: number;
  distance: number | null;
  recencyTone: RecencyTone;
  confidenceScore: number;
  valueScore: number;
}

export interface BestValueRecommendationCandidate extends NearbyRecommendationCandidate {
  id: string;
  netSavings40: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scoreDistance(distance: number | null) {
  if (distance === null) return 0.34;
  if (distance <= 400) return 1;
  if (distance <= 1_000) return 0.9;
  if (distance <= 2_000) return 0.74;
  if (distance <= 3_500) return 0.56;
  if (distance <= 5_000) return 0.34;
  return 0.16;
}

function getNearbyEffectiveCost(candidate: NearbyRecommendationCandidate) {
  const distanceKm = candidate.distance === null ? 0 : candidate.distance / 1000;
  const distanceCost = distanceKm * NEARBY_ROUND_TRIP_COST_PER_KM;
  return candidate.price * NEARBY_REFERENCE_LITERS + distanceCost;
}

function getNearbyBlendScore(candidate: NearbyRecommendationCandidate, averagePrice: number, lowestPrice: number) {
  const recencyScore = candidate.recencyTone === "fresh" ? 1 : candidate.recencyTone === "warning" ? 0.72 : 0.26;
  const distanceScore = scoreDistance(candidate.distance);
  const priceScore = clamp(1 - (candidate.price - lowestPrice) / 0.45, 0, 1);
  const averageSavingsScore = clamp((averagePrice - candidate.price) / 0.16, 0, 1);

  return distanceScore * 0.42
    + priceScore * 0.24
    + averageSavingsScore * 0.14
    + recencyScore * 0.08
    + candidate.confidenceScore * 0.06
    + clamp(candidate.valueScore, 0, 1) * 0.06;
}

export function pickNearbyRecommendation<T extends NearbyRecommendationCandidate>(candidates: T[]) {
  const candidatesWithDistance = candidates.filter((candidate) => candidate.distance !== null);
  if (candidatesWithDistance.length === 0) {
    return null;
  }

  const preferred = candidatesWithDistance.filter((candidate) => candidate.recencyTone !== "stale" && candidate.confidenceScore >= 0.58);
  const reliablePool = preferred.length > 0 ? preferred : candidatesWithDistance;
  const practicalPool = reliablePool.filter((candidate) => (candidate.distance ?? Infinity) <= NEARBY_DISTANCE_WINDOW_METERS);
  const scopedPool = practicalPool.length > 0 ? practicalPool : reliablePool;

  const prices = scopedPool.map((candidate) => candidate.price);
  const averagePrice = prices.reduce((sum, value) => sum + value, 0) / prices.length;
  const lowestPrice = Math.min(...prices);

  return [...scopedPool].sort((left, right) => {
    const effectiveCostDiff = getNearbyEffectiveCost(left) - getNearbyEffectiveCost(right);
    if (Math.abs(effectiveCostDiff) > 0.35) {
      return effectiveCostDiff;
    }

    const blendScoreDiff = getNearbyBlendScore(right, averagePrice, lowestPrice) - getNearbyBlendScore(left, averagePrice, lowestPrice);
    if (Math.abs(blendScoreDiff) > 0.015) {
      return blendScoreDiff;
    }

    const valueScoreDiff = right.valueScore - left.valueScore;
    if (Math.abs(valueScoreDiff) > 0.01) {
      return valueScoreDiff;
    }

    return (left.distance ?? Number.MAX_SAFE_INTEGER) - (right.distance ?? Number.MAX_SAFE_INTEGER);
  })[0] ?? null;
}

export function pickBestValueRecommendation<T extends BestValueRecommendationCandidate>(candidates: T[], nearbyCandidate: T | null) {
  const ranked = [...candidates].sort((left, right) => right.valueScore - left.valueScore || getNearbyEffectiveCost(left) - getNearbyEffectiveCost(right) || (left.distance ?? Number.MAX_SAFE_INTEGER) - (right.distance ?? Number.MAX_SAFE_INTEGER));
  const topCandidate = ranked[0] ?? null;
  if (!topCandidate || !nearbyCandidate || topCandidate.id === nearbyCandidate.id) {
    return topCandidate;
  }

  const scoreGap = topCandidate.valueScore - nearbyCandidate.valueScore;
  const topDistance = topCandidate.distance ?? Number.MAX_SAFE_INTEGER;
  const nearbyDistance = nearbyCandidate.distance ?? Number.MAX_SAFE_INTEGER;
  const detourGap = topDistance - nearbyDistance;
  const nearbyIsPractical = nearbyCandidate.recencyTone !== "stale" && nearbyCandidate.confidenceScore >= 0.58 && nearbyCandidate.netSavings40 >= 1 && nearbyDistance <= 2_500;

  if (nearbyIsPractical && scoreGap <= 0.06 && detourGap >= 900) {
    return nearbyCandidate;
  }

  return topCandidate;
}