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
  lastStationTouched: {
    id: string;
    name: string;
    neighborhood: string | null;
  } | null;
  stationsWithMultipleReports: number;
  totalAttempts: number;
  status: 'strong' | 'medium' | 'weak';
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
  const { data: lastReport } = await supabase
    .from("price_reports")
    .select("created_at, station_id")
    .eq("status", "approved") // Using approved as a proxy for "touched" unless we want any submission
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
  // This is expensive to count accurately without a better view, but we can approximate or use a sample
  const stationsWithMultipleReports = stations?.filter(s => s.last_reported_at).length || 0; // Simplified for now

  // 7. Last station touched details
  let lastStationTouched = null;
  if (lastReport?.station_id) {
    const station = stations?.find(s => s.id === lastReport.station_id);
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

  // 9. Status determination
  let status: RecorteActivity['status'] = 'weak';
  if (collaborationProgress > 60 && distinctCollaborators > 5) {
    status = 'strong';
  } else if (collaborationProgress > 20 || distinctCollaborators > 1) {
    status = 'medium';
  }

  let lastActivityAt = null;
  let lastActivityType: RecorteActivity['lastActivityType'] = null;
  let activityLabel = "Nenhuma atividade recente detectada.";

  const reportTime = lastReport?.created_at ? new Date(lastReport.created_at).getTime() : 0;
  const missionTime = lastMission?.created_at ? new Date(lastMission.created_at).getTime() : 0;
  const approvalTime = lastApproval?.created_at ? new Date(lastApproval.created_at).getTime() : 0;

  const maxTime = Math.max(reportTime, missionTime, approvalTime);

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
    lastActivityAt = lastReport!.created_at;
    lastActivityType = 'price';
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
    lastStationTouched,
    stationsWithMultipleReports,
    totalAttempts: totalAttempts || 0,
    status
  };
}
