"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Route } from "next";
import { MapPinned, Navigation, Sparkles } from "lucide-react";

import { EmptyStateCard } from "@/components/state/empty-state-card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { getSelectedStationReport, type FuelFilter } from "@/lib/filters/public";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { fuelLabels } from "@/lib/format/labels";
import { formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { formatDistanceFromYou } from "@/lib/geo/distance";
import type { FunctionalRegion } from "@/lib/geo/functional-regions";
import { pickBestValueRecommendation, pickNearbyRecommendation } from "@/lib/navigation/nearby-recommendation";
import { rememberStationVisit } from "@/lib/navigation/home-context";
import { openExternalNavigation } from "@/lib/navigation/external-maps";
import { getStationPublicName } from "@/lib/quality/stations";
import { trackProductEvent } from "@/lib/telemetry/client";
import type { FuelType, StationWithReports } from "@/lib/types";

const HomeMapSurface = dynamic(() => import("@/components/home/home-map-surface").then((mod) => mod.HomeMapSurface), {
  ssr: false,
  loading: () => <div className="h-[220px] rounded-[22px] border border-white/8 bg-white/[0.04]" />
});

const emittedRecommendationDecisionKeys = new Set<string>();

const DETOUR_COST_PER_KM = 0.5;
type DecisionLabel = "vale no caminho" | "vale pequeno desvio" | "barato, mas longe" | "barato, mas velho";
type ConfidenceMeta = { detail: string; variant: "default" | "warning" | "secondary"; score: number };
type StationReport = NonNullable<ReturnType<typeof getSelectedStationReport>>;
type Candidate = { station: StationWithReports; report: StationReport; distance: number | null; recencyTone: ReturnType<typeof getRecencyTone>; confidence: ConfidenceMeta };
type Ranked = Candidate & {
  scopeLowestPrice: number;
  grossSavings40: number;
  grossSavings50: number;
  netSavings40: number;
  netSavings50: number;
  detourCost: number;
  valueScore: number;
  decisionLabel: DecisionLabel;
  rationale: string;
  isRegionLowest: boolean;
};

interface HomeSimplifiedSectionsProps {
  contextHref: string;
  fuelFilter: FuelFilter;
  decisionStations: StationWithReports[];
  mapStations: StationWithReports[];
  noRecentStations: StationWithReports[];
  railSendHref: Route;
  decisionCity: string;
  query: string;
  functionalRegion: FunctionalRegion | null;
  center: { lat: number; lng: number } | null;
  userLocation: { lat: number; lng: number; accuracy: number; trustStatus: "confiável" | "provável" | "incerto"; speed: number | null } | null;
  onStationTrack?: (scopeId: string) => void;
}

function getStationHref(stationId: string, returnToHref?: string, fuel?: FuelFilter | FuelType) {
  const params = new URLSearchParams();
  if (fuel && fuel !== "all") params.set("fuel", fuel);
  if (returnToHref) params.set("returnTo", returnToHref);
  const suffix = params.toString();
  return suffix ? (`/postos/${stationId}?${suffix}` as Route) : (`/postos/${stationId}` as Route);
}

function getSendHref(stationId: string, returnToHref?: string, fuel?: FuelFilter | FuelType) {
  const params = new URLSearchParams();
  params.set("stationId", stationId);
  if (fuel && fuel !== "all") params.set("fuel", fuel);
  if (returnToHref) params.set("returnTo", returnToHref);
  return (`/enviar?${params.toString()}#photo` as Route);
}

function getDistanceValue(station: StationWithReports) {
  const distance = Number(station.distance);
  return Number.isFinite(distance) && distance >= 0 ? distance : null;
}

function resolvePrimaryFuel(stations: StationWithReports[], requestedFuel: FuelFilter): FuelType {
  if (requestedFuel !== "all") return requestedFuel;
  const counts = new Map<FuelType, number>();
  for (const station of stations) for (const report of [...station.recentReports, ...station.latestReports]) counts.set(report.fuelType, (counts.get(report.fuelType) ?? 0) + 1);
  if (counts.has("gasolina_comum")) return "gasolina_comum";
  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "gasolina_comum";
}

function getReportConfidenceMeta(report: StationReport): ConfidenceMeta {
  const evidenceMode = String(report?.metadata?.evidence_mode ?? "");
  if (evidenceMode === "sem_placa_faixa") return { detail: "Sem placa", variant: "warning", score: 0.42 };
  if (report.locationConfidence === "high") return { detail: "GPS forte", variant: "default", score: 1 };
  if (report.locationConfidence === "low") return { detail: "GPS razoável", variant: "warning", score: 0.74 };
  return { detail: "Vale checar", variant: "secondary", score: 0.58 };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scoreDistance(distance: number | null) {
  if (distance === null) return 0.34;
  if (distance <= 1_000) return 1;
  if (distance <= 2_000) return 0.86;
  if (distance <= 4_000) return 0.68;
  if (distance <= 6_500) return 0.42;
  if (distance <= 10_000) return 0.22;
  return 0.08;
}

function canNavigate(station: StationWithReports) {
  return Number.isFinite(Number(station.lat)) && Number.isFinite(Number(station.lng));
}

function rankByPrice(left: Candidate | Ranked, right: Candidate | Ranked) {
  const priceDiff = Number(left.report.price) - Number(right.report.price);
  if (priceDiff !== 0) return priceDiff;
  const toneRank = { fresh: 0, warning: 1, stale: 2 } as const;
  const toneDiff = toneRank[left.recencyTone] - toneRank[right.recencyTone];
  if (toneDiff !== 0) return toneDiff;
  return (left.distance ?? Number.MAX_SAFE_INTEGER) - (right.distance ?? Number.MAX_SAFE_INTEGER);
}

function buildRankedCandidate(candidate: Candidate, scopeAveragePrice: number, scopeLowestPrice: number): Ranked {
  const priceGapToLowest = Math.max(0, Number(candidate.report.price) - scopeLowestPrice);
  const savingsPerLiter = Math.max(0, scopeAveragePrice - Number(candidate.report.price));
  const grossSavings40 = savingsPerLiter * 40;
  const grossSavings50 = savingsPerLiter * 50;
  const detourCost = candidate.distance === null ? 0 : (candidate.distance / 1000) * DETOUR_COST_PER_KM;
  const netSavings40 = Math.max(0, grossSavings40 - detourCost);
  const netSavings50 = Math.max(0, grossSavings50 - detourCost);
  const recencyScore = candidate.recencyTone === "fresh" ? 1 : candidate.recencyTone === "warning" ? 0.7 : 0.26;
  const valueScore = clamp(1 - priceGapToLowest / 0.65, 0, 1) * 0.22 + clamp(netSavings50 / 12, 0, 1) * 0.29 + scoreDistance(candidate.distance) * 0.18 + recencyScore * 0.17 + candidate.confidence.score * 0.14 - (candidate.distance !== null && candidate.distance > 4_000 && netSavings50 < 4 ? 0.08 : 0);
  const decisionLabel: DecisionLabel = candidate.recencyTone === "stale" ? "barato, mas velho" : candidate.distance !== null && candidate.distance <= 1_800 && netSavings40 >= 1.2 ? "vale no caminho" : netSavings50 >= 5 || (candidate.distance !== null && candidate.distance <= 4_000 && netSavings40 >= 2.2) ? "vale pequeno desvio" : "barato, mas longe";
  const rationale = decisionLabel === "barato, mas velho"
    ? "Preço interessante, mas a leitura já passou da janela de 3 semanas e pede atualização antes do desvio."
    : candidate.confidence.score < 0.65
      ? "Preço bom, mas a confiança do ponto ainda pede checagem antes de transformar isso em desvio."
      : decisionLabel === "vale no caminho"
        ? `Economia líquida segura: ${formatCurrencyBRL(netSavings40)} em 40L sem tirar você do trajeto.`
        : decisionLabel === "vale pequeno desvio"
          ? `A conta fecha para um desvio curto: sobra cerca de ${formatCurrencyBRL(netSavings50)} em 50L depois do deslocamento.`
          : "Preço bom, mas a distância come parte demais da vantagem real.";
  return { ...candidate, scopeLowestPrice, grossSavings40, grossSavings50, netSavings40, netSavings50, detourCost, valueScore, decisionLabel, rationale, isRegionLowest: priceGapToLowest <= 0.001 };
}

function trackAction(station: StationWithReports, fuel: FuelType, mode: "near" | "region" | "value", action: "photo" | "station", scopeId: string) {
  void trackProductEvent({
    eventType: "quick_action_clicked",
    pagePath: "/",
    pageTitle: "Home",
    stationId: station.id,
    scopeType: "block",
    scopeId,
    payload: { source: "home_simplified", action, fuelType: fuel, mode }
  });
}

export function HomeSimplifiedSections({
  contextHref,
  fuelFilter,
  decisionStations,
  mapStations,
  noRecentStations,
  railSendHref,
  decisionCity,
  query,
  functionalRegion,
  center,
  userLocation,
  onStationTrack
}: HomeSimplifiedSectionsProps) {
  const [showMap, setShowMap] = useState(false);
  const primaryFuel = useMemo(() => resolvePrimaryFuel(decisionStations, fuelFilter), [decisionStations, fuelFilter]);

  const candidates = useMemo(() => {
    return decisionStations
      .map((station) => {
        const report = getSelectedStationReport(station, primaryFuel);
        if (!report) return null;
        return { station, report, distance: getDistanceValue(station), recencyTone: getRecencyTone(report.reportedAt), confidence: getReportConfidenceMeta(report) } satisfies Candidate;
      })
      .filter((item): item is Candidate => Boolean(item));
  }, [decisionStations, primaryFuel]);

  const scopeCandidates = useMemo(() => {
    const fresh = candidates.filter((item) => item.recencyTone !== "stale");
    return fresh.length > 0 ? fresh : candidates;
  }, [candidates]);

  const rankedCandidates = useMemo(() => {
    if (scopeCandidates.length === 0) return [];
    const prices = scopeCandidates.map((item) => Number(item.report.price));
    const average = prices.reduce((sum, value) => sum + value, 0) / prices.length;
    const lowest = Math.min(...prices);
    return scopeCandidates.map((item) => buildRankedCandidate(item, average, lowest));
  }, [scopeCandidates]);

  const nearYou = useMemo(() => {
    return pickNearbyRecommendation(rankedCandidates.map((item) => ({
      ...item,
      price: Number(item.report.price),
      confidenceScore: item.confidence.score
    })));
  }, [rankedCandidates]);
  const regionTopThree = useMemo(() => [...rankedCandidates].sort(rankByPrice).slice(0, 3), [rankedCandidates]);
  const bestForYou = useMemo(() => {
    return pickBestValueRecommendation(rankedCandidates.map((item) => ({
      ...item,
      id: item.station.id,
      price: Number(item.report.price),
      confidenceScore: item.confidence.score
    })), nearYou ? {
      ...nearYou,
      id: nearYou.station.id,
      price: Number(nearYou.report.price),
      confidenceScore: nearYou.confidence.score
    } : null);
  }, [nearYou, rankedCandidates]);
  const absoluteNearest = useMemo(() => {
    const pool = rankedCandidates.filter((item) => item.distance !== null);
    if (pool.length === 0) return null;
    return [...pool].sort((left, right) => (left.distance ?? Infinity) - (right.distance ?? Infinity) || rankByPrice(left, right))[0] ?? null;
  }, [rankedCandidates]);
  const queryIgnored = Boolean((functionalRegion || decisionCity) && query.trim());
  const recommendationDecisionKey = useMemo(() => {
    if (!bestForYou || !nearYou) return null;
    return [
      primaryFuel,
      nearYou.station.id,
      bestForYou.station.id,
      absoluteNearest?.station.id ?? "no-nearest",
      nearYou.distance ?? "no-distance",
      bestForYou.distance ?? "no-distance",
      absoluteNearest?.distance ?? "no-distance",
      Number(nearYou.report.price).toFixed(2),
      Number(bestForYou.report.price).toFixed(2),
      absoluteNearest ? Number(absoluteNearest.report.price).toFixed(2) : "no-price"
    ].join("::");
  }, [absoluteNearest, bestForYou, nearYou, primaryFuel]);

  useEffect(() => {
    if (!recommendationDecisionKey || !bestForYou || !nearYou) {
      return;
    }

    if (emittedRecommendationDecisionKeys.has(recommendationDecisionKey)) {
      return;
    }

    emittedRecommendationDecisionKeys.add(recommendationDecisionKey);

    void trackProductEvent({
      eventType: "home_recommendation_decided",
      pagePath: "/",
      pageTitle: "Home",
      stationId: bestForYou.station.id,
      city: decisionCity || bestForYou.station.city || nearYou.station.city || null,
      fuelType: primaryFuel,
      scopeType: "home_recommendation",
      scopeId: "quick_decision",
      payload: {
        nearStationId: nearYou.station.id,
        nearDistance: nearYou.distance,
        nearPrice: Number(nearYou.report.price),
        nearDecisionLabel: nearYou.decisionLabel,
        bestStationId: bestForYou.station.id,
        bestDistance: bestForYou.distance,
        bestPrice: Number(bestForYou.report.price),
        bestDecisionLabel: bestForYou.decisionLabel,
        bestValueScore: Number(bestForYou.valueScore.toFixed(4)),
        absoluteNearestStationId: absoluteNearest?.station.id ?? null,
        absoluteNearestDistance: absoluteNearest?.distance ?? null,
        absoluteNearestPrice: absoluteNearest ? Number(absoluteNearest.report.price) : null,
        nearOverridesAbsoluteNearest: Boolean(absoluteNearest && absoluteNearest.station.id !== nearYou.station.id),
        bestAlignedWithNear: bestForYou.station.id === nearYou.station.id,
        nearVsBestDistanceGap: nearYou.distance !== null && bestForYou.distance !== null ? bestForYou.distance - nearYou.distance : null,
        nearVsBestPriceGap: Number((Number(bestForYou.report.price) - Number(nearYou.report.price)).toFixed(2)),
        nearVsBestScoreGap: Number((bestForYou.valueScore - nearYou.valueScore).toFixed(4)),
        regionTopStationId: regionTopThree[0]?.station.id ?? null,
        regionTopPrice: regionTopThree[0] ? Number(regionTopThree[0].report.price) : null,
        candidateCount: rankedCandidates.length,
        queryIgnored,
        hasFunctionalRegion: Boolean(functionalRegion)
      }
    });
  }, [absoluteNearest, bestForYou, decisionCity, functionalRegion, nearYou, primaryFuel, queryIgnored, rankedCandidates.length, recommendationDecisionKey, regionTopThree]);

  const regionLabel = decisionCity ? `Entorno de ${decisionCity}` : functionalRegion ? "Recorte regional agora" : "Recorte regional agora";
  const regionScopeNote = functionalRegion ? `A leitura territorial abre um raio regional mais largo a partir de ${decisionCity || "sua posição"}, sem depender da fronteira administrativa de uma cidade só.` : decisionCity ? `O bloco bruto usa ${decisionCity} como âncora territorial a partir do GPS.` : "Sem cidade definida; a leitura segue o recorte aberto.";
  const coverageNote = noRecentStations.length > 0 ? `${noRecentStations.length} postos ainda pedem atualização para cobrir melhor o recorte.` : "A cobertura recente está estável neste recorte.";

  if (!bestForYou || regionTopThree.length === 0) {
    return (
      <SectionCard className="space-y-4 overflow-hidden">
        <EmptyStateCard title="Ainda não existe base suficiente para separar proximidade, melhor escolha e preço regional." description="Assim que aparecer preço recente para este combustível, a home passa a comparar o eixo urbano funcional e o custo-benefício real." actionHref={railSendHref} actionLabel="Atualizar preço" className="text-left" />
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard className="space-y-4 overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Decisão rápida</p>
            <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">Perto, melhor escolha e melhor preço regional</h2>
            <p className="mt-1 text-sm text-white/52">A home responde o que está perto, o que mais compensa e o menor preço relevante no eixo urbano que você realmente percorre.</p>
          </div>
          <Badge variant="warning" className="max-w-full self-start text-[10px]"><Sparkles className="h-3.5 w-3.5" />{fuelLabels[primaryFuel]}</Badge>
        </div>

        <div className="grid min-w-0 gap-3 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="min-w-0 space-y-3">
            {nearYou ? (
              <div className="overflow-hidden rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Perto de você</p>
                    <h3 className="mt-1 break-words text-base font-semibold leading-snug text-white">{getStationPublicName(nearYou.station)}</h3>
                    <p className="mt-1 break-words text-[11px] uppercase tracking-[0.16em] text-white/34">{[nearYou.station.neighborhood, nearYou.station.city].filter(Boolean).join(" · ") || "Recorte aberto"}</p>
                  </div>
                  <div className="w-full max-w-full text-left sm:w-auto sm:shrink-0 sm:text-right">
                    <p className="text-lg font-black tracking-tight text-white">{formatCurrencyBRL(Number(nearYou.report.price))}</p>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">{fuelLabels[nearYou.report.fuelType]}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {bestForYou.station.id === nearYou.station.id ? <Badge variant="default" className="text-[10px]">Melhor para você</Badge> : null}
                  {regionTopThree[0]?.station.id === nearYou.station.id ? <Badge variant="warning" className="text-[10px]">Menor preço da região</Badge> : null}
                  <Badge variant={recencyToneToBadgeVariant(nearYou.recencyTone)} className="text-[10px]">{formatRecencyLabel(nearYou.report.reportedAt)}</Badge>
                  {nearYou.distance !== null ? <Badge variant="outline" className="text-[10px]">{formatDistanceFromYou(nearYou.distance)}</Badge> : null}
                </div>
                <p className="mt-3 text-sm text-white/56">{nearYou.distance !== null ? absoluteNearest && absoluteNearest.station.id !== nearYou.station.id ? `Aqui entram distância e preço juntos. Ele não é o mais colado no mapa, mas fecha melhor a conta perto de você agora em ${formatDistanceFromYou(nearYou.distance)}.` : `Aqui entram distância e preço juntos. Este é o melhor equilíbrio perto de você agora em ${formatDistanceFromYou(nearYou.distance)}.` : "Sem GPS forte agora, então a leitura de proximidade fica conservadora."}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <ButtonLink href={getStationHref(nearYou.station.id, contextHref, primaryFuel)} variant="secondary" className="min-h-10 justify-center px-4 text-[10px] font-black uppercase tracking-[0.16em]" onClick={() => { rememberStationVisit({ id: nearYou.station.id, name: getStationPublicName(nearYou.station), city: nearYou.station.city }); trackAction(nearYou.station, primaryFuel, "near", "station", "home-nearby-view"); onStationTrack?.(`near-view-${nearYou.station.id}`); }}>Ver posto</ButtonLink>
                  <Button type="button" variant="ghost" disabled={!canNavigate(nearYou.station)} className="min-h-10 justify-center px-4 text-[10px] font-black uppercase tracking-[0.16em] text-white/78 disabled:text-white/28" onClick={() => { if (!canNavigate(nearYou.station)) return; rememberStationVisit({ id: nearYou.station.id, name: getStationPublicName(nearYou.station), city: nearYou.station.city }); onStationTrack?.(`near-route-${nearYou.station.id}`); openExternalNavigation({ lat: nearYou.station.lat, lng: nearYou.station.lng, stationId: nearYou.station.id, stationName: getStationPublicName(nearYou.station), source: "home_near_you" }); }}><Navigation className="h-4 w-4" />Traçar rota</Button>
                </div>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-[22px] border border-[color:var(--color-accent)]/18 bg-[linear-gradient(180deg,rgba(255,199,0,0.12),rgba(255,255,255,0.03))] p-4 sm:rounded-[24px] sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Melhor preço da região</p>
                  <h3 className="mt-1 break-words text-base font-semibold leading-snug text-white sm:text-lg">{regionLabel}</h3>
                  <p className="mt-1 text-sm text-white/52">Leitura ampla do entorno regional. O mais barato aqui não é automaticamente a melhor ida.</p>
                </div>
                <Badge variant="warning" className="max-w-full self-start text-[10px]">{fuelLabels[primaryFuel]}</Badge>
              </div>
              {queryIgnored ? <div className="mt-3 break-words rounded-[16px] border border-white/8 bg-black/18 px-3 py-2 text-xs leading-relaxed text-white/56">A busca digitada não altera este ranking. Aqui entra o recorte regional inteiro.</div> : null}
              <div className="mt-4 space-y-3">
                {regionTopThree.map((entry, index) => (
                  <div key={`region-top-${entry.station.id}`} className="overflow-hidden rounded-[18px] border border-white/8 bg-black/20 px-3 py-3 sm:px-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={index === 0 ? "warning" : "secondary"} className="px-2 text-[10px]">#{index + 1}</Badge>
                          {bestForYou.station.id === entry.station.id ? <Badge variant="default" className="text-[10px]">Melhor para você</Badge> : null}
                          {nearYou?.station.id === entry.station.id ? <Badge variant="outline" className="text-[10px]">Perto</Badge> : null}
                        </div>
                        <p className="mt-2 break-words text-[15px] font-semibold leading-snug text-white">{getStationPublicName(entry.station)}</p>
                        <p className="break-words text-[11px] uppercase tracking-[0.16em] text-white/34">{[entry.station.neighborhood, entry.station.city].filter(Boolean).join(" · ") || "Sem bairro"}</p>
                      </div>
                      <div className="w-full max-w-full text-left sm:w-auto sm:shrink-0 sm:text-right">
                        <p className="text-lg font-black tracking-tight text-white sm:text-xl">{formatCurrencyBRL(Number(entry.report.price))}</p>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">{fuelLabels[entry.report.fuelType]}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant={recencyToneToBadgeVariant(entry.recencyTone)} className="text-[10px]">{formatRecencyLabel(entry.report.reportedAt)}</Badge>
                      {entry.distance !== null ? <Badge variant="outline" className="text-[10px]">{formatDistanceFromYou(entry.distance)}</Badge> : null}
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="min-w-0 break-words text-xs leading-relaxed text-white/46">{index === 0 ? "Menor preço bruto relevante no recorte regional." : "Leitura ampla da região, não da melhor ida."}</p>
                      <ButtonLink href={getStationHref(entry.station.id, contextHref, primaryFuel)} variant="secondary" className="min-h-8 w-full justify-center px-3 text-[9px] font-black uppercase tracking-[0.14em] sm:w-auto sm:shrink-0" onClick={() => { rememberStationVisit({ id: entry.station.id, name: getStationPublicName(entry.station), city: entry.station.city }); trackAction(entry.station, primaryFuel, "region", "station", `home-region-top-${index + 1}`); onStationTrack?.(`region-top-${index + 1}-${entry.station.id}`); }}>Ver posto</ButtonLink>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[22px] border border-emerald-400/18 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(255,255,255,0.03))] p-4 sm:rounded-[24px] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Vale mais a pena para você</p>
                <h3 className="mt-1 text-base font-semibold text-white sm:text-lg">{bestForYou.decisionLabel}</h3>
                <p className="mt-1 text-sm text-white/52">Preço, distância, recência, confiança, economia estimada e penalidade por desvio entram na conta. Quando o ganho é parecido, o trajeto mais curto vence.</p>
              </div>
              <Badge variant="default" className="max-w-full self-start text-[10px]">{fuelLabels[primaryFuel]}</Badge>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default" className="text-[10px]">{bestForYou.decisionLabel}</Badge>
                  {regionTopThree[0]?.station.id === bestForYou.station.id ? <Badge variant="warning" className="text-[10px]">Menor preço da região</Badge> : null}
                  {nearYou?.station.id === bestForYou.station.id ? <Badge variant="outline" className="text-[10px]">Perto de você</Badge> : null}
                </div>
                <p className="mt-2 break-words text-lg font-semibold leading-snug text-white">{getStationPublicName(bestForYou.station)}</p>
                <p className="break-words text-[11px] uppercase tracking-[0.16em] text-white/34">{[bestForYou.station.neighborhood, bestForYou.station.city].filter(Boolean).join(" · ") || "Recorte aberto"}</p>
              </div>
              <div className="w-full max-w-full text-left sm:w-auto sm:shrink-0 sm:text-right">
                <p className="break-words text-[1.5rem] font-black tracking-tight text-white sm:text-[2rem]">{formatCurrencyBRL(Number(bestForYou.report.price))}</p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">{fuelLabels[bestForYou.report.fuelType]}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-white/62">{bestForYou.rationale}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={recencyToneToBadgeVariant(bestForYou.recencyTone)} className="text-[10px]">{formatRecencyLabel(bestForYou.report.reportedAt)}</Badge>
              <Badge variant={bestForYou.confidence.variant} className="text-[10px]">{bestForYou.confidence.detail}</Badge>
              {bestForYou.distance !== null ? <Badge variant="outline" className="text-[10px]">{formatDistanceFromYou(bestForYou.distance)}</Badge> : null}
              <Badge variant="accent" className="text-[10px]">{formatCurrencyBRL(bestForYou.netSavings40)} líquido em 40L</Badge>
              <Badge variant="accent" className="text-[10px]">{formatCurrencyBRL(bestForYou.netSavings50)} líquido em 50L</Badge>
            </div>
            <div className="mt-3 rounded-[18px] border border-white/8 bg-black/18 px-3 py-3 text-sm leading-relaxed text-white/58">
              Economia bruta: {formatCurrencyBRL(bestForYou.grossSavings40)} em 40L e {formatCurrencyBRL(bestForYou.grossSavings50)} em 50L.
              {bestForYou.distance !== null ? ` O desvio pesa cerca de ${formatCurrencyBRL(bestForYou.detourCost)} nessa conta.` : " Sem GPS forte, então a conta líquida fica mais conservadora."}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <ButtonLink href={getStationHref(bestForYou.station.id, contextHref, primaryFuel)} variant="secondary" className="min-h-10 justify-center px-4 text-[10px] font-black uppercase tracking-[0.16em]" onClick={() => { rememberStationVisit({ id: bestForYou.station.id, name: getStationPublicName(bestForYou.station), city: bestForYou.station.city }); trackAction(bestForYou.station, primaryFuel, "value", "station", "home-best-for-you-view"); onStationTrack?.(`value-view-${bestForYou.station.id}`); }}>Ver posto</ButtonLink>
              <ButtonLink href={getSendHref(bestForYou.station.id, contextHref, primaryFuel)} className="min-h-10 justify-center px-4 text-[10px] font-black uppercase tracking-[0.16em]" onClick={() => { rememberStationVisit({ id: bestForYou.station.id, name: getStationPublicName(bestForYou.station), city: bestForYou.station.city }); trackAction(bestForYou.station, primaryFuel, "value", "photo", "home-best-for-you-update"); onStationTrack?.(`value-update-${bestForYou.station.id}`); }}>Atualizar preço</ButtonLink>
              <Button type="button" variant="ghost" disabled={!canNavigate(bestForYou.station)} className="min-h-10 justify-center px-4 text-[10px] font-black uppercase tracking-[0.16em] text-white/78 disabled:text-white/28" onClick={() => { if (!canNavigate(bestForYou.station)) return; rememberStationVisit({ id: bestForYou.station.id, name: getStationPublicName(bestForYou.station), city: bestForYou.station.city }); onStationTrack?.(`value-route-${bestForYou.station.id}`); openExternalNavigation({ lat: bestForYou.station.lat, lng: bestForYou.station.lng, stationId: bestForYou.station.id, stationName: getStationPublicName(bestForYou.station), source: "home_best_for_you" }); }}><Navigation className="h-4 w-4" />Traçar rota</Button>
            </div>
          </div>
        </div>

        <div className="rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Leitura da região funcional</p>
          <p className="mt-1 text-sm text-white/52">{regionScopeNote} O bloco principal deixa de depender só da fronteira administrativa do município e passa a olhar o deslocamento real dentro do eixo regional.</p>
        </div>

        <div className="rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Leitura do custo-benefício</p>
          <p className="mt-1 text-sm text-white/52">O card da esquerda já não sobe só o posto mais perto: ele compara preço e deslocamento curto. O card da direita segue olhando a conta completa por tanque para achar o melhor custo-benefício geral.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {mapStations.length > 0 ? <Button type="button" variant="secondary" onClick={() => setShowMap((value) => !value)} className="h-11 flex-1 justify-center px-4 text-[11px] font-black uppercase tracking-[0.18em]"><MapPinned className="h-4 w-4" />{showMap ? "Fechar mapa" : "Abrir mapa"}</Button> : null}
          <ButtonLink href={railSendHref} className="h-11 flex-1 justify-center px-4 text-[11px] font-black uppercase tracking-[0.18em]">Atualizar preço</ButtonLink>
        </div>

        <p className="text-[11px] text-white/42">
          Se você quiser abrir a camada territorial sem carregar a home, use{" "}
          <a href={"/atualizacoes/panorama" as Route} className="text-[color:var(--color-accent)] underline-offset-4 hover:underline">
            Panorama regional
          </a>
          .
        </p>

        <p className="text-[11px] text-white/42">O topo olha {functionalRegion ? "a região funcional" : "o recorte selecionado"} para achar o menor preço relevante. O card pessoal só sobe quando preço, distância, recência, confiança e penalidade por desvio fecham a conta real. {coverageNote}</p>

        {showMap ? (
          <div className="pt-1">
            <HomeMapSurface stations={mapStations} contextHref={contextHref} fuelFilter={fuelFilter} center={center} userLocation={userLocation} preferListFirst={false} />
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
