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

export interface OperationalEventItem {
  id: string;
  eventType: string;
  severity: "info" | "warning" | "error";
  scopeType: string | null;
  scopeId: string | null;
  actorEmail: string | null;
  stationId: string | null;
  reportId: string | null;
  city: string | null;
  fuelType: string | null;
  reason: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AdminActionLogItem {
  id: string;
  actionKind: string;
  actorId: string | null;
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  note: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface OperationalTelemetry {
  summary: {
    submissions: number;
    approvals: number;
    rejections: number;
    blockedSubmissions: number;
    uploadErrors: number;
    authErrors: number;
    cronErrors: number;
    manualRuns: number;
    cityVolume: number;
    fuelVolume: number;
  };
  byCity: Array<{ city: string; count: number; approved: number; pending: number; rejected: number }>;
  byFuel: Array<{ fuelType: string; count: number; approved: number; pending: number; rejected: number }>;
  recentEvents: OperationalEventItem[];
  recentAdminActions: AdminActionLogItem[];
}

export interface OpsDashboard {
  recentRuns: OpsJobRun[];
  lastRefresh: OpsJobRun | null;
  lastDossiers: OpsJobRun | null;
  coverageRows: OpsCoverageCityFuelRow[];
  priorityTargets: OpsPriorityTarget[];
  groups: OpsGroupCoverageItem[];
  observability: OperationalTelemetry;
  summary: {
    citiesCovered: number;
    recentObservations: number;
    lowCoverageCities: number;
    lowCoverageFuels: number;
    staleStations: number;
    emptyGroups: number;
  };
}
