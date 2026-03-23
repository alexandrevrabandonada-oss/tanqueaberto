import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getGroupReadinessRows } from "./readiness";
import type { GroupReadinessRow } from "./types";

export interface DailyDigest {
  timestamp: string;
  summary: {
    submissions24h: number;
    approvals24h: number;
    rejections24h: number;
    pendingTotal: number;
    avgSlaMinutes: number;
    errorRate: number;
  };
  groupChanges: Array<{
    groupId: string;
    name: string;
    scoreChange: number;
    currentScore: number;
    trend: "up" | "down" | "stable";
  }>;
  recommendedActions: Array<{
    type: "intensificar" | "moderar" | "segurar" | "liberar";
    label: string;
    description: string;
    priority: "alta" | "media" | "baixa";
  }>;
}

export async function getDailyOpsDigest(): Promise<DailyDigest> {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const beforeYesterday = new Date(yesterday.getTime() - 24 * 60 * 60 * 1000);

  // 1. Core Summary Stats
  const { data: reports24h } = await supabase
    .from("price_reports")
    .select("status, created_at, approved_at, rejected_at")
    .gte("created_at", yesterday.toISOString());

  const submissions24h = reports24h?.length ?? 0;
  const approvals24h = reports24h?.filter(r => r.status === "approved").length ?? 0;
  const rejections24h = reports24h?.filter(r => r.status === "rejected").length ?? 0;

  const latencies = reports24h?.map(r => {
    const closedAt = r.approved_at || r.rejected_at;
    if (!closedAt) return null;
    return (new Date(closedAt).getTime() - new Date(r.created_at).getTime()) / (1000 * 60);
  }).filter((v): v is number => v !== null && v > 0) ?? [];

  const avgSlaMinutes = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

  const { count: pendingTotal } = await supabase
    .from("price_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  // 2. Group Performance Trends
  const currentReadiness = await getGroupReadinessRows(1); // Today (approx)
  const previousReadiness = await getGroupReadinessRows(7); // Used as baseline (average of last 7 days) 

  const groupChanges = currentReadiness.map(current => {
    const prev = previousReadiness.find(p => p.groupId === current.groupId);
    const scoreDiff = prev ? current.score - prev.score : 0;
    return {
      groupId: current.groupId,
      name: current.groupName,
      scoreChange: scoreDiff,
      currentScore: current.score,
      trend: scoreDiff > 2 ? "up" : scoreDiff < -2 ? "down" : "stable" as any
    };
  });

  // 3. Recommended Actions Engine
  const actions: DailyDigest["recommendedActions"] = [];

  // Action: Moderate Pending
  if ((pendingTotal ?? 0) > 10) {
    actions.push({
      type: "moderar",
      label: "Fila de Moderação Acumulada",
      description: `Existem ${pendingTotal} reports pendentes. SLA atual: ${Math.round(avgSlaMinutes)}min.`,
      priority: (pendingTotal ?? 0) > 30 ? "alta" : "media"
    });
  }

  // Action: Intensify Groups with High Potential
  currentReadiness.forEach(group => {
    if (group.score >= 60 && group.score < 80 && group.approvedReportsRecent < 10) {
      actions.push({
        type: "intensificar",
        label: `Coleta em ${group.groupName}`,
        description: `Perto de ficar 'Ready' (Score: ${group.score}). Falta volume de reports recentes.`,
        priority: "alta"
      });
    }
    
    if (group.trafficLight === "red" && group.visibleStations > 5) {
      actions.push({
        type: "segurar",
        label: `Revisar Cadastro: ${group.groupName}`,
        description: "Muitos postos mas zero cobertura. Verificar coordenadas e nomes.",
        priority: "media"
      });
    }
  });

  return {
    timestamp: now.toISOString(),
    summary: {
      submissions24h,
      approvals24h,
      rejections24h,
      pendingTotal: pendingTotal ?? 0,
      avgSlaMinutes,
      errorRate: 0 // To be filled with telemetry if available
    },
    groupChanges: groupChanges.slice(0, 10),
    recommendedActions: actions.slice(0, 5)
  };
}
