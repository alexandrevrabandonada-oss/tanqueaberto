import { fuelLabels } from "@/lib/format/labels";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

type EconomyActionKind = "open_post" | "route" | "update_price";

export type EconomyGuardrailStatus = "healthy" | "attention" | "problem";

interface EconomyTelemetryEventRow {
  event_type: string | null;
  fuel_type: string | null;
  payload: Record<string, unknown> | null;
}

interface EconomyRateThreshold {
  healthyMin: number;
  attentionMin: number;
  sampleFloor: number;
}

interface EconomyPerformanceBase {
  key: string;
  label: string;
  views: number;
  clicks: number;
  openPostClicks: number;
  routeClicks: number;
  updatePriceClicks: number;
}

interface EconomyPerformanceSummary {
  ctr: number;
  openPostRate: number;
  routeRate: number;
  updatePriceRate: number;
  ctrStatus: EconomyGuardrailStatus;
  openPostStatus: EconomyGuardrailStatus;
  routeStatus: EconomyGuardrailStatus;
  updatePriceStatus: EconomyGuardrailStatus;
  overallStatus: EconomyGuardrailStatus;
  note: string;
  recommendation: string | null;
}

export interface EconomyOperationalIndicator {
  key: string;
  label: string;
  description: string;
  status: EconomyGuardrailStatus;
  value: number;
  displayValue: string;
  thresholdLabel: string;
  note: string;
}

export interface EconomyOperationalAlert {
  id: string;
  status: EconomyGuardrailStatus;
  title: string;
  message: string;
  recommendation: string;
}

export interface EconomyInsightItem {
  key: string;
  label: string;
  status: EconomyGuardrailStatus;
  note: string;
  recommendation: string | null;
}

export interface EconomySurfaceTelemetryMetric extends EconomyPerformanceBase, EconomyPerformanceSummary {
  returnSignals: number;
  returnCtaClicks: number;
  returnRate: number;
  returnStatus: EconomyGuardrailStatus;
}

export interface EconomyActionOriginMetric extends EconomyPerformanceBase, EconomyPerformanceSummary {
  returnSignals: number;
  returnCtaClicks: number;
  returnRate: number;
  returnStatus: EconomyGuardrailStatus;
}

export interface EconomyFuelFilterMetric extends EconomyPerformanceBase, EconomyPerformanceSummary {
  filterChanges: number;
}

export interface EconomyTelemetryReadout {
  generatedAt: string;
  windowDays: number;
  totals: {
    surfaceViews: number;
    actionClicks: number;
    openPostClicks: number;
    routeClicks: number;
    updatePriceClicks: number;
    filterChanges: number;
    returnSignals: number;
    returnCtaClicks: number;
    ctr: number;
    openPostRate: number;
    routeRate: number;
    updatePriceRate: number;
    returnRate: number;
  };
  guardrails: {
    overallStatus: EconomyGuardrailStatus;
    indicators: EconomyOperationalIndicator[];
    alerts: EconomyOperationalAlert[];
    recommendations: string[];
  };
  insights: {
    actionLeaders: EconomyInsightItem[];
    curiositySurfaces: EconomyInsightItem[];
    topFuelFilters: EconomyInsightItem[];
    topOrigins: EconomyInsightItem[];
  };
  surfaces: EconomySurfaceTelemetryMetric[];
  actionOrigins: EconomyActionOriginMetric[];
  fuelFilters: EconomyFuelFilterMetric[];
}

const SURFACE_LABELS: Record<string, string> = {
  vale_a_pena_para_mim: "Vale a pena para mim",
  cheapest_recent: "Mais barato recente",
  cheapest_near: "Mais barato perto",
  cheap_stale: "Barato, mas desatualizado",
  economy_by_neighborhood: "Economia por bairro",
  economy_by_city: "Economia por cidade",
  economy_by_nearby: "Economia por perto",
  flex_comparator: "Comparador gasolina x etanol",
  economy_savings: "Economia estimada",
  opportunity_reading: "Leitura de oportunidade",
  opportunity_card: "Cartao de oportunidade",
};

const REQUIRED_SURFACES = [
  "vale_a_pena_para_mim",
  "cheapest_recent",
  "cheapest_near",
  "cheap_stale",
  "economy_by_neighborhood",
  "economy_by_city",
  "economy_by_nearby",
  "flex_comparator",
  "economy_savings",
  "opportunity_reading",
  "opportunity_card",
];

const ACTION_ORIGIN_LABELS: Record<string, string> = {
  nearby_opportunity: "Oportunidade perto",
  neighborhood_or_city_economy: "Economia por bairro/cidade",
  flex_comparator: "Comparador flex",
  followed_price_drop: "Queda em posto acompanhado",
  cheapest_recent: "Mais barato recente",
  cheapest_near: "Mais barato perto",
  cheap_stale: "Barato, mas desatualizado",
};

const RATE_THRESHOLDS = {
  ctr: { healthyMin: 12, attentionMin: 6, sampleFloor: 20 },
  openPost: { healthyMin: 5, attentionMin: 2, sampleFloor: 20 },
  route: { healthyMin: 2, attentionMin: 0.8, sampleFloor: 20 },
  updatePrice: { healthyMin: 0.7, attentionMin: 0.25, sampleFloor: 20 },
  return: { healthyMin: 18, attentionMin: 8, sampleFloor: 5 },
} satisfies Record<string, EconomyRateThreshold>;

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readPayloadString(payload: Record<string, unknown> | null | undefined, key: string) {
  return readString(payload?.[key]);
}

function readPayloadAction(payload: Record<string, unknown> | null | undefined) {
  const value = readPayloadString(payload, "action");
  return value === "open_post" || value === "route" || value === "update_price" || value === "filter_fuel" ? value : "";
}

function normalizeFuelKey(fuelType: string | null, payload: Record<string, unknown> | null | undefined) {
  const payloadFuel = readPayloadString(payload, "fuelFilter");
  const candidate = readString(fuelType) || payloadFuel;
  if (candidate === "gasolina_comum" || candidate === "gasolina_aditivada" || candidate === "etanol" || candidate === "diesel_s10" || candidate === "diesel_comum" || candidate === "gnv") {
    return candidate;
  }
  return "unknown";
}

function normalizeActionOrigin(raw: string) {
  if (raw === "nearby_opportunity") return raw;
  if (raw === "flex_comparator") return raw;
  if (raw === "followed_price_drop") return raw;
  if (raw === "cheapest_recent") return raw;
  if (raw === "cheapest_near") return raw;
  if (raw === "cheap_stale") return raw;
  if (raw === "economy_by_neighborhood" || raw === "economy_by_city") return "neighborhood_or_city_economy";
  return raw;
}

function mapSurfaceToOrigins(surface: string) {
  if (surface === "cheapest_recent" || surface === "cheapest_near" || surface === "cheap_stale" || surface === "flex_comparator") {
    return [surface];
  }
  if (surface === "economy_by_neighborhood" || surface === "economy_by_city") {
    return ["neighborhood_or_city_economy"];
  }
  return [] as string[];
}

function parseEconomyNavigationSource(source: string) {
  if (!source.startsWith("economy:")) {
    return null;
  }

  const [, surface = "", actionOrigin = ""] = source.split(":");
  return {
    surface,
    actionOrigin: normalizeActionOrigin(actionOrigin),
  };
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function formatDecimal(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
}

function formatPercentThresholdLabel(threshold: EconomyRateThreshold) {
  return `saudavel >= ${formatDecimal(threshold.healthyMin)}% · atencao >= ${formatDecimal(threshold.attentionMin)}%`;
}

function classifyMinThreshold(value: number, denominator: number, threshold: EconomyRateThreshold): EconomyGuardrailStatus {
  if (denominator === 0) return "healthy";
  if (value >= threshold.healthyMin) return "healthy";
  if (value >= threshold.attentionMin) return "attention";
  if (denominator < threshold.sampleFloor) return "attention";
  return "problem";
}

function maxGuardrailStatus(statuses: EconomyGuardrailStatus[]) {
  if (statuses.includes("problem")) return "problem" as const;
  if (statuses.includes("attention")) return "attention" as const;
  return "healthy" as const;
}

function ensureSurfaceMetric(map: Map<string, EconomySurfaceTelemetryMetric>, key: string) {
  const current = map.get(key);
  if (current) return current;

  const next: EconomySurfaceTelemetryMetric = {
    key,
    label: SURFACE_LABELS[key] ?? key,
    views: 0,
    clicks: 0,
    openPostClicks: 0,
    routeClicks: 0,
    updatePriceClicks: 0,
    returnSignals: 0,
    returnCtaClicks: 0,
    ctr: 0,
    openPostRate: 0,
    routeRate: 0,
    updatePriceRate: 0,
    returnRate: 0,
    ctrStatus: "healthy",
    openPostStatus: "healthy",
    routeStatus: "healthy",
    updatePriceStatus: "healthy",
    returnStatus: "healthy",
    overallStatus: "healthy",
    note: "",
    recommendation: null,
  };
  map.set(key, next);
  return next;
}

function ensureOriginMetric(map: Map<string, EconomyActionOriginMetric>, key: string) {
  const current = map.get(key);
  if (current) return current;

  const next: EconomyActionOriginMetric = {
    key,
    label: ACTION_ORIGIN_LABELS[key] ?? key,
    views: 0,
    clicks: 0,
    openPostClicks: 0,
    routeClicks: 0,
    updatePriceClicks: 0,
    returnSignals: 0,
    returnCtaClicks: 0,
    ctr: 0,
    openPostRate: 0,
    routeRate: 0,
    updatePriceRate: 0,
    returnRate: 0,
    ctrStatus: "healthy",
    openPostStatus: "healthy",
    routeStatus: "healthy",
    updatePriceStatus: "healthy",
    returnStatus: "healthy",
    overallStatus: "healthy",
    note: "",
    recommendation: null,
  };
  map.set(key, next);
  return next;
}

function ensureFuelMetric(map: Map<string, EconomyFuelFilterMetric>, key: string) {
  const current = map.get(key);
  if (current) return current;

  const next: EconomyFuelFilterMetric = {
    key,
    label: key === "unknown" ? "Sem filtro" : (fuelLabels as Record<string, string>)[key] ?? key,
    views: 0,
    clicks: 0,
    openPostClicks: 0,
    routeClicks: 0,
    updatePriceClicks: 0,
    filterChanges: 0,
    ctr: 0,
    openPostRate: 0,
    routeRate: 0,
    updatePriceRate: 0,
    ctrStatus: "healthy",
    openPostStatus: "healthy",
    routeStatus: "healthy",
    updatePriceStatus: "healthy",
    overallStatus: "healthy",
    note: "",
    recommendation: null,
  };
  map.set(key, next);
  return next;
}

function bumpAction(metric: { clicks: number; openPostClicks: number; routeClicks: number; updatePriceClicks: number }, action: EconomyActionKind) {
  metric.clicks += 1;
  if (action === "open_post") metric.openPostClicks += 1;
  if (action === "route") metric.routeClicks += 1;
  if (action === "update_price") metric.updatePriceClicks += 1;
}

function summarizePerformanceMetric(metric: EconomyPerformanceBase) {
  const ctr = percentage(metric.clicks, metric.views);
  const openPostRate = percentage(metric.openPostClicks, metric.views);
  const routeRate = percentage(metric.routeClicks, metric.views);
  const updatePriceRate = percentage(metric.updatePriceClicks, metric.views);
  const ctrStatus = classifyMinThreshold(ctr, metric.views, RATE_THRESHOLDS.ctr);
  const openPostStatus = classifyMinThreshold(openPostRate, metric.views, RATE_THRESHOLDS.openPost);
  const routeStatus = classifyMinThreshold(routeRate, metric.views, RATE_THRESHOLDS.route);
  const updatePriceStatus = classifyMinThreshold(updatePriceRate, metric.views, RATE_THRESHOLDS.updatePrice);

  return {
    ctr,
    openPostRate,
    routeRate,
    updatePriceRate,
    ctrStatus,
    openPostStatus,
    routeStatus,
    updatePriceStatus,
  };
}

function summarizeSurfaceMetric(metric: EconomySurfaceTelemetryMetric): EconomySurfaceTelemetryMetric {
  const summary = summarizePerformanceMetric(metric);
  const returnRate = percentage(metric.returnSignals, metric.routeClicks);
  const returnStatus = classifyMinThreshold(returnRate, metric.routeClicks, RATE_THRESHOLDS.return);

  let recommendation: string | null = null;
  if (metric.views === 0) {
    recommendation = "Observar volume da superficie";
  } else if (summary.ctrStatus === "healthy" && summary.routeStatus === "healthy") {
    recommendation = "Manter destaque";
  } else if (summary.ctrStatus === "problem" && metric.views >= 40) {
    recommendation = summary.routeStatus === "problem" ? "Reduzir peso visual" : "Simplificar superficie";
  } else if (summary.ctrStatus === "healthy" && summary.routeStatus !== "healthy") {
    recommendation = "Testar mais destaque em rota";
  } else if (metric.routeClicks >= 5 && returnStatus !== "healthy") {
    recommendation = "Observar retorno ao app";
  }

  return {
    ...metric,
    ...summary,
    returnRate,
    returnStatus,
    overallStatus: metric.views === 0
      ? "attention"
      : maxGuardrailStatus([summary.ctrStatus, summary.routeStatus, summary.updatePriceStatus, returnStatus]),
    note: metric.views === 0
      ? "Sem volume suficiente nesta janela"
      : `CTR ${formatDecimal(summary.ctr)}% · rota ${formatDecimal(summary.routeRate)}% · retorno ${formatDecimal(returnRate)}%`,
    recommendation,
  };
}

function summarizeOriginMetric(metric: EconomyActionOriginMetric): EconomyActionOriginMetric {
  const summary = summarizePerformanceMetric(metric);
  const returnRate = percentage(metric.returnSignals, metric.routeClicks);
  const returnStatus = classifyMinThreshold(returnRate, metric.routeClicks, RATE_THRESHOLDS.return);

  let recommendation: string | null = null;
  if (metric.views === 0) {
    recommendation = "Observar volume da origem";
  } else if (summary.ctrStatus === "healthy" && summary.routeStatus === "healthy") {
    recommendation = "Manter leitura atual";
  } else if (summary.ctrStatus === "problem" && metric.views >= 20) {
    recommendation = "Simplificar superficie";
  } else if (summary.routeStatus === "healthy" && returnStatus !== "healthy") {
    recommendation = "Observar retorno ao app";
  }

  return {
    ...metric,
    ...summary,
    returnRate,
    returnStatus,
    overallStatus: metric.views === 0
      ? "attention"
      : maxGuardrailStatus([summary.ctrStatus, summary.routeStatus, returnStatus]),
    note: metric.views === 0
      ? "Sem volume suficiente nesta janela"
      : `CTR ${formatDecimal(summary.ctr)}% · rota ${formatDecimal(summary.routeRate)}% · retorno ${formatDecimal(returnRate)}%`,
    recommendation,
  };
}

function summarizeFuelMetric(metric: EconomyFuelFilterMetric): EconomyFuelFilterMetric {
  const summary = summarizePerformanceMetric(metric);

  let recommendation: string | null = null;
  if (metric.views === 0) {
    recommendation = "Sem sinal suficiente";
  } else if (summary.ctrStatus === "healthy" && summary.routeStatus === "healthy") {
    recommendation = "Combustivel com boa tracao";
  } else if (summary.ctrStatus === "problem" && metric.views >= 20) {
    recommendation = "Observar adesao do filtro";
  }

  return {
    ...metric,
    ...summary,
    overallStatus: metric.views === 0
      ? "attention"
      : maxGuardrailStatus([summary.ctrStatus, summary.routeStatus, summary.updatePriceStatus]),
    note: metric.views === 0
      ? "Sem volume suficiente nesta janela"
      : `CTR ${formatDecimal(summary.ctr)}% · rota ${formatDecimal(summary.routeRate)}% · troca ${metric.filterChanges}`,
    recommendation,
  };
}

function buildRateIndicator(input: {
  key: string;
  label: string;
  description: string;
  numerator: number;
  denominator: number;
  threshold: EconomyRateThreshold;
  note: string;
}) {
  const value = percentage(input.numerator, input.denominator);

  return {
    key: input.key,
    label: input.label,
    description: input.description,
    status: classifyMinThreshold(value, input.denominator, input.threshold),
    value,
    displayValue: `${formatDecimal(value)}%`,
    thresholdLabel: formatPercentThresholdLabel(input.threshold),
    note: input.denominator === 0 ? "Sem volume suficiente nesta janela" : input.note,
  } satisfies EconomyOperationalIndicator;
}

function buildInsightItem(input: {
  key: string;
  label: string;
  status: EconomyGuardrailStatus;
  note: string;
  recommendation?: string | null;
}) {
  return {
    key: input.key,
    label: input.label,
    status: input.status,
    note: input.note,
    recommendation: input.recommendation ?? null,
  } satisfies EconomyInsightItem;
}

function buildActionLeaders(surfaces: EconomySurfaceTelemetryMetric[]) {
  return surfaces
    .filter((surface) => surface.views >= 20 && surface.clicks > 0)
    .sort((left, right) => right.clicks - left.clicks || right.ctr - left.ctr || right.routeRate - left.routeRate)
    .slice(0, 3)
    .map((surface) => buildInsightItem({
      key: surface.key,
      label: surface.label,
      status: surface.overallStatus,
      note: `${surface.clicks} cliques · CTR ${formatDecimal(surface.ctr)}% · rota ${formatDecimal(surface.routeRate)}%`,
      recommendation: surface.recommendation,
    }));
}

function buildCuriositySurfaces(surfaces: EconomySurfaceTelemetryMetric[]) {
  return surfaces
    .filter((surface) => surface.views >= 20 && surface.ctrStatus !== "healthy")
    .sort((left, right) => right.views - left.views || left.ctr - right.ctr)
    .slice(0, 3)
    .map((surface) => buildInsightItem({
      key: surface.key,
      label: surface.label,
      status: surface.ctrStatus,
      note: `${surface.views} views · CTR ${formatDecimal(surface.ctr)}% · rota ${formatDecimal(surface.routeRate)}%`,
      recommendation: surface.recommendation ?? (surface.ctrStatus === "problem" ? "Simplificar superficie" : "Observar superficie"),
    }));
}

function buildTopFuelFilters(fuelFilters: EconomyFuelFilterMetric[]) {
  return fuelFilters
    .filter((fuel) => fuel.views >= 20)
    .sort((left, right) => right.ctr - left.ctr || right.routeRate - left.routeRate || right.clicks - left.clicks)
    .slice(0, 3)
    .map((fuel) => buildInsightItem({
      key: fuel.key,
      label: fuel.label,
      status: fuel.overallStatus,
      note: `${fuel.clicks} cliques · CTR ${formatDecimal(fuel.ctr)}% · rota ${formatDecimal(fuel.routeRate)}%`,
      recommendation: fuel.recommendation,
    }));
}

function buildTopOrigins(actionOrigins: EconomyActionOriginMetric[]) {
  return actionOrigins
    .filter((origin) => origin.views >= 10)
    .sort((left, right) => right.ctr - left.ctr || right.routeRate - left.routeRate || right.clicks - left.clicks)
    .slice(0, 3)
    .map((origin) => buildInsightItem({
      key: origin.key,
      label: origin.label,
      status: origin.overallStatus,
      note: `${origin.clicks} cliques · CTR ${formatDecimal(origin.ctr)}% · rota ${formatDecimal(origin.routeRate)}% · retorno ${formatDecimal(origin.returnRate)}%`,
      recommendation: origin.recommendation,
    }));
}

function buildGuardrailAlerts(input: {
  indicators: EconomyOperationalIndicator[];
  surfaces: EconomySurfaceTelemetryMetric[];
  origins: EconomyActionOriginMetric[];
}) {
  const alerts: EconomyOperationalAlert[] = input.indicators
    .filter((indicator) => indicator.status !== "healthy")
    .map((indicator) => ({
      id: indicator.key,
      status: indicator.status,
      title: indicator.label,
      message: `${indicator.displayValue} · ${indicator.note}`,
      recommendation: indicator.key === "overall_ctr"
        ? "Simplificar superficie"
        : indicator.key === "overall_route_rate"
          ? "Testar mais destaque em rota"
          : indicator.key === "overall_return_rate"
            ? "Observar retorno ao app"
            : "Revisar destaque desta frente",
    }));

  const curiositySurface = input.surfaces.find((surface) => surface.views >= 40 && surface.ctrStatus === "problem");
  if (curiositySurface) {
    alerts.push({
      id: `surface-${curiositySurface.key}`,
      status: curiositySurface.overallStatus,
      title: `${curiositySurface.label} puxa curiosidade, mas pouco clique`,
      message: `${curiositySurface.views} views · CTR ${formatDecimal(curiositySurface.ctr)}% · rota ${formatDecimal(curiositySurface.routeRate)}%`,
      recommendation: curiositySurface.routeStatus === "problem" ? "Reduzir peso visual" : "Simplificar superficie",
    });
  }

  const weakReturnOrigin = input.origins.find((origin) => origin.routeClicks >= 5 && origin.returnStatus === "problem");
  if (weakReturnOrigin) {
    alerts.push({
      id: `origin-return-${weakReturnOrigin.key}`,
      status: weakReturnOrigin.returnStatus,
      title: `Retorno baixo apos rota em ${weakReturnOrigin.label}`,
      message: `${weakReturnOrigin.routeClicks} rotas · retorno ${formatDecimal(weakReturnOrigin.returnRate)}%`,
      recommendation: "Observar retorno ao app",
    });
  }

  return alerts
    .sort((left, right) => {
      const leftRank = left.status === "problem" ? 2 : 1;
      const rightRank = right.status === "problem" ? 2 : 1;
      return rightRank - leftRank;
    })
    .slice(0, 5);
}

function buildGuardrailRecommendations(input: {
  surfaces: EconomySurfaceTelemetryMetric[];
  fuels: EconomyFuelFilterMetric[];
  origins: EconomyActionOriginMetric[];
  indicators: EconomyOperationalIndicator[];
}) {
  const recommendations: string[] = [];
  const leadingSurface = input.surfaces.find((surface) => surface.views >= 20 && surface.ctrStatus === "healthy" && surface.routeStatus === "healthy");
  const curiositySurface = input.surfaces.find((surface) => surface.views >= 40 && surface.ctrStatus === "problem");
  const routeCandidate = input.surfaces.find((surface) => surface.views >= 20 && surface.ctrStatus === "healthy" && surface.routeStatus !== "healthy");
  const returnSurface = input.surfaces.find((surface) => surface.routeClicks >= 5 && surface.returnStatus !== "healthy");
  const topFuel = input.fuels.find((fuel) => fuel.views >= 20 && fuel.ctrStatus === "healthy");
  const topOrigin = input.origins.find((origin) => origin.views >= 10 && origin.ctrStatus === "healthy");

  if (leadingSurface) {
    recommendations.push(`Manter destaque: ${leadingSurface.label}.`);
  }

  if (curiositySurface) {
    recommendations.push(`${curiositySurface.routeStatus === "problem" ? "Reduzir peso visual" : "Simplificar superficie"}: ${curiositySurface.label}.`);
  }

  if (routeCandidate) {
    recommendations.push(`Testar mais destaque em rota: ${routeCandidate.label}.`);
  }

  if (returnSurface) {
    recommendations.push(`Observar retorno ao app: ${returnSurface.label}.`);
  }

  if (!leadingSurface && topOrigin) {
    recommendations.push(`Manter leitura da origem: ${topOrigin.label}.`);
  }

  if (!leadingSurface && topFuel) {
    recommendations.push(`Observar tracao de combustivel: ${topFuel.label}.`);
  }

  if (recommendations.length === 0 && input.indicators.every((indicator) => indicator.status === "healthy")) {
    recommendations.push("Manter destaque atual da frente.");
  }

  return Array.from(new Set(recommendations)).slice(0, 5);
}

export async function getEconomyTelemetryReadout(windowDays = 14): Promise<EconomyTelemetryReadout> {
  const supabase = createSupabaseServiceClient();
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("operational_events")
    .select("event_type,fuel_type,payload")
    .in("event_type", ["home_block_interacted", "quick_action_clicked", "return_after_navigation"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(4000);

  const rows = (data ?? []) as EconomyTelemetryEventRow[];
  const surfaceMetrics = new Map<string, EconomySurfaceTelemetryMetric>();
  const originMetrics = new Map<string, EconomyActionOriginMetric>();
  const fuelMetrics = new Map<string, EconomyFuelFilterMetric>();

  for (const row of rows) {
    const payload = row.payload ?? {};
    const payloadSource = readPayloadString(payload, "source");
    const fuelKey = normalizeFuelKey(row.fuel_type, payload);
    const fuelMetric = ensureFuelMetric(fuelMetrics, fuelKey);

    if (row.event_type === "home_block_interacted" && payloadSource === "economy_surface") {
      const action = readPayloadString(payload, "action");
      const surface = readPayloadString(payload, "surface");
      const actionOrigin = normalizeActionOrigin(readPayloadString(payload, "actionOrigin"));

      if (action === "view" && surface) {
        ensureSurfaceMetric(surfaceMetrics, surface).views += 1;
        fuelMetric.views += 1;

        if (actionOrigin) {
          ensureOriginMetric(originMetrics, actionOrigin).views += 1;
        } else {
          mapSurfaceToOrigins(surface).forEach((origin) => {
            ensureOriginMetric(originMetrics, origin).views += 1;
          });
        }
      }

      if (action === "return_visible") {
        const parsed = parseEconomyNavigationSource(readPayloadString(payload, "navigationSource"));
        if (parsed) {
          if (parsed.surface) {
            ensureSurfaceMetric(surfaceMetrics, parsed.surface).returnSignals += 1;
          }
          ensureOriginMetric(originMetrics, parsed.actionOrigin).returnSignals += 1;
        }
      }

      continue;
    }

    if (row.event_type === "quick_action_clicked" && payloadSource === "economy_surface") {
      const action = readPayloadAction(payload);
      const surface = readPayloadString(payload, "surface");
      const actionOrigin = normalizeActionOrigin(readPayloadString(payload, "actionOrigin"));

      if (action === "filter_fuel") {
        fuelMetric.filterChanges += 1;
        continue;
      }

      if (action === "open_post" || action === "route" || action === "update_price") {
        if (surface) {
          bumpAction(ensureSurfaceMetric(surfaceMetrics, surface), action);
        }
        if (actionOrigin) {
          bumpAction(ensureOriginMetric(originMetrics, actionOrigin), action);
        }
        bumpAction(fuelMetric, action);
      }

      continue;
    }

    if (row.event_type === "return_after_navigation") {
      const parsed = parseEconomyNavigationSource(readPayloadString(payload, "source"));
      if (parsed) {
        if (parsed.surface) {
          ensureSurfaceMetric(surfaceMetrics, parsed.surface).returnCtaClicks += 1;
        }
        ensureOriginMetric(originMetrics, parsed.actionOrigin).returnCtaClicks += 1;
      }
    }
  }

  REQUIRED_SURFACES.forEach((key) => ensureSurfaceMetric(surfaceMetrics, key));
  ["nearby_opportunity", "neighborhood_or_city_economy", "flex_comparator", "followed_price_drop", "cheapest_recent", "cheapest_near", "cheap_stale"].forEach((key) => ensureOriginMetric(originMetrics, key));

  const surfaces = Array.from(surfaceMetrics.values())
    .map((surface) => summarizeSurfaceMetric(surface))
    .sort((left, right) => right.views - left.views || right.clicks - left.clicks);

  const actionOrigins = Array.from(originMetrics.values())
    .map((origin) => summarizeOriginMetric(origin))
    .sort((left, right) => right.views - left.views || right.ctr - left.ctr || right.clicks - left.clicks);

  const fuelFilters = Array.from(fuelMetrics.values())
    .map((fuel) => summarizeFuelMetric(fuel))
    .sort((left, right) => right.views - left.views || right.ctr - left.ctr || right.clicks - left.clicks);

  const totals = {
    surfaceViews: surfaces.reduce((sum, item) => sum + item.views, 0),
    actionClicks: surfaces.reduce((sum, item) => sum + item.clicks, 0),
    openPostClicks: surfaces.reduce((sum, item) => sum + item.openPostClicks, 0),
    routeClicks: surfaces.reduce((sum, item) => sum + item.routeClicks, 0),
    updatePriceClicks: surfaces.reduce((sum, item) => sum + item.updatePriceClicks, 0),
    filterChanges: fuelFilters.reduce((sum, item) => sum + item.filterChanges, 0),
    returnSignals: actionOrigins.reduce((sum, item) => sum + item.returnSignals, 0),
    returnCtaClicks: actionOrigins.reduce((sum, item) => sum + item.returnCtaClicks, 0),
    ctr: 0,
    openPostRate: 0,
    routeRate: 0,
    updatePriceRate: 0,
    returnRate: 0,
  };

  totals.ctr = percentage(totals.actionClicks, totals.surfaceViews);
  totals.openPostRate = percentage(totals.openPostClicks, totals.surfaceViews);
  totals.routeRate = percentage(totals.routeClicks, totals.surfaceViews);
  totals.updatePriceRate = percentage(totals.updatePriceClicks, totals.surfaceViews);
  totals.returnRate = percentage(totals.returnSignals, totals.routeClicks);

  const indicators = [
    buildRateIndicator({
      key: "overall_ctr",
      label: "CTR da frente",
      description: "Quanto das exibicoes vira clique em acao relevante.",
      numerator: totals.actionClicks,
      denominator: totals.surfaceViews,
      threshold: RATE_THRESHOLDS.ctr,
      note: `${totals.actionClicks} cliques em ${totals.surfaceViews} views`,
    }),
    buildRateIndicator({
      key: "overall_open_post_rate",
      label: "Taxa de ver posto",
      description: "Quanto da frente leva para leitura mais funda do posto.",
      numerator: totals.openPostClicks,
      denominator: totals.surfaceViews,
      threshold: RATE_THRESHOLDS.openPost,
      note: `${totals.openPostClicks} cliques em ver posto`,
    }),
    buildRateIndicator({
      key: "overall_route_rate",
      label: "Taxa de rota",
      description: "Quanto da frente realmente aciona navegacao para o posto.",
      numerator: totals.routeClicks,
      denominator: totals.surfaceViews,
      threshold: RATE_THRESHOLDS.route,
      note: `${totals.routeClicks} rotas em ${totals.surfaceViews} views`,
    }),
    buildRateIndicator({
      key: "overall_update_price_rate",
      label: "Taxa de atualizar preço",
      description: "Quanto da frente gera vontade de contribuir com atualização.",
      numerator: totals.updatePriceClicks,
      denominator: totals.surfaceViews,
      threshold: RATE_THRESHOLDS.updatePrice,
      note: `${totals.updatePriceClicks} cliques em atualizar preço`,
    }),
    buildRateIndicator({
      key: "overall_return_rate",
      label: "Retorno ao app apos rota",
      description: "Quanto das rotas volta para o home com handoff visivel.",
      numerator: totals.returnSignals,
      denominator: totals.routeClicks,
      threshold: RATE_THRESHOLDS.return,
      note: `${totals.returnSignals} retornos visiveis em ${totals.routeClicks} rotas`,
    }),
  ];

  const insights = {
    actionLeaders: buildActionLeaders(surfaces),
    curiositySurfaces: buildCuriositySurfaces(surfaces),
    topFuelFilters: buildTopFuelFilters(fuelFilters),
    topOrigins: buildTopOrigins(actionOrigins),
  };

  const alerts = buildGuardrailAlerts({
    indicators,
    surfaces,
    origins: actionOrigins,
  });

  const recommendations = buildGuardrailRecommendations({
    surfaces,
    fuels: fuelFilters,
    origins: actionOrigins,
    indicators,
  });

  return {
    generatedAt: new Date().toISOString(),
    windowDays,
    totals,
    guardrails: {
      overallStatus: maxGuardrailStatus(indicators.map((indicator) => indicator.status)),
      indicators,
      alerts,
      recommendations,
    },
    insights,
    surfaces,
    actionOrigins,
    fuelFilters,
  };
}
