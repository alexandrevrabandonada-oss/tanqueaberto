import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export interface RecorteActivity {
  lastActivityAt: string | null;
  lastActivityType: 'submission' | 'mission' | 'price' | null;
  activityLabel: string;
  totalStations: number;
  stationsWithHistory: number;
  newStationsWithNoPhoto: number;
  collaborationProgress: number; // 0-100
  recentCollaboratorsCount: number;
}

export async function getRecorteActivity(city: string, groupSlug?: string): Promise<RecorteActivity> {
  const supabase = createSupabaseServiceClient();
  
  // 1. Get stations in this city/group
  let query = supabase
    .from("stations")
    .select("id, last_reported_at, created_at")
    .eq("is_active", true);
    
  if (groupSlug) {
    // This would ideally join with audit_station_groups, but let's filter by city for simplicity
    // or assume we have the stations from a previous fetch if needed.
    query = query.eq("city", city);
  } else {
    query = query.eq("city", city);
  }

  const { data: stations } = await query;
  const totalStations = stations?.length || 0;
  const stationsWithHistory = stations?.filter(s => s.last_reported_at).length || 0;
  const newStationsWithNoPhoto = stations?.filter(s => !s.last_reported_at && new Date(s.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length || 0;
  const collaborationProgress = totalStations > 0 ? (stationsWithHistory / totalStations) * 100 : 0;

  // 2. Get last price report
  const { data: lastReport } = await supabase
    .from("price_reports")
    .select("created_at")
    .eq("city", city)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Get last operational event (mission/submission)
  const { data: lastEvent } = await supabase
    .from("operational_events")
    .select("created_at, event_type")
    .eq("city", city)
    .in("event_type", ["submission_success", "mission_completed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 4. Recent collaborators (distinct users)
  const { data: collaborators } = await supabase
    .from("price_reports")
    .select("user_id")
    .eq("city", city)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const distinctCollaborators = new Set(collaborators?.map(c => c.user_id)).size;

  let lastActivityAt = null;
  let lastActivityType: RecorteActivity['lastActivityType'] = null;
  let activityLabel = "Sem atividade recente.";

  const reportTime = lastReport?.created_at ? new Date(lastReport.created_at).getTime() : 0;
  const eventTime = lastEvent?.created_at ? new Date(lastEvent.created_at).getTime() : 0;

  if (reportTime > eventTime) {
    lastActivityAt = lastReport!.created_at;
    lastActivityType = 'price';
    activityLabel = "Último preço entrou no ar.";
  } else if (eventTime > 0) {
    lastActivityAt = lastEvent!.created_at;
    lastActivityType = lastEvent!.event_type === 'mission_completed' ? 'mission' : 'submission';
    activityLabel = lastActivityType === 'mission' ? "Última missão concluída." : "Última colaboração recebida.";
  }

  return {
    lastActivityAt,
    lastActivityType,
    activityLabel,
    totalStations,
    stationsWithHistory,
    newStationsWithNoPhoto,
    collaborationProgress,
    recentCollaboratorsCount: distinctCollaborators
  };
}
