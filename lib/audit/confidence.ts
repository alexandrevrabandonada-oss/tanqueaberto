import type { AuditConfidenceLabel, AuditCoverageLabel, AuditTrendLabel } from "@/lib/audit/types";

export function getCoverageLabel(ratio: number): AuditCoverageLabel {
  if (ratio >= 0.65) return "alta";
  if (ratio >= 0.35) return "média";
  return "baixa";
}

export function getConfidenceLabel(ratio: number, observations: number, stationCount: number, days: number): AuditConfidenceLabel {
  const density = observations / Math.max(1, stationCount * days);
  if (ratio >= 0.55 && density >= 0.18) return "alta";
  if (ratio >= 0.3 && density >= 0.08) return "média";
  return "baixa";
}

export function getTrendLabel(changePercent: number | null): AuditTrendLabel {
  if (changePercent === null || !Number.isFinite(changePercent)) return "estável";
  if (changePercent >= 2) return "alta";
  if (changePercent <= -2) return "queda";
  return "estável";
}
