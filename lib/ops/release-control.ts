import { getAuditGroups } from "@/lib/audit/groups";
import { getEditorialGapDashboard, type EditorialGapRecommendation } from "./editorial-gaps";
import type { AuditStationGroup } from "@/lib/audit/types";
import { type GroupReleaseStatus, type PublicOpeningStage } from "./release-types";

export { type GroupReleaseStatus };

export interface EffectiveGroupStatus {
  slug: string;
  name: string;
  status: GroupReleaseStatus;
  publicStage: PublicOpeningStage;
  isPublished: boolean;
  isOverride: boolean;
  score: number;
  recommendation: EditorialGapRecommendation;
}

export async function getTerritorialReleaseSummary(): Promise<EffectiveGroupStatus[]> {
  try {
    const dashboard = await getEditorialGapDashboard(14).catch(err => {
      console.error("Failed to fetch editorial gap dashboard", err);
      return { groupRows: [] };
    });
    const groups = await getAuditGroups().catch(err => {
      console.error("Failed to fetch audit groups", err);
      return [];
    });
    
    if (!groups) return [];

    return groups.map(group => {
      const gapItem = dashboard.groupRows?.find((row: any) => row.id === `group:${group.slug}`);
      
      const suggestedStatus: GroupReleaseStatus = 
        gapItem?.recommendation === "vale pedir coleta já" ? "ready" :
        gapItem?.recommendation === "pode esperar" ? "validating" : "limited";

      // Mapeamento do novo estado operacional para o status clássico
      const opsState = (group as any).operationalState;
      const statusFromOps: GroupReleaseStatus | null = 
        opsState === 'beta_open' ? 'ready' :
        opsState === 'monitoring' ? 'validating' :
        opsState === 'limited_test' ? 'limited' :
        opsState === 'rollback' ? 'limited' :
        opsState === 'closed' ? 'hidden' : null;

      const status = statusFromOps || (group.releaseStatus as GroupReleaseStatus) || suggestedStatus;
      const isPublished = typeof group.isPublished === "boolean" ? group.isPublished : (status !== "limited" && status !== "hidden");

      // Mapping rules for public transparency
      const publicStage: PublicOpeningStage = 
        status === "ready" ? "consolidated" :
        status === "validating" ? "public_beta" :
        status === "limited" ? "restricted_beta" : "closed";

      return {
        slug: group.slug,
        name: group.name,
        status,
        publicStage,
        isPublished,
        isOverride: Boolean(group.releaseStatus || opsState),
        score: gapItem?.score ?? 0,
        recommendation: gapItem?.recommendation ?? "precisa revisar base primeiro",
        operationalState: opsState
      };
    });
  } catch (error) {
    console.error("Failed to generate territorial release summary", error);
    return [];
  }
}

// Helpers moved to release-types.ts
