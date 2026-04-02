import { getAuditGroups } from "@/lib/audit/groups";
import type { EditorialGapRecommendation } from "./editorial-gaps";
import type { AuditStationGroup } from "@/lib/audit/types";
import { type GroupReleaseStatus, type PublicOpeningStage } from "./release-types";

export { type GroupReleaseStatus };

export interface EffectiveGroupStatus {
  id: string;
  slug: string;
  name: string;
  status: GroupReleaseStatus;
  publicStage: PublicOpeningStage;
  isPublished: boolean;
  isOverride: boolean;
  score: number;
  recommendation: EditorialGapRecommendation;
}

/** Lightweight version — resolves group status from DB fields only, no editorial gap queries */
export async function getTerritorialReleaseSummary(): Promise<EffectiveGroupStatus[]> {
  try {
    const groups = await getAuditGroups().catch(() => []);
    if (!groups || groups.length === 0) return [];

    return groups.map(group => {
      const opsState = (group as any).operationalState;
      const statusFromOps: GroupReleaseStatus | null = 
        opsState === 'beta_open' ? 'ready' :
        opsState === 'monitoring' ? 'validating' :
        opsState === 'limited_test' ? 'limited' :
        opsState === 'rollback' ? 'limited' :
        opsState === 'closed' ? 'hidden' : null;

      const status = statusFromOps || (group.releaseStatus as GroupReleaseStatus) || "limited";
      const isPublished = typeof group.isPublished === "boolean" ? group.isPublished : (status !== "limited" && status !== "hidden");

      const publicStage: PublicOpeningStage = 
        status === "ready" ? "consolidated" :
        status === "validating" ? "public_beta" :
        status === "limited" ? "restricted_beta" : "closed";

      return {
        id: group.id,
        slug: group.slug,
        name: group.name,
        status,
        publicStage,
        isPublished,
        isOverride: Boolean(group.releaseStatus || opsState),
        score: 0,
        recommendation: "precisa revisar base primeiro" as EditorialGapRecommendation,
        operationalState: opsState
      };
    });
  } catch (error) {
    console.error("Failed to generate territorial release summary");
    return [];
  }
}