import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { assembleStationWithReports, groupReportsByStation, mapReportRow, mapReportsWithStations, mapStationRow } from "@/lib/data/mappers";
import { getReportPriorityScore } from "@/lib/ops/moderation-priority";
import { deriveContributorHistorySummary, deriveContributorTrustLevel, deriveContributorTrustReasons } from "@/lib/ops/progressive-trust";
import { isPreviewFixturesEnabled, getPreviewApprovedReportsSince, getPreviewRecentCount, getPreviewRecentFeed, getPreviewStations, getPreviewStationById } from "@/lib/dev/preview-data";
import { getAuditGroups, getAllGroupMembersForGroups } from "@/lib/audit/groups";
import type { Station, StationWithReports, ReportWithStation, PriceReport, ReportStatus } from "@/lib/types";
import type { PriceReportRow, StationRow } from "@/types/supabase";

const STATION_SELECT_FULL = "id,name,name_official,name_public,brand,address,city,neighborhood,lat,lng,is_active,created_at,cnpj,source,source_id,official_status,sigaf_status,products,distributor_name,last_synced_at,import_notes,geo_source,geo_confidence,geo_review_status,priority_score,visibility_status,curation_note,duplicate_of_station_id,coordinate_reviewed_at,updated_at";
const STATION_SELECT_LEGACY = "id,name,name_official,name_public,brand,address,city,neighborhood,lat,lng,is_active,created_at,cnpj,source,source_id,official_status,sigaf_status,products,distributor_name,last_synced_at,import_notes,geo_source,geo_confidence,geo_review_status,priority_score,visibility_status,curation_note,updated_at";
const PRICE_REPORT_SELECT_FULL = "id,station_id,fuel_type,price,photo_url,photo_taken_at,reported_at,created_at,approved_at,rejected_at,reporter_nickname,ip_hash,status,moderation_note,moderation_reason,moderated_by,source_kind,photo_hash,location_distance,location_confidence,reconciliation_id,is_confirmation,metadata,version";
const PRICE_REPORT_SELECT_LEGACY = "id,station_id,fuel_type,price,photo_url,photo_taken_at,reported_at,created_at,reporter_nickname,status,moderation_note";

function sortDesc(left: { reportedAt: string }, right: { reportedAt: string }) {
  return new Date(right.reportedAt).getTime() - new Date(left.reportedAt).getTime();
}

function countReportsWithinHours(reports: PriceReport[], hours: number) {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return reports.reduce((count, report) => {
    return new Date(report.reportedAt).getTime() >= cutoff ? count + 1 : count;
  }, 0);
}

function isPreviewFixturesMode() {
  return isPreviewFixturesEnabled();
}

function isLegacyStationColumnError(message: string | undefined) {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("does not exist")
    || normalized.includes("could not find")
    || normalized.includes("schema cache");
}

function isLegacyPriceReportColumnError(message: string | undefined) {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("approved_at")
    || normalized.includes("rejected_at")
    || normalized.includes("moderated_by")
    || normalized.includes("moderation_reason")
    || normalized.includes("source_kind")
    || normalized.includes("photo_hash")
    || normalized.includes("location_distance")
    || normalized.includes("location_confidence")
    || normalized.includes("reconciliation_id")
    || normalized.includes("is_confirmation")
    || normalized.includes("metadata")
    || normalized.includes("version")
    || normalized.includes("does not exist")
    || normalized.includes("could not find")
    || normalized.includes("schema cache");
}

async function runStationSelect<T>(buildQuery: (select: string) => unknown): Promise<{ data: T | null; error: { message: string } | null }> {
  const fullResult = await buildQuery(STATION_SELECT_FULL) as { data: T | null; error: { message: string } | null };
  if (!fullResult.error || !isLegacyStationColumnError(fullResult.error.message)) {
    return fullResult;
  }

  return await buildQuery(STATION_SELECT_LEGACY) as { data: T | null; error: { message: string } | null };
}

async function runPriceReportSelect<T>(buildQuery: (select: string) => unknown): Promise<{ data: T | null; error: { message: string } | null }> {
  const fullResult = await buildQuery(PRICE_REPORT_SELECT_FULL) as { data: T | null; error: { message: string } | null };
  if (!fullResult.error || !isLegacyPriceReportColumnError(fullResult.error.message)) {
    return fullResult;
  }

  return await buildQuery(PRICE_REPORT_SELECT_LEGACY) as { data: T | null; error: { message: string } | null };
}

export async function getActiveStations(): Promise<Station[]> {
  if (isPreviewFixturesMode()) {
    return getPreviewStations().map((station) => station as unknown as Station);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await runStationSelect<StationRow[]>((select) =>
    supabase
      .from("stations")
      .select(select)
      .eq("is_active", true)
      .order("name", { ascending: true })
  );

  if (error || !data) {
    console.error("Failed to load stations", error);
    return [];
  }

  return (data as StationRow[]).map(mapStationRow);
}

/** Only stations with visibility_status = 'public' — for public-facing pages */
export async function getPublicStations(): Promise<Station[]> {
  if (isPreviewFixturesMode()) {
    return getPreviewStations().map((station) => station as unknown as Station);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await runStationSelect<StationRow[]>((select) =>
    supabase
      .from("stations")
      .select(select)
      .eq("is_active", true)
      .eq("visibility_status", "public")
      .order("name", { ascending: true })
  );

  if (error || !data) {
    console.error("Failed to load public stations", error);
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
  const { data, error } = await runStationSelect<StationRow>((select) =>
    supabase
      .from("stations")
      .select(select)
      .eq("id", id)
      .maybeSingle()
  );

  if (error || !data) {
    if (error) {
      console.error(`Failed to load station ${id}`, error);
    }
    return null;
  }

  return mapStationRow(data as StationRow);
}

/** Bypass RLS — use only from authenticated admin/editor pages */
export async function getStationByIdAdmin(id: string): Promise<Station | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await runStationSelect<StationRow>((select) =>
    supabase
      .from("stations")
      .select(select)
      .eq("id", id)
      .maybeSingle()
  );

  if (error || !data) {
    if (error) {
      console.error(`Failed to load station ${id} (admin)`, error);
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

async function buildHomeStations(stations: Station[], reports: PriceReport[]): Promise<StationWithReports[]> {
  let stationsWithStatus = stations;

  try {
    const groups = await getAuditGroups();

    if (groups && groups.length > 0) {
      const stationStatusMap = new Map<string, string>();

      const membersByGroupId = await getAllGroupMembersForGroups(groups.map(g => g.id));

      for (const group of groups) {
        const members = membersByGroupId.get(group.id) ?? [];
        if (!group) continue;
        const opsState = (group as any).operationalState;
        const status: string =
          opsState === "beta_open" ? "ready" :
          opsState === "monitoring" ? "validating" :
          opsState === "limited_test" ? "limited" :
          opsState === "rollback" ? "limited" :
          opsState === "closed" ? "hidden" :
          (group.releaseStatus as string) || "limited";

        for (const member of members) {
          if (!member.stationId) continue;
          const current = stationStatusMap.get(member.stationId);
          const statusOrder: Record<string, number> = { ready: 0, validating: 1, limited: 2, hidden: 3 };
          if (!current || statusOrder[status] < (statusOrder[current] ?? 99)) {
            stationStatusMap.set(member.stationId, status);
          }
        }
      }

      stationsWithStatus = stations
        .map((station) => ({
          ...station,
          releaseStatus: (stationStatusMap.get(station.id) as any) ?? "limited"
        }))
        .filter((station) => station.releaseStatus !== "hidden");
    }
  } catch {
    console.error("Failed to apply territorial release control, falling back to all stations");
  }

  const grouped = groupReportsByStation(stationsWithStatus, reports);

  return grouped.sort((a, b) => {
    const statusOrder: Record<string, number> = { ready: 0, validating: 1, limited: 2, hidden: 3 };
    const orderA = statusOrder[a.releaseStatus ?? "limited"] ?? 99;
    const orderB = statusOrder[b.releaseStatus ?? "limited"] ?? 99;

    if (orderA !== orderB) return orderA - orderB;

    return (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
  });
}

export async function getHomePageData(): Promise<{
  stations: StationWithReports[];
  feed: ReportWithStation[];
  recentCount: number;
}> {
  if (isPreviewFixturesMode()) {
    return {
      stations: getPreviewStations().map((station) => ({
        ...station,
        recentReports: station.latestReports,
        photoGallery: station.latestReports.map((report) => report.photoUrl)
      })),
      feed: getPreviewRecentFeed(),
      recentCount: getPreviewRecentCount()
    };
  }

  const [stations, reports] = await Promise.all([getPublicStations(), getApprovedReports(200)]);

  return {
    stations: await buildHomeStations(stations, reports),
    feed: mapReportsWithStations([...reports].sort(sortDesc).slice(0, 50), stations),
    recentCount: countReportsWithinHours(reports, 24)
  };
}

export async function getHomeStations(): Promise<StationWithReports[]> {
  if (isPreviewFixturesMode()) {
    return getPreviewStations().map((station) => ({
      ...station,
      recentReports: station.latestReports,
      photoGallery: station.latestReports.map((report) => report.photoUrl)
    }));
  }

  const [stations, reports] = await Promise.all([getPublicStations(), getApprovedReports()]);
  return buildHomeStations(stations, reports);
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

/** Bypass RLS version — use only from authenticated admin/editor pages */
export async function getStationDetailAdmin(id: string): Promise<StationWithReports | null> {
  const [station, reports] = await Promise.all([getStationByIdAdmin(id), getApprovedReports(200)]);

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

  const [stations, reports] = await Promise.all([getPublicStations(), getApprovedReports(50)]);
  return mapReportsWithStations(reports.sort(sortDesc), stations);
}

export async function getStationOptions(): Promise<Station[]> {
  return getPublicStations();
}

async function getAdminStations() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await runStationSelect<StationRow[]>((select) =>
    supabase
      .from("stations")
      .select(select)
      .order("created_at", { ascending: false })
  );

  if (error || !data) {
    console.error("Failed to load admin stations", error);
    return [] as Station[];
  }

  return (data as StationRow[]).map(mapStationRow);
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function applyProgressiveTrustMetadata(
  report: ReportWithStation,
  trust?: { score: number; stage: string; totalReports: number; approvedReports: number; rejectedReports: number }
) {
  const metadata = report.metadata ?? {};

  if (trust) {
    report.collectorTrustScore = trust.score;
    report.collectorTrustStage = trust.stage as ReportWithStation["collectorTrustStage"];
  }

  report.contributorTrustLevel = typeof metadata.contributor_trust_level === "string"
    ? metadata.contributor_trust_level as ReportWithStation["contributorTrustLevel"]
    : deriveContributorTrustLevel({
        score: trust?.score ?? 50,
        totalReports: trust?.totalReports ?? 0,
        approvedReports: trust?.approvedReports ?? 0,
        rejectedReports: trust?.rejectedReports ?? 0,
        trustStage: trust?.stage ?? "novo"
      });

  report.contributorTrustReasons = readStringArray(metadata.contributor_trust_reasons);
  if (report.contributorTrustReasons.length === 0) {
    report.contributorTrustReasons = deriveContributorTrustReasons({
      score: trust?.score ?? 50,
      totalReports: trust?.totalReports ?? 0,
      approvedReports: trust?.approvedReports ?? 0,
      rejectedReports: trust?.rejectedReports ?? 0,
      trustStage: trust?.stage ?? "novo"
    });
  }

  report.contributorHistorySummary = readStringArray(metadata.contributor_history_summary);
  if (report.contributorHistorySummary.length === 0) {
    report.contributorHistorySummary = deriveContributorHistorySummary({
      score: trust?.score ?? 50,
      totalReports: trust?.totalReports ?? 0,
      approvedReports: trust?.approvedReports ?? 0,
      rejectedReports: trust?.rejectedReports ?? 0,
      trustStage: trust?.stage ?? "novo"
    });
  }

  report.submissionRiskLevel = typeof metadata.submission_risk_level === "string"
    ? metadata.submission_risk_level as ReportWithStation["submissionRiskLevel"]
    : report.status === "flagged"
      ? "high"
      : "medium";

  report.submissionRiskReasons = readStringArray(metadata.submission_risk_reasons);
  if (report.submissionRiskReasons.length === 0 && report.moderationReason) {
    report.submissionRiskReasons = [report.moderationReason.replace(/_/g, " ")];
  }

  report.submissionRouting = typeof metadata.submission_routing === "string"
    ? metadata.submission_routing as ReportWithStation["submissionRouting"]
    : "review_normal";

  report.submissionRoutingReasons = readStringArray(metadata.submission_routing_reasons);
  if (report.submissionRoutingReasons.length === 0) {
    report.submissionRoutingReasons = [report.submissionRouting === "review_normal" ? "fluxo padrão de revisão" : (report.submissionRouting ?? "review_normal")];
  }
}

export async function getModerationReports(status: ReportStatus | "all" = "pending", limit = 24): Promise<ReportWithStation[]> {
  const supabase = createSupabaseServiceClient();
  const [{ data: reportsData, error: reportsError }, stations] = await Promise.all([
    runPriceReportSelect<PriceReportRow[]>((select) => {
      let query = supabase
        .from("price_reports")
        .select(select)
        .order("reported_at", { ascending: false })
        .limit(limit);

      if (status !== "all") {
        query = query.eq("status", status);
      }

      return query;
    }),
    getAdminStations()
  ]);

  if (reportsError || !reportsData) {
    console.error("Failed to load moderation reports", reportsError);
    return [];
  }

  const reports = mapReportsWithStations((reportsData as PriceReportRow[]).map(mapReportRow), stations);
  const collectorKeys = reports
    .filter((report) => report.reporterNickname || report.ipHash)
    .map((report) => ({ nickname: report.reporterNickname || "", ip_hash: report.ipHash || "" }));

  const trustMap = new Map<string, { score: number; stage: string; totalReports: number; approvedReports: number; rejectedReports: number }>();
  if (collectorKeys.length > 0) {
    const nicknames = Array.from(new Set(collectorKeys.map((key) => key.nickname).filter(Boolean)));
    const ipHashes = Array.from(new Set(collectorKeys.map((key) => key.ip_hash).filter(Boolean)));

    try {
      const clauses: string[] = [];
      if (nicknames.length > 0) clauses.push(`nickname.in.(${nicknames.map((nickname) => `"${nickname}"`).join(",")})`);
      if (ipHashes.length > 0) clauses.push(`ip_hash.in.(${ipHashes.map((ipHash) => `"${ipHash}"`).join(",")})`);

      if (clauses.length > 0) {
        const { data: trustData } = await supabase
          .from("collector_trust")
          .select("nickname,ip_hash,score,trust_stage,total_reports,approved_reports,rejected_reports")
          .or(clauses.join(","));

        if (trustData) {
          for (const trustRow of trustData) {
            trustMap.set(`${trustRow.nickname}:${trustRow.ip_hash}`, {
              score: Number(trustRow.score ?? 50),
              stage: String(trustRow.trust_stage ?? "novo"),
              totalReports: Number(trustRow.total_reports ?? 0),
              approvedReports: Number(trustRow.approved_reports ?? 0),
              rejectedReports: Number(trustRow.rejected_reports ?? 0)
            });
          }
        }
      }
    } catch {
      // collector_trust table may not exist in production yet
    }
  }

  reports.forEach((report) => {
    const trust = trustMap.get(`${report.reporterNickname || ""}:${report.ipHash || ""}`);
    applyProgressiveTrustMetadata(report, trust);

    if (report.status === "pending") {
      const station = stations.find((item) => item.id === report.stationId) || null;
      report.priorityScore = getReportPriorityScore(report, station as any, {
        betaInviteCode: null,
        reporterTrustScore: trust?.score
      });
    }
  });

  if (status === "pending") {
    reports.sort((left, right) => (right.priorityScore ?? 0) - (left.priorityScore ?? 0));
  }

  return reports;
}
export async function getRecentModeratedReports(limit = 6): Promise<ReportWithStation[]> {
  return getModerationReports("all", limit).then((reports) => reports.filter((report) => report.status === "approved" || report.status === "rejected"));
}

export async function getPendingReports(): Promise<ReportWithStation[]> {
  return getModerationReports("pending", 24);
}

export async function getReportsByIds(ids: string[]): Promise<PriceReport[]> {
  if (ids.length === 0) return [];

  const supabase = createSupabaseServiceClient();
  const { data, error } = await runPriceReportSelect<PriceReportRow[]>((select) =>
    supabase
      .from("price_reports")
      .select(select)
      .in("id", ids)
  );

  if (error || !data) {
    if (error) console.error("Failed to load reports by ids", error);
    return [];
  }

  return (data as PriceReportRow[]).map(mapReportRow);
}

export async function getReportByIdAdmin(id: string): Promise<ReportWithStation | null> {
  if (isPreviewFixturesMode()) {
    const previewReport = getPreviewRecentFeed().find((report) => report.id === id);
    return previewReport ?? null;
  }

  const supabase = createSupabaseServiceClient();
  const [{ data, error }, stations] = await Promise.all([
    runPriceReportSelect<PriceReportRow>((select) =>
      supabase
        .from("price_reports")
        .select(select)
        .eq("id", id)
        .maybeSingle()
    ),
    getAdminStations()
  ]);

  if (error || !data) {
    if (error) console.error(`Failed to load report ${id} for admin`, error);
    return null;
  }

  const report = mapReportsWithStations([mapReportRow(data as PriceReportRow)], stations)[0] ?? null;
  if (!report) return null;

  if (report.reporterNickname || report.ipHash) {
    try {
      let trustRow: { score: number; stage: string; totalReports: number; approvedReports: number; rejectedReports: number } | undefined;
      if (report.reporterNickname || report.ipHash) {
        const clauses: string[] = [];
        if (report.reporterNickname) clauses.push(`nickname.eq."${report.reporterNickname}"`);
        if (report.ipHash) clauses.push(`ip_hash.eq."${report.ipHash}"`);

        const { data: trustData } = await supabase
          .from("collector_trust")
          .select("nickname,ip_hash,score,trust_stage,total_reports,approved_reports,rejected_reports")
          .or(clauses.join(","))
          .limit(1);

        const trust = trustData?.[0];
        if (trust) {
          trustRow = {
            score: Number(trust.score ?? 50),
            stage: String(trust.trust_stage ?? "novo"),
            totalReports: Number(trust.total_reports ?? 0),
            approvedReports: Number(trust.approved_reports ?? 0),
            rejectedReports: Number(trust.rejected_reports ?? 0)
          };
        }
      }

      applyProgressiveTrustMetadata(report, trustRow);
    } catch {
      applyProgressiveTrustMetadata(report);
    }
  } else {
    applyProgressiveTrustMetadata(report);
  }

  return report;
}
export async function getModerationCounts() {
  const supabase = createSupabaseServiceClient();
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

  type StatusCounts = { pending: number; approved: number; rejected: number; flagged: number };
  return (data as { status: string }[]).reduce(
    (acc: StatusCounts, item) => {
      acc[item.status as keyof StatusCounts] += 1;
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
  const { data, error } = await runStationSelect<StationRow[]>((select) =>
    supabase
      .from("stations")
      .select(select)
      .in("geo_review_status", ["pending", "manual_review"])
      .order("priority_score", { ascending: false })
      .limit(limit)
  );

  if (error || !data) {
    console.error("Failed to load station review queue", error);
    return [];
  }

  return (data as StationRow[]).map(mapStationRow);
}

export async function getCollectorTrustList(limit = 100) {
  const supabase = await createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('collector_trust')
    .select('*')
    .order('score', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Failed to load collector trust list", error);
    return [];
  }

  return data;
}
export async function getStationsByIds(ids: string[]): Promise<Station[]> {
  if (ids.length === 0) return [];
  if (isPreviewFixturesMode()) {
    return getPreviewStations()
      .filter(s => ids.includes(s.id))
      .map((station) => station as unknown as Station);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await runStationSelect<StationRow[]>((select) =>
    supabase
      .from("stations")
      .select(select)
      .in("id", ids)
      .eq("is_active", true)
  );

  if (error || !data) {
    if (error) console.error("Failed to load stations by ids", error);
    return [];
  }

  return (data as StationRow[]).map(mapStationRow);
}

export async function getRecentReportsForStations(stationIds: string[], limit = 50): Promise<PriceReport[]> {
  if (stationIds.length === 0) return [];
  if (isPreviewFixturesMode()) {
    return getPreviewRecentFeed()
      .filter(r => stationIds.includes(r.stationId))
      .slice(0, limit);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("price_reports")
    .select("id,station_id,fuel_type,price,photo_url,photo_taken_at,reported_at,created_at,reporter_nickname,status,moderation_note")
    .in("station_id", stationIds)
    .eq("status", "approved")
    .order("reported_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) console.error("Failed to load group reports", error);
    return [];
  }

  return (data as PriceReportRow[]).map(mapReportRow);
}








