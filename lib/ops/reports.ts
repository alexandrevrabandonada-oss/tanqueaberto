import { getAuditGroups, getAuditGroupMembers } from "@/lib/audit/groups";
import { getRecentOpsJobRuns, getLastOpsJobRun } from "@/lib/ops/scheduler";
import { getCoverageSignals } from "@/lib/ops/coverage";
import { getPriorityTargets } from "@/lib/ops/priority";
import { getOperationalTelemetry } from "@/lib/ops/observability";
import type { OpsDashboard } from "./types";

export async function getOperationalDashboard(days = 30): Promise<OpsDashboard> {
  const [recentRuns, coverageSignals, priorityTargets, groups, lastRefresh, lastDossiers, observability] = await Promise.all([
    getRecentOpsJobRuns(12),
    getCoverageSignals(days),
    getPriorityTargets(12),
    getAuditGroups(),
    getLastOpsJobRun("audit_refresh"),
    getLastOpsJobRun("audit_dossiers"),
    getOperationalTelemetry(7)
  ]);

  const groupMembers = await Promise.all(groups.map(async (group) => ({ group, members: await getAuditGroupMembers(group.id) })));
  const groupsSummary = groupMembers.map(({ group, members }) => ({
    id: group.id,
    slug: group.slug,
    name: group.name,
    city: group.city,
    groupType: group.groupType,
    members: members.length,
    coverageState: members.length === 0 ? ("vazio" as const) : members.length < 3 ? ("básico" as const) : ("ativo" as const)
  }));

  return {
    recentRuns,
    lastRefresh,
    lastDossiers,
    coverageRows: coverageSignals.coverageRows,
    priorityTargets,
    groups: groupsSummary,
    observability,
    summary: {
      citiesCovered: coverageSignals.citiesCovered,
      recentObservations: coverageSignals.recentObservations,
      lowCoverageCities: coverageSignals.lowCoverageCities.length,
      lowCoverageFuels: Object.values(coverageSignals.lowCoverageFuels).reduce((sum, value) => sum + value, 0),
      staleStations: coverageSignals.staleStations.filter((item) => item.reason !== "densificar histórico").length,
      emptyGroups: groupsSummary.filter((group) => group.members === 0).length
    }
  };
}

export async function getOperationalSummary(days = 30) {
  const dashboard = await getOperationalDashboard(days);
  return {
    title: "Operação recorrente",
    subtitle: "Cobertura, rotina e densidade da base",
    dashboard
  };
}
