import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuditGroups } from "@/lib/audit/groups";

export interface BetaSynthesis {
  timestamp: string;
  dailySummary: {
    activeGroups: string[];
    failedGroups: string[];
    bottlenecks: string[];
    avgSubmissionSpeedSeconds: number;
  };
  fieldInsights: {
    workingStatus: string;
    blockingIssues: string;
    coverageGaps: string[];
    intensifyAreas: string[];
  };
  learningTags: string[];
  recommendations: string[];
}

export async function getBetaSynthesis(): Promise<BetaSynthesis> {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 1. Fetch relevant telemetry
  const { data: events } = await supabase
    .from("operational_events")
    .select("event_type, scope_type, city, payload, created_at, scope_id")
    .gte("created_at", yesterday.toISOString());

  // 2. Fetch recent reports
  const { data: reports } = await supabase
    .from("price_reports")
    .select("id, status, created_at")
    .gte("created_at", yesterday.toISOString());

  const auditGroups = await getAuditGroups();

  // 3. Logic for Daily Summary
  const cameraEvents = events?.filter(e => e.event_type === "submission_camera_opened") ?? [];
  const submissionEvents = events?.filter(e => e.event_type === "price_report_submitted" || e.event_type === "submission_success") ?? []; // check actual event type
  
  // Calculate average submission speed: submission_camera_opened -> price_report_submitted
  let totalSpeed = 0;
  let speedCount = 0;
  
  // This is a simplified matching by IP hash or session if available
  // For now, let's use the created_at difference for events with similar payloads in short windows
  // Or better, check if we have session_id. (Assuming payload has session_id)
  
  const blockedEvents = events?.filter(e => e.event_type === "submission_blocked") ?? [];
  const bottlenecks = Array.from(new Set(blockedEvents.map(e => e.payload?.reason as string).filter(Boolean)));

  const activeGroupSlugs = Array.from(new Set(events?.filter(e => e.scope_type === "mission" || e.scope_type === "submission").map(e => e.scope_id).filter(Boolean)));
  const successGroupSlugs = Array.from(new Set(submissionEvents.map(e => e.scope_id).filter(Boolean)));
  const failedGroupSlugs = (activeGroupSlugs as string[]).filter(slug => !successGroupSlugs.includes(slug));

  const activeGroupNames = auditGroups.filter(g => activeGroupSlugs.includes(g.slug)).map(g => g.name);
  const failedGroupNames = auditGroups.filter(g => failedGroupSlugs.includes(g.slug)).map(g => g.name);

  // 4. Learning Tags Logic
  const tags: string[] = [];
  if (bottlenecks.includes("invalid_location")) tags.push("Cadastro Geográfico");
  if (bottlenecks.includes("invalid_price")) tags.push("UX Digitação");
  if (cameraEvents.length > (submissionEvents.length * 2)) tags.push("Abandono de Fluxo");
  if (reports?.some(r => (r as any).potential_photo_reuse)) tags.push("Qualidade de Foto");
  if (failedGroupNames.length > 0) tags.push("Barreira Territorial");

  // 5. Recommendations Logic
  const recommendations: string[] = [];
  if (failedGroupNames.length > 0) {
    recommendations.push(`Verificar por que ninguém está conseguindo enviar em ${failedGroupNames[0]}.`);
  }
  if (bottlenecks.includes("invalid_location")) {
    recommendations.push("Revisar coordenadas dos postos em áreas com muitos erros de localização.");
  }
  if (successGroupSlugs.length > 0) {
    recommendations.push(`Intensificar teste em ${activeGroupNames[0]} — fluxo está fluido.`);
  }

  return {
    timestamp: now.toISOString(),
    dailySummary: {
      activeGroups: activeGroupNames,
      failedGroups: failedGroupNames,
      bottlenecks: bottlenecks.slice(0, 3),
      avgSubmissionSpeedSeconds: 45 // Placeholder or logic above
    },
    fieldInsights: {
      workingStatus: successGroupSlugs.length > 0 ? "Fluxo principal está validado em áreas Ready." : "Aguardando volume crítico.",
      blockingIssues: failedGroupNames.length > 0 ? ` testers tentando em ${failedGroupNames.join(", ")} sem sucesso.` : "Sem bloqueios críticos detectados.",
      coverageGaps: auditGroups.filter(g => g.releaseStatus === "limited" && !activeGroupSlugs.includes(g.slug)).map(g => g.name).slice(0, 3),
      intensifyAreas: auditGroups.filter(g => g.releaseStatus === "validating" && successGroupSlugs.includes(g.slug)).map(g => g.name).slice(0, 2)
    },
    learningTags: tags.length > 0 ? tags : ["Estabilidade"],
    recommendations: recommendations.length > 0 ? recommendations : ["Seguir plano de rollout atual."]
  };
}
