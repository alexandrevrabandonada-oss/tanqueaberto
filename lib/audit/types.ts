import type { FuelType } from "@/lib/types";

export type AuditWindowDays = 7 | 30 | 90;
export type AuditSeverity = "low" | "medium" | "high";
export type AuditAlertKind = "sharp_rise" | "sharp_fall" | "synchronized_move" | "low_coverage" | "stale_station";
export type AuditCoverageLabel = "baixa" | "média" | "alta";
export type AuditConfidenceLabel = "baixa" | "média" | "alta";
export type AuditTrendLabel = "alta" | "queda" | "estável";
export type AuditScopeType = "region" | "city" | "station" | "group";
export type AuditVisibilityStatus = "public" | "internal" | "archived";
export type AuditAlertHistoryStatus = "novo" | "revisado" | "arquivado";
export type AuditGroupType = "corredor" | "bairro" | "regiao" | "operacional";

export interface AuditSeriesPoint {
  day: string;
  observations: number;
  minPrice: number | null;
  maxPrice: number | null;
  medianPrice: number | null;
  averagePrice: number | null;
  latestReportedAt: string | null;
}

export interface AuditSummary {
  observations: number;
  stations: number;
  cities: number;
  minPrice: number | null;
  maxPrice: number | null;
  medianPrice: number | null;
  averagePrice: number | null;
  latestPrice: number | null;
  previousPrice: number | null;
  changeAbsolute: number | null;
  changePercent: number | null;
  trend: AuditTrendLabel;
  coverageRatio: number;
  coverageLabel: AuditCoverageLabel;
  confidenceLabel: AuditConfidenceLabel;
}

export interface AuditAlert {
  kind: AuditAlertKind;
  title: string;
  description: string;
  severity: AuditSeverity;
  fuelType: FuelType;
  city?: string;
  stationId?: string;
  stationName?: string;
  value?: number | null;
}

export interface AuditStationSummaryItem {
  stationId: string;
  stationName: string;
  city: string;
  observations: number;
  medianPrice: number | null;
  lastReportedAt: string | null;
  coverageRatio: number;
  coverageLabel: AuditCoverageLabel;
  confidenceLabel: AuditConfidenceLabel;
  trend: AuditTrendLabel;
}

export interface AuditCitySummaryItem {
  city: string;
  observations: number;
  medianPrice: number | null;
  lastReportedAt: string | null;
  coverageRatio: number;
  coverageLabel: AuditCoverageLabel;
  confidenceLabel: AuditConfidenceLabel;
  trend: AuditTrendLabel;
  minPrice?: number | null;
  maxPrice?: number | null;
  amplitude?: number | null;
}

export interface AuditFuelSummaryItem {
  fuelType: FuelType;
  observations: number;
  medianPrice: number | null;
  lastReportedAt: string | null;
}

export interface AuditOverview {
  fuelType: FuelType;
  days: AuditWindowDays;
  summary: AuditSummary;
  series: AuditSeriesPoint[];
  alerts: AuditAlert[];
  topStations: AuditStationSummaryItem[];
  topCities: AuditCitySummaryItem[];
}

export interface StationAuditDetail {
  stationId: string;
  days: AuditWindowDays;
  fuelType: FuelType;
  summary: AuditSummary;
  series: AuditSeriesPoint[];
  recentReports: Array<{
    id: string;
    fuelType: FuelType;
    price: number;
    photoUrl: string;
    reportedAt: string;
    observedAt: string;
    submittedAt: string;
    reporterNickname: string | null;
    sourceKind: string;
  }>;
  alerts: AuditAlert[];
  fuelSummaries: AuditFuelSummaryItem[];
}

export interface CityAuditDetail {
  city: string;
  citySlug: string;
  days: AuditWindowDays;
  fuelType: FuelType;
  summary: AuditSummary;
  series: AuditSeriesPoint[];
  recentReports: Array<{
    id: string;
    stationName: string;
    stationId: string;
    fuelType: FuelType;
    price: number;
    photoUrl: string;
    reportedAt: string;
    observedAt: string;
    submittedAt: string;
    reporterNickname: string | null;
    sourceKind: string;
  }>;
  alerts: AuditAlert[];
  topStations: AuditStationSummaryItem[];
}

export interface AuditComparisonItem {
  city: string;
  citySlug: string;
  fuelType: FuelType;
  days: AuditWindowDays;
  stations: number;
  observations: number;
  minPrice: number | null;
  maxPrice: number | null;
  medianPrice: number | null;
  averagePrice: number | null;
  amplitude: number | null;
  coverageRatio: number;
  coverageLabel: AuditCoverageLabel;
  confidenceLabel: AuditConfidenceLabel;
  trend: AuditTrendLabel;
  changePercent: number | null;
  changeAbsolute: number | null;
  lastReportedAt: string | null;
}

export interface AuditStationGroup {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  groupType: AuditGroupType;
  city: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditStationGroupMember {
  id: string;
  groupId: string;
  stationId: string;
  notes: string | null;
  createdAt: string;
}

export interface AuditReportRunItem {
  id: string;
  scopeType: AuditScopeType;
  scopeLabel: string;
  citySlug: string | null;
  cityName: string | null;
  stationId: string | null;
  stationName: string | null;
  groupId: string | null;
  groupSlug: string | null;
  groupName: string | null;
  fuelType: FuelType;
  days: AuditWindowDays;
  periodStart: string;
  periodEnd: string;
  title: string;
  summary: Record<string, unknown>;
  alertsCount: number;
  visibilityStatus: AuditVisibilityStatus;
  artifactFormat: string | null;
  artifactPath: string | null;
  artifactUrl: string | null;
  createdBy: string | null;
  generatedAt: string;
  createdAt: string;
}

export interface AuditAlertHistoryItem {
  id: string;
  alertKind: AuditAlertKind;
  scopeType: AuditScopeType;
  scopeLabel: string;
  fuelType: FuelType;
  citySlug: string | null;
  cityName: string | null;
  stationId: string | null;
  stationName: string | null;
  groupId: string | null;
  groupSlug: string | null;
  periodDays: AuditWindowDays;
  periodStart: string;
  periodEnd: string;
  intensity: number | null;
  status: AuditAlertHistoryStatus;
  payload: Record<string, unknown>;
  generatedAt: string;
  createdAt: string;
}
