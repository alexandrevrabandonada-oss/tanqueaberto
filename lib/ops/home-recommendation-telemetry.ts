import { createSupabaseServiceClient } from "@/lib/supabase/admin";

interface HomeRecommendationTelemetryRow {
  city: string | null;
  fuel_type: string | null;
  payload: Record<string, unknown> | null;
  created_at: string | null;
}

export interface HomeRecommendationTelemetryReadout {
  totals: {
    decisions: number;
    nearOverridesAbsoluteNearest: number;
    nearOverrideRate: number;
    bestAlignedWithNear: number;
    bestAlignedRate: number;
    avgNearVsBestDistanceGap: number;
    avgNearVsBestPriceGap: number;
    avgNearVsBestScoreGap: number;
  };
  byFuel: Array<{
    fuelType: string;
    decisions: number;
    nearOverrideRate: number;
    bestAlignedRate: number;
  }>;
  topCities: Array<{
    city: string;
    decisions: number;
    nearOverrideRate: number;
    bestAlignedRate: number;
  }>;
  strongestOverrides: Array<{
    city: string;
    fuelType: string;
    nearStationId: string | null;
    bestStationId: string | null;
    absoluteNearestStationId: string | null;
    distanceGap: number;
    priceGap: number;
    scoreGap: number;
    createdAt: string | null;
  }>;
}

function asPayload(row: HomeRecommendationTelemetryRow) {
  return (row.payload ?? {}) as Record<string, unknown>;
}

function readNumber(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readBoolean(payload: Record<string, unknown>, key: string) {
  return payload[key] === true;
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

export async function getHomeRecommendationTelemetryReadout(windowDays = 14): Promise<HomeRecommendationTelemetryReadout> {
  const supabase = createSupabaseServiceClient();
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("operational_events")
    .select("city,fuel_type,payload,created_at")
    .eq("event_type", "home_recommendation_decided")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(4000);

  const rows = (data ?? []) as HomeRecommendationTelemetryRow[];
  const byFuel = new Map<string, { decisions: number; nearOverrides: number; bestAligned: number }>();
  const byCity = new Map<string, { decisions: number; nearOverrides: number; bestAligned: number }>();
  const nearVsBestDistanceGaps: number[] = [];
  const nearVsBestPriceGaps: number[] = [];
  const nearVsBestScoreGaps: number[] = [];
  const strongestOverrides: HomeRecommendationTelemetryReadout["strongestOverrides"] = [];

  let nearOverridesAbsoluteNearest = 0;
  let bestAlignedWithNear = 0;

  for (const row of rows) {
    const payload = asPayload(row);
    const city = row.city?.trim() || "Sem cidade";
    const fuelType = row.fuel_type?.trim() || "sem_fuel";
    const nearOverride = readBoolean(payload, "nearOverridesAbsoluteNearest");
    const bestAligned = readBoolean(payload, "bestAlignedWithNear");
    const distanceGap = readNumber(payload, "nearVsBestDistanceGap");
    const priceGap = readNumber(payload, "nearVsBestPriceGap");
    const scoreGap = readNumber(payload, "nearVsBestScoreGap");

    if (nearOverride) nearOverridesAbsoluteNearest += 1;
    if (bestAligned) bestAlignedWithNear += 1;
    if (distanceGap !== null) nearVsBestDistanceGaps.push(distanceGap);
    if (priceGap !== null) nearVsBestPriceGaps.push(priceGap);
    if (scoreGap !== null) nearVsBestScoreGaps.push(scoreGap);

    const fuelBucket = byFuel.get(fuelType) ?? { decisions: 0, nearOverrides: 0, bestAligned: 0 };
    fuelBucket.decisions += 1;
    if (nearOverride) fuelBucket.nearOverrides += 1;
    if (bestAligned) fuelBucket.bestAligned += 1;
    byFuel.set(fuelType, fuelBucket);

    const cityBucket = byCity.get(city) ?? { decisions: 0, nearOverrides: 0, bestAligned: 0 };
    cityBucket.decisions += 1;
    if (nearOverride) cityBucket.nearOverrides += 1;
    if (bestAligned) cityBucket.bestAligned += 1;
    byCity.set(city, cityBucket);

    if (nearOverride) {
      strongestOverrides.push({
        city,
        fuelType,
        nearStationId: readString(payload, "nearStationId"),
        bestStationId: readString(payload, "bestStationId"),
        absoluteNearestStationId: readString(payload, "absoluteNearestStationId"),
        distanceGap: distanceGap ?? 0,
        priceGap: priceGap ?? 0,
        scoreGap: scoreGap ?? 0,
        createdAt: row.created_at
      });
    }
  }

  return {
    totals: {
      decisions: rows.length,
      nearOverridesAbsoluteNearest,
      nearOverrideRate: percentage(nearOverridesAbsoluteNearest, rows.length),
      bestAlignedWithNear,
      bestAlignedRate: percentage(bestAlignedWithNear, rows.length),
      avgNearVsBestDistanceGap: average(nearVsBestDistanceGaps),
      avgNearVsBestPriceGap: average(nearVsBestPriceGaps),
      avgNearVsBestScoreGap: average(nearVsBestScoreGaps)
    },
    byFuel: Array.from(byFuel.entries())
      .map(([fuelType, bucket]) => ({
        fuelType,
        decisions: bucket.decisions,
        nearOverrideRate: percentage(bucket.nearOverrides, bucket.decisions),
        bestAlignedRate: percentage(bucket.bestAligned, bucket.decisions)
      }))
      .sort((left, right) => right.decisions - left.decisions || right.nearOverrideRate - left.nearOverrideRate)
      .slice(0, 6),
    topCities: Array.from(byCity.entries())
      .map(([city, bucket]) => ({
        city,
        decisions: bucket.decisions,
        nearOverrideRate: percentage(bucket.nearOverrides, bucket.decisions),
        bestAlignedRate: percentage(bucket.bestAligned, bucket.decisions)
      }))
      .sort((left, right) => right.decisions - left.decisions || right.nearOverrideRate - left.nearOverrideRate)
      .slice(0, 6),
    strongestOverrides: strongestOverrides
      .sort((left, right) => right.distanceGap - left.distanceGap || left.priceGap - right.priceGap || left.scoreGap - right.scoreGap)
      .slice(0, 5)
  };
}