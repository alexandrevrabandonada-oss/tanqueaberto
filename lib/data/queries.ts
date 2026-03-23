import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assembleStationWithReports, groupReportsByStation, mapReportRow, mapReportsWithStations, mapStationRow } from "@/lib/data/mappers";
import { getReportPriorityScore } from "@/lib/ops/moderation-priority";
import { isPreviewFixturesEnabled, getPreviewApprovedReportsSince, getPreviewRecentCount, getPreviewRecentFeed, getPreviewStations, getPreviewStationById } from "@/lib/dev/preview-data";
import type { Station, StationWithReports, ReportWithStation, PriceReport, ReportStatus } from "@/lib/types";
import type { PriceReportRow, StationRow } from "@/types/supabase";

function sortDesc(left: { reportedAt: string }, right: { reportedAt: string }) {
  return new Date(right.reportedAt).getTime() - new Date(left.reportedAt).getTime();
}

function isPreviewFixturesMode() {
  return isPreviewFixturesEnabled();
}

export async function getActiveStations(): Promise<Station[]> {
  if (isPreviewFixturesMode()) {
    return getPreviewStations().map((station) => station as unknown as Station);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stations")
    .select("id,name,name_official,name_public,brand,address,city,neighborhood,lat,lng,is_active,created_at,cnpj,source,source_id,official_status,sigaf_status,products,distributor_name,last_synced_at,import_notes,geo_source,geo_confidence,geo_review_status,priority_score,visibility_status,curation_note,coordinate_reviewed_at,updated_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error || !data) {
    console.error("Failed to load stations", error);
    return [];
  }

  return (data as StationRow[]).map(mapStationRow);
}

export async function getStationById(id: string): Promise<Station | null> {
  if (isPreviewFixturesMode()) {
    const station = getPreviewStationById(id);
    return station ? (station as unknown as Station) : null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stations")
    .select("id,name,name_official,name_public,brand,address,city,neighborhood,lat,lng,is_active,created_at,cnpj,source,source_id,official_status,sigaf_status,products,distributor_name,last_synced_at,import_notes,geo_source,geo_confidence,geo_review_status,priority_score,visibility_status,curation_note,coordinate_reviewed_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error(`Failed to load station ${id}`, error);
    }
    return null;
  }

  return mapStationRow(data as StationRow);
}

export async function getApprovedReports(limit = 200): Promise<PriceReport[]> {
  if (isPreviewFixturesMode()) {
    return getPreviewRecentFeed().slice(0, limit);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("price_reports")
    .select("id,station_id,fuel_type,price,photo_url,photo_taken_at,reported_at,created_at,reporter_nickname,status,moderation_note")
    .eq("status", "approved")
    .order("reported_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Failed to load approved reports", error);
    return [];
  }

  return (data as PriceReportRow[]).map(mapReportRow);
}

export async function getApprovedReportsSince(days: number, limit = 4000): Promise<PriceReport[]> {
  if (isPreviewFixturesMode()) {
    return getPreviewApprovedReportsSince(days).slice(0, limit);
  }

  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("price_reports")
    .select("id,station_id,fuel_type,price,photo_url,photo_taken_at,reported_at,created_at,reporter_nickname,status,moderation_note")
    .eq("status", "approved")
    .gte("reported_at", since)
    .order("reported_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Failed to load recent approved reports", error);
    return [];
  }

  return (data as PriceReportRow[]).map(mapReportRow);
}

export async function getRecentApprovedCount(): Promise<number> {
  if (isPreviewFixturesMode()) {
    return getPreviewRecentCount();
  }

  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("price_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved")
    .gte("reported_at", since);

  if (error) {
    console.error("Failed to count recent reports", error);
    return 0;
  }

  return count ?? 0;
}

export async function getHomeStations(): Promise<StationWithReports[]> {
  if (isPreviewFixturesMode()) {
    return getPreviewStations().map((station) => ({
      ...station,
      recentReports: station.latestReports,
      photoGallery: station.latestReports.map((report) => report.photoUrl)
    }));
  }

  let stationsWithStatus = stations;

  try {
    const releaseSummary = await import("@/lib/ops/release-control").then((m) => m.getTerritorialReleaseSummary());
    const { getAuditGroups, getAuditGroupMembers } = await import("@/lib/audit/groups");
    const groups = await getAuditGroups();

    if (groups.length > 0) {
      // Map station to its status via group membership
      const stationStatusMap = new Map<string, string>();
      
      // Fetch all members in parallel
      const allMembersResults = await Promise.all(
        groups.map(group => getAuditGroupMembers(group.id).then(members => ({ group, members })))
      );

      for (const { group, members } of allMembersResults) {
        const status = releaseSummary.find((s) => s.slug === group.slug)?.status ?? "limited";
        for (const m of members) {
          const current = stationStatusMap.get(m.stationId);
          // Prioritize higher status
          const statusOrder: Record<string, number> = { ready: 0, validating: 1, limited: 2, hidden: 3 };
          if (!current || statusOrder[status] < (statusOrder[current] ?? 99)) {
            stationStatusMap.set(m.stationId, status);
          }
        }
      }

      stationsWithStatus = stations
        .map((s) => ({
          ...s,
          releaseStatus: (stationStatusMap.get(s.id) as any) ?? "limited"
        }))
        .filter((s) => s.releaseStatus !== "hidden");
    }
  } catch (err) {
    console.error("Failed to apply territorial release control, falling back to all stations", err);
  }

  const grouped = groupReportsByStation(stationsWithStatus, reports);

  // Final sort: Ready > Validating > Limited
  return grouped.sort((a, b) => {
    const statusOrder: Record<string, number> = { ready: 0, validating: 1, limited: 2, hidden: 3 };
    const orderA = statusOrder[a.releaseStatus ?? "limited"] ?? 99;
    const orderB = statusOrder[b.releaseStatus ?? "limited"] ?? 99;

    if (orderA !== orderB) return orderA - orderB;

    return (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
  });
}

export async function getStationDetail(id: string): Promise<StationWithReports | null> {
  if (isPreviewFixturesMode()) {
    const station = getPreviewStationById(id);
    return station ? ({
      ...station,
      recentReports: station.latestReports,
      photoGallery: station.latestReports.map((report) => report.photoUrl)
    } as StationWithReports) : null;
  }

  const [station, reports] = await Promise.all([getStationById(id), getApprovedReports(200)]);

  if (!station) {
    return null;
  }

  return assembleStationWithReports(
    station,
    reports.filter((report) => report.stationId === station.id)
  );
}

export async function getRecentFeed(): Promise<ReportWithStation[]> {
  if (isPreviewFixturesMode()) {
    return getPreviewRecentFeed();
  }

  const [stations, reports] = await Promise.all([getActiveStations(), getApprovedReports(50)]);
  return mapReportsWithStations(reports.sort(sortDesc), stations);
}

export async function getStationOptions(): Promise<Station[]> {
  return getActiveStations();
}

async function getAdminStations() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("stations").select("id,name,name_official,name_public,brand,address,city,neighborhood,lat,lng,is_active,created_at,cnpj,source,source_id,official_status,sigaf_status,products,distributor_name,last_synced_at,import_notes,geo_source,geo_confidence,geo_review_status,priority_score,visibility_status,curation_note,coordinate_reviewed_at,updated_at").order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to load admin stations", error);
    return [] as Station[];
  }

  return (data as StationRow[]).map(mapStationRow);
}

export async function getModerationReports(status: ReportStatus | "all" = "pending", limit = 24): Promise<ReportWithStation[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("price_reports")
    .select("id,station_id,fuel_type,price,photo_url,photo_taken_at,reported_at,created_at,reporter_nickname,status,moderation_note")
    .order("reported_at", { ascending: false })
    .limit(limit);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const [{ data: reportsData, error: reportsError }, stations] = await Promise.all([query, getAdminStations()]);

  if (reportsError || !reportsData) {
    console.error("Failed to load moderation reports", reportsError);
    return [];
  }

  const reports = mapReportsWithStations((reportsData as PriceReportRow[]).map(mapReportRow), stations);

  // Add priority score if pending
  if (status === "pending" || status === "all") {
    reports.forEach((report) => {
      if (report.status === "pending") {
        const station = stations.find((s) => s.id === report.stationId) || null;
        report.priorityScore = getReportPriorityScore(report, station as any, { betaInviteCode: null });
      }
    });

    if (status === "pending") {
      reports.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
    }
  }

  return reports;
}

export async function getRecentModeratedReports(limit = 6): Promise<ReportWithStation[]> {
  return getModerationReports("all", limit).then((reports) => reports.filter((report) => report.status !== "pending"));
}

export async function getPendingReports(): Promise<ReportWithStation[]> {
  return getModerationReports("pending", 24);
}

export async function getModerationCounts() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("price_reports").select("status").order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to load moderation counts", error);
    return {
      pending: 0,
      approved: 0,
      rejected: 0,
      flagged: 0
    };
  }

  return data.reduce(
    (acc, item) => {
      acc[item.status as keyof typeof acc] += 1;
      return acc;
    },
    {
      pending: 0,
      approved: 0,
      rejected: 0,
      flagged: 0
    }
  );
}

export async function getStationReviewQueue(limit = 12): Promise<Station[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stations")
    .select("id,name,name_official,name_public,brand,address,city,neighborhood,lat,lng,is_active,created_at,cnpj,source,source_id,official_status,sigaf_status,products,distributor_name,last_synced_at,import_notes,geo_source,geo_confidence,geo_review_status,priority_score,visibility_status,curation_note,coordinate_reviewed_at,updated_at")
    .in("geo_review_status", ["pending", "manual_review"])
    .order("priority_score", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Failed to load station review queue", error);
    return [];
  }

  return (data as StationRow[]).map(mapStationRow);
}






