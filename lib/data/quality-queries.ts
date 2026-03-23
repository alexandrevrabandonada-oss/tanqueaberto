import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapReportRow, mapStationRow } from "./mappers";
import type { PriceReport, ReportWithStation, Station } from "@/lib/types";

export interface QualityMetrics {
  totalReports: number;
  flaggedReports: number;
  potentialPhotoReuses: number;
  priceConflicts: number;
  noiseRatio: number;
  topConflictStations: Array<{
    station: Station;
    conflictCount: number;
  }>;
  recentFlaggedReports: ReportWithStation[];
}

export async function getQualityMetrics(days = 7): Promise<QualityMetrics> {
  const supabase = await createSupabaseServerClient();
  const dateLimit = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // 1. Basic counts
  const { count: totalReports } = await supabase
    .from("price_reports")
    .select("*", { count: "exact", head: true })
    .gt("created_at", dateLimit);

  const { count: flaggedReports } = await supabase
    .from("price_reports")
    .select("*", { count: "exact", head: true })
    .eq("status", "flagged")
    .gt("created_at", dateLimit);

  // 2. Potential Photo Reuses (via metadata)
  const { count: photoReuses } = await supabase
    .from("price_reports")
    .select("*", { count: "exact", head: true })
    .filter("metadata->>potential_photo_reuse", "eq", "true")
    .gt("created_at", dateLimit);

  // 3. Price Conflicts (via metadata)
  const { count: conflicts } = await supabase
    .from("price_reports")
    .select("*", { count: "exact", head: true })
    .filter("metadata->>price_discrepancy", "eq", "true")
    .gt("created_at", dateLimit);

  // 4. Top Stations with conflicts
  const { data: conflictData } = await supabase
    .from("price_reports")
    .select("station_id")
    .filter("metadata->>price_discrepancy", "eq", "true")
    .gt("created_at", dateLimit);

  const stationConflictCounts = (conflictData || []).reduce((acc: Record<string, number>, curr) => {
    acc[curr.station_id] = (acc[curr.station_id] || 0) + 1;
    return acc;
  }, {});

  const topStationIds = Object.entries(stationConflictCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const topConflictStations = await Promise.all(
    topStationIds.map(async ([id, count]) => {
      const { data: station } = await supabase
        .from("stations")
        .select("*")
        .eq("id", id)
        .single();
      return {
        station: mapStationRow(station),
        conflictCount: count
      };
    })
  );

  // 5. Recent Flagged Reports
  const { data: recentFlagged } = await supabase
    .from("price_reports")
    .select("*, stations(*)")
    .eq("status", "flagged")
    .order("created_at", { ascending: false })
    .limit(10);

  const mappedFlagged = (recentFlagged || []).map(row => ({
    ...mapReportRow(row),
    station: mapStationRow(row.stations)
  })) as ReportWithStation[];

  return {
    totalReports: totalReports || 0,
    flaggedReports: flaggedReports || 0,
    potentialPhotoReuses: photoReuses || 0,
    priceConflicts: conflicts || 0,
    noiseRatio: totalReports ? (flaggedReports || 0) / totalReports : 0,
    topConflictStations,
    recentFlaggedReports: mappedFlagged
  };
}
