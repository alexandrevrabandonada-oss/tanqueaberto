import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export interface RecorteActivity {
  lastActivityAt: string | null;
  lastActivityType: 'submission' | 'mission' | 'price' | 'approval' | null;
  activityLabel: string;
  totalStations: number;
  stationsWithHistory: number;
  stationsAwaitingPhoto: number;
  newStationsWithNoPhoto: number;
  collaborationProgress: number; // 0-100
  recentCollaboratorsCount: number;
  lastApprovalAt: string | null;
  lastMissionCompletedAt: string | null;
  lastSubmissionAt: string | null; // Any status
  collaborationDensity: number; // % of stations with >1 report
  lastStationTouched: {
    id: string;
    name: string;
    neighborhood: string | null;
  } | null;
  stationsWithMultipleReports: number;
  totalAttempts: number;
  status: 'strong' | 'medium' | 'weak';
  recencySignals: {
    type: 'submission' | 'approval' | 'mission';
    timestamp: string;
  }[];
}

export async function getRecorteActivity(city: string, groupSlug?: string): Promise<RecorteActivity> {
  const supabase = createSupabaseServiceClient();
  
  // 1. Get stations in this city/group
  let query = supabase
    .from("stations")
    .select("id, name_public, name, neighborhood, last_reported_at, created_at")
    .eq("is_active", true);
    
  if (groupSlug && groupSlug !== "all") {
    query = query.eq("city", city);
  } else {
    query = query.eq("city", city);
  }

  const { data: stations } = await query;
  const totalStations = stations?.length || 0;
  
  // Counts
  const stationsWithHistory = stations?.filter(s => s.last_reported_at).length || 0;
  const stationsAwaitingPhoto = stations?.filter(s => !s.last_reported_at).length || 0;
  const newStationsWithNoPhoto = stations?.filter(s => !s.last_reported_at && new Date(s.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length || 0;
  const collaborationProgress = totalStations > 0 ? (stationsWithHistory / totalStations) * 100 : 0;

  // 2. Get last price report (any status)
  const { data: lastSubmission } = await supabase
    .from("price_reports")
    .select("created_at, station_id, status")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Get last approved report
  const { data: lastApproval } = await supabase
    .from("price_reports")
    .select("created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 4. Get last mission completed
  const { data: lastMission } = await supabase
    .from("operational_events")
    .select("created_at")
    .eq("event_type", "mission_completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 5. Total attempts (all reports)
  const { count: totalAttempts } = await supabase
    .from("price_reports")
    .select("id", { count: 'exact', head: true });

  // 6. Stations with multiple reports (densidade)
  // Get counts of reports per station for this city
  const { data: densityData } = await supabase
    .from("price_reports")
    .select("station_id")
    .in("station_id", stations?.map(s => s.id) || []);
  
  const reportCounts: Record<string, number> = {};
  densityData?.forEach(r => {
    reportCounts[r.station_id] = (reportCounts[r.station_id] || 0) + 1;
  });
  const stationsWithMultipleReports = Object.values(reportCounts).filter(count => count > 1).length;
  const collaborationDensity = totalStations > 0 ? (stationsWithMultipleReports / totalStations) * 100 : 0;

  // 7. Last station touched details
  let lastStationTouched = null;
  if (lastSubmission?.station_id) {
    const station = stations?.find(s => s.id === lastSubmission.station_id);
    if (station) {
      lastStationTouched = {
        id: station.id,
        name: station.name_public || station.name,
        neighborhood: station.neighborhood
      };
    }
  }

  // 8. Recent collaborators
  const { data: collaborators } = await supabase
    .from("price_reports")
    .select("reporter_nickname")
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const distinctCollaborators = new Set(collaborators?.filter(c => c.reporter_nickname).map(c => c.reporter_nickname)).size;

  // 9. Build recency signals
  const recencySignals: RecorteActivity['recencySignals'] = [];
  if (lastSubmission) recencySignals.push({ type: 'submission', timestamp: lastSubmission.created_at });
  if (lastApproval) recencySignals.push({ type: 'approval', timestamp: lastApproval.created_at });
  if (lastMission) recencySignals.push({ type: 'mission', timestamp: lastMission.created_at });

  // 10. Status determination
  let status: RecorteActivity['status'] = 'weak';
  if (collaborationProgress > 60 && distinctCollaborators > 5) {
    status = 'strong';
  } else if (collaborationProgress > 20 || distinctCollaborators > 1) {
    status = 'medium';
  }

  let lastActivityAt = null;
  let lastActivityType: RecorteActivity['lastActivityType'] = null;
  let activityLabel = "Nenhuma atividade recente detectada.";

  const submissionTime = lastSubmission?.created_at ? new Date(lastSubmission.created_at).getTime() : 0;
  const missionTime = lastMission?.created_at ? new Date(lastMission.created_at).getTime() : 0;
  const approvalTime = lastApproval?.created_at ? new Date(lastApproval.created_at).getTime() : 0;

  const maxTime = Math.max(submissionTime, missionTime, approvalTime);

  if (maxTime === 0) {
    activityLabel = "Aguardando primeira colaboração.";
  } else if (maxTime === approvalTime) {
    lastActivityAt = lastApproval!.created_at;
    lastActivityType = 'approval';
    activityLabel = "Preço aprovado recentemente.";
  } else if (maxTime === missionTime) {
    lastActivityAt = lastMission!.created_at;
    lastActivityType = 'mission';
    activityLabel = "Missão de rua concluída.";
  } else {
    lastActivityAt = lastSubmission!.created_at;
    lastActivityType = 'submission';
    activityLabel = "Envio recebido pelo sistema.";
  }

  return {
    lastActivityAt,
    lastActivityType,
    activityLabel,
    totalStations,
    stationsWithHistory,
    stationsAwaitingPhoto,
    newStationsWithNoPhoto,
    collaborationProgress,
    recentCollaboratorsCount: distinctCollaborators,
    lastApprovalAt: lastApproval?.created_at ?? null,
    lastMissionCompletedAt: lastMission?.created_at ?? null,
    lastSubmissionAt: lastSubmission?.created_at ?? null,
    collaborationDensity,
    lastStationTouched,
    stationsWithMultipleReports,
    totalAttempts: totalAttempts || 0,
    status,
    recencySignals: recencySignals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  };
}
export interface CollectorTerritorialImpact {
  primaryNeighborhood: string | null;
  primaryCity: string | null;
  stationsTouchedCount: number;
  totalApprovedReports: number;
  territoryDensity: number; // percentage of stations in primary neighborhood touched
  remainingGaps: number; // stations in primary neighborhood with no photo
  gapsClosedCount: number; // stations where this collector was the first to provide a report
}

export async function getCollectorTerritorialImpact(nickname: string): Promise<CollectorTerritorialImpact> {
  const supabase = createSupabaseServiceClient();

  // 1. Get all approved reports for this collector to find primary territory
  const { data: reports } = await supabase
    .from("price_reports")
    .select("station_id, stations(neighborhood, city)")
    .eq("reporter_nickname", nickname)
    .eq("status", "approved");

  if (!reports || reports.length === 0) {
    return {
      primaryNeighborhood: null,
      primaryCity: null,
      stationsTouchedCount: 0,
      totalApprovedReports: 0,
      territoryDensity: 0,
      remainingGaps: 0,
      gapsClosedCount: 0
    };
  }

  // Calculate primary neighborhood and city
  const neighborhoodCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};
  const touchedStationIds = new Set<string>();

  reports.forEach((r: any) => {
    const station = r.stations;
    if (station) {
      if (station.neighborhood) {
        neighborhoodCounts[station.neighborhood] = (neighborhoodCounts[station.neighborhood] || 0) + 1;
      }
      if (station.city) {
        cityCounts[station.city] = (cityCounts[station.city] || 0) + 1;
      }
      touchedStationIds.add(r.station_id);
    }
  });

  const primaryNeighborhood = Object.entries(neighborhoodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const primaryCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Calculate gaps in primary territory
  let remainingGaps = 0;
  let totalStationsInTerritory = 0;

  if (primaryNeighborhood && primaryCity) {
    const { data: territoryStations } = await supabase
      .from("stations")
      .select("id, last_reported_at")
      .eq("city", primaryCity)
      .eq("neighborhood", primaryNeighborhood)
      .eq("is_active", true);

    if (territoryStations) {
      totalStationsInTerritory = territoryStations.length;
      remainingGaps = territoryStations.filter(s => !s.last_reported_at).length;
    }
  }

  // Calculate gaps closed (where this collector was the first to report)
  // 1. Get all station IDs the collector touched
  const stationIds = Array.from(touchedStationIds);
  
  // 2. For each touched station, check if there are any approved reports EARLIER than the collector's first report on that station
  // This is a bit expensive, so we'll approximate: check if the collector's report is the absolute first approved one for that station
  const { data: firstReports } = await supabase
    .from("price_reports")
    .select("station_id, reporter_nickname, reported_at")
    .in("station_id", stationIds)
    .eq("status", "approved")
    .order("reported_at", { ascending: true });

  const firstReportByStation = new Map<string, string>();
  if (firstReports) {
    for (const r of firstReports) {
      if (!firstReportByStation.has(r.station_id)) {
        firstReportByStation.set(r.station_id, r.reporter_nickname || '');
      }
    }
  }

  let gapsClosedCount = 0;
  touchedStationIds.forEach(sid => {
    if (firstReportByStation.get(sid) === nickname) {
      gapsClosedCount++;
    }
  });

  return {
    primaryNeighborhood,
    primaryCity,
    stationsTouchedCount: touchedStationIds.size,
    totalApprovedReports: reports.length,
    territoryDensity: totalStationsInTerritory > 0 ? (touchedStationIds.size / totalStationsInTerritory) * 100 : 0,
    remainingGaps,
    gapsClosedCount
  };
}
