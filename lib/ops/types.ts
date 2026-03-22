export type OpsJobType = "audit_refresh" | "audit_dossiers" | "coverage_snapshot" | "group_seed";
export type OpsCadence = "manual" | "cron_daily" | "cron_weekly" | "cron_monthly";
export type OpsJobStatus = "running" | "success" | "failed";

export interface OpsJobRun {
  id: string;
  jobType: OpsJobType;
  cadence: OpsCadence;
  status: OpsJobStatus;
  startedAt: string;
  finishedAt: string | null;
  triggeredBy: string | null;
  payload: Record<string, unknown>;
  metrics: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpsCoverageCityFuelRow {
  city: string;
  citySlug: string;
  fuelType: string;
  days: number;
  stations: number;
  observations: number;
  coverageRatio: number;
  coverageLabel: string;
  confidenceLabel: string;
  lastReportedAt: string | null;
  trend: string;
}

export interface OpsPriorityTarget {
  stationId: string;
  stationName: string;
  city: string;
  neighborhood: string | null;
  geoReviewStatus: string | null;
  geoConfidence: string | null;
  priorityScore: number;
  recentObservations: number;
  lastReportedAt: string | null;
  reason: string;
}

export interface OpsGroupCoverageItem {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  groupType: string;
  members: number;
  coverageState: "vazio" | "básico" | "ativo";
}

export interface OpsDashboard {
  recentRuns: OpsJobRun[];
  lastRefresh: OpsJobRun | null;
  lastDossiers: OpsJobRun | null;
  coverageRows: OpsCoverageCityFuelRow[];
  priorityTargets: OpsPriorityTarget[];
  groups: OpsGroupCoverageItem[];
  summary: {
    citiesCovered: number;
    recentObservations: number;
    lowCoverageCities: number;
    lowCoverageFuels: number;
    staleStations: number;
    emptyGroups: number;
  };
}
