import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { getAuditGroups } from "@/lib/audit/groups";

export interface OperationalAlert {
  id?: string;
  alertKind: 'performance' | 'moderation' | 'territorial';
  severity: 'info' | 'warning' | 'critical';
  status: 'active' | 'resolved' | 'acknowledged';
  city?: string;
  scopeId?: string;
  message: string;
  suggestedAction?: string;
  payload: any;
  startedAt?: string;
  resolvedAt?: string;
}

export async function detectActiveAlerts(): Promise<OperationalAlert[]> {
  const supabase = createSupabaseServiceClient();
  const now = new Date();
  const recentWindow = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4h
  const dailyWindow = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h

  const alerts: OperationalAlert[] = [];

  // 1. Performance Alerts
  const { data: perfEvents } = await supabase
    .from("operational_events")
    .select("event_type, created_at")
    .gte("created_at", recentWindow.toISOString());

  if (perfEvents) {
    const cameraCount = perfEvents.filter(e => e.event_type === "submission_camera_opened").length;
    const successCount = perfEvents.filter(e => e.event_type === "submission_success" || e.event_type === "price_report_submitted").length;
    
    if (cameraCount > 10 && successCount === 0) {
      alerts.push({
        alertKind: 'performance',
        severity: 'critical',
        status: 'active',
        message: "Abandono total de fluxo detectado nas últimas 4h.",
        suggestedAction: "Verificar estabilidade do módulo de câmera e upload.",
        payload: { cameraCount, successCount }
      });
    } else if (cameraCount > 0 && (cameraCount / (successCount || 1)) > 5) {
      alerts.push({
        alertKind: 'performance',
        severity: 'warning',
        status: 'active',
        message: "Taxa de abandono de envio acima do normal (>5x).",
        suggestedAction: "Revisar UX do formulário de envio ou lentidão de rede.",
        payload: { ratio: cameraCount / (successCount || 1) }
      });
    }
  }

  // 2. Moderation Alerts
  const { data: pendingReports } = await supabase
    .from("price_reports")
    .select("id, created_at")
    .eq("status", "pending");

  if (pendingReports && pendingReports.length > 20) {
    const oldest = new Date(Math.min(...pendingReports.map(r => new Date(r.created_at).getTime())));
    const hoursOld = (now.getTime() - oldest.getTime()) / (1000 * 60 * 60);

    alerts.push({
      alertKind: 'moderation',
      severity: hoursOld > 4 ? 'critical' : 'warning',
      status: 'active',
      message: `Fila de moderação acumulada: ${pendingReports.length} pendentes.`,
      suggestedAction: hoursOld > 4 ? "Acionar moderadores de plantão (SLA crítico)." : "Limpar fila de moderação.",
      payload: { count: pendingReports.length, oldestAgeHours: hoursOld }
    });
  }

  // 3. Territorial Alerts
  const auditGroups = await getAuditGroups();
  const readyGroups = auditGroups.filter(g => g.releaseStatus === "ready");

  const { data: recentSuccessEvents } = await supabase
    .from("operational_events")
    .select("scope_id, city")
    .eq("event_type", "submission_success")
    .gte("created_at", dailyWindow.toISOString());

  const activeScopeIds = new Set(recentSuccessEvents?.map(e => e.scope_id) || []);

  for (const group of readyGroups) {
    if (!activeScopeIds.has(group.slug)) {
      // Checar se houve tentativa de uso (camera opened)
      const { count: attempts } = await supabase
        .from("operational_events")
        .select("id", { count: 'exact', head: true })
        .eq("scope_id", group.slug)
        .eq("event_type", "submission_camera_opened")
        .gte("created_at", dailyWindow.toISOString());

      if (attempts && attempts > 5) {
        alerts.push({
          alertKind: 'territorial',
          severity: 'critical',
          status: 'active',
          city: group.city,
          scopeId: group.slug,
          message: `Regressão silenciosa em ${group.name}: tentativas sem sucesso nas últimas 24h.`,
          suggestedAction: "Verificar se o recorte perdeu cobertura ou se há erro técnico localizado.",
          payload: { attempts }
        });
      }
    }
  }

  // 4. Regression Alerts (Performance Latency)
  const { data: latencyEvents } = await supabase
    .from("operational_events")
    .select("event_type, created_at, payload")
    .in("event_type", ["submission_camera_opened", "submission_success"])
    .gte("created_at", recentWindow.toISOString());

  if (latencyEvents && latencyEvents.length > 5) {
    // Calcular tempo médio entre câmera aberta e sucesso nas últimas 4h
    // (Para simplificar, pareamos eventos próximos no tempo)
    const completions = latencyEvents.filter(e => e.event_type === "submission_success");
    if (completions.length >= 3) {
      // Regra simples: se houver sucesso, mas o volume de falhas/abandonos for anômalo
      const cameras = latencyEvents.filter(e => e.event_type === "submission_camera_opened").length;
      const dropRate = (cameras - completions.length) / cameras;

      if (dropRate > 0.8) { // 80% de abandono
        alerts.push({
          alertKind: 'performance',
          severity: 'critical',
          status: 'active',
          message: `Regressão de Fluxo: ${Math.round(dropRate * 100)}% de abandono de câmera nas últimas 4h.`,
          payload: { dropRate, cameras, completions: completions.length }
        });
      }
    }
  }

  // 5. Local Queue Pressure
  const { data: queueEvents } = await supabase
    .from("operational_events")
    .select("id")
    .eq("event_type", "submission_queue_added")
    .gte("created_at", new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString()); // 1h

  if (queueEvents && queueEvents.length > 15) {
      alerts.push({
        alertKind: 'performance',
        severity: 'warning',
        status: 'active',
        message: `Pico de Fila Local: ${queueEvents.length} envios acumulados na última hora.`,
        suggestedAction: "Verificar se há instabilidade no endpoint de upload ou rede.",
        payload: { count: queueEvents.length }
      });
  }

  return alerts;
}

export async function persistAlerts(alerts: OperationalAlert[]) {
  const supabase = createSupabaseServiceClient();
  
  for (const alert of alerts) {
    // Verificar se já existe um alerta ativo do mesmo tipo e local
    const { data: existing } = await supabase
      .from("operational_alerts")
      .select("id")
      .eq("alert_kind", alert.alertKind)
      .eq("status", "active")
      .eq("scope_id", alert.scopeId || null)
      .eq("city", alert.city || null)
      .single();

    if (!existing) {
      await supabase.from("operational_alerts").insert({
        alert_kind: alert.alertKind,
        severity: alert.severity,
        status: alert.status,
        city: alert.city,
        scope_id: alert.scopeId,
        message: alert.message,
        suggested_action: alert.suggestedAction,
        payload: alert.payload
      });
    } else {
      // Atualizar timestamp de update
      await supabase
        .from("operational_alerts")
        .update({ payload: alert.payload, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
  }

  // Resolver alertas que não foram detectados agora mas estavam ativos
  // (Pode ser complexo sem um identificador de regra único, mas para o beta
  // vamos simplificar: se detectamos alertas, os ativos que NÃO estão na lista
  // poderiam ser resolvidos, mas isso exige cuidado. Vamos pular por enquanto.)
}
