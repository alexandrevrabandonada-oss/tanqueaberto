import { getAuditGroups } from "@/lib/audit/groups";
import { getEditorialGapDashboard, type EditorialGapRecommendation } from "./editorial-gaps";
import type { AuditStationGroup } from "@/lib/audit/types";
import { type GroupReleaseStatus } from "./release-types";

export { type GroupReleaseStatus };

export interface EffectiveGroupStatus {
  slug: string;
  name: string;
  status: GroupReleaseStatus;
  isPublished: boolean;
  isOverride: boolean;
  score: number;
  recommendation: EditorialGapRecommendation;
}

export async function getTerritorialReleaseSummary(): Promise<EffectiveGroupStatus[]> {
  const dashboard = await getEditorialGapDashboard(14);
  const groups = await getAuditGroups();
  
  return groups.map(group => {
    const gapItem = dashboard.groupRows.find(row => row.id === `group:${group.slug}`);
    
    // Default logic based on readiness if no override exists
    // In a real implementation, we would check group.releaseStatus from the DB
    const suggestedStatus: GroupReleaseStatus = 
      gapItem?.recommendation === "vale pedir coleta já" ? "ready" :
      gapItem?.recommendation === "pode esperar" ? "validating" : "limited";

    // For now, we use the DB values if present, otherwise fallback to suggested
    const status = (group.releaseStatus as GroupReleaseStatus) || suggestedStatus;
    const isPublished = typeof group.isPublished === "boolean" ? group.isPublished : (status !== "limited" && status !== "hidden");

    return {
      slug: group.slug,
      name: group.name,
      status,
      isPublished,
      isOverride: Boolean(group.releaseStatus),
      score: gapItem?.score ?? 0,
      recommendation: gapItem?.recommendation ?? "precisa revisar base primeiro"
    };
  });
}

// Helpers moved to release-types.ts
