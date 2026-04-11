"use client";

import { useMemo, useState } from "react";
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
import { rememberStationVisit } from "@/lib/navigation/home-context";
import { openExternalNavigation } from "@/lib/navigation/external-maps";
import { getStationPublicName } from "@/lib/quality/stations";
import { trackProductEvent } from "@/lib/telemetry/client";
import type { FuelType, StationWithReports } from "@/lib/types";

const HomeMapSurface = dynamic(() => import("@/components/home/home-map-surface").then((mod) => mod.HomeMapSurface), {
  ssr: false,
  loading: () => <div className="h-[220px] rounded-[22px] border border-white/8 bg-white/[0.04]" />
});

const DETOUR_COST_PER_KM = 0.5;

type DecisionLabel =
  | "vale no caminho"
  | "vale pequeno desvio"
  | "só compensa se você já for passar"
  | "barato, mas velho"
  | "mais barato da cidade, mas longe";

type ConfidenceMeta = {
  label: string;
  detail: string;
  variant: "default" | "warning" | "secondary";
  score: number;
};

type StationReport = NonNullable<ReturnType<typeof getSelectedStationReport>>;

interface CandidateEntry {
  station: StationWithReports;
  report: StationReport;
  distance: number | null;
  recencyTone: ReturnType<typeof getRecencyTone>;
  confidence: ConfidenceMeta;
}

interface RankedCandidate extends CandidateEntry {
  cityAveragePrice: number;
  cityLowestPrice: number;
  priceGapToLowest: number;
  savingsPerLiter: number;
  grossSavings40: number;
  grossSavings50: number;
  netSavings40: number;
  netSavings50: number;
  detourCost: number;
  valueScore: number;
  decisionLabel: DecisionLabel;
  rationale: string;
  isCityLowest: boolean;
}

interface HomeSimplifiedSectionsProps {
  contextHref: string;
  fuelFilter: FuelFilter;
  decisionStations: StationWithReports[];
  mapStations: StationWithReports[];
  noRecentStations: StationWithReports[];
  railSendHref: Route;
  selectedCity: string;
  query: string;
  center: { lat: number; lng: number } | null;
  userLocation: { lat: number; lng: number; accuracy: number; trustStatus: "confiável" | "provável" | "incerto"; speed: number | null } | null;
  onStationTrack?: (scopeId: string) => void;
}

function getStationHref(stationId: string, returnToHref?: string, fuel?: FuelFilter | FuelType) {
  const params = new URLSearchParams();
  if (fuel && fuel !== "all") {
    params.set("fuel", fuel);
  }
  if (returnToHref) {
    params.set("returnTo", returnToHref);
  }

  const suffix = params.toString();
  return suffix ? (`/postos/${stationId}?${suffix}` as Route) : (`/postos/${stationId}` as Route);
}

function getSendHref(stationId: string, returnToHref?: string, fuel?: FuelFilter | FuelType) {
  const params = new URLSearchParams();
  params.set("stationId", stationId);
  if (fuel && fuel !== "all") {
    params.set("fuel", fuel);
  }
  if (returnToHref) {
    params.set("returnTo", returnToHref);
  }

  return (`/enviar?${params.toString()}#photo` as Route);
}

function getDistanceValue(station: StationWithReports) {
  const distance = Number(station.distance);
  return Number.isFinite(distance) && distance >= 0 ? distance : null;
}

function resolvePrimaryFuel(orderedStations: StationWithReports[], requestedFuel: FuelFilter): FuelType {
  if (requestedFuel !== "all") {
    return requestedFuel;
  }

  const counts = new Map<FuelType, number>();
  for (const station of orderedStations) {
    for (const report of [...station.recentReports, ...station.latestReports]) {
      counts.set(report.fuelType, (counts.get(report.fuelType) ?? 0) + 1);
    }
  }

  if (counts.has("gasolina_comum")) {
    return "gasolina_comum";
  }

  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "gasolina_comum";
}

function getReportConfidenceMeta(report: CandidateEntry["report"]): ConfidenceMeta {
  const evidenceMode = String(report?.metadata?.evidence_mode ?? "");
  if (evidenceMode === "sem_placa_faixa") {
    return { label: "Confianca moderada", detail: "Sem placa", variant: "warning", score: 0.42 };
  }
  if (report.locationConfidence === "high") {
    return { label: "Confianca alta", detail: "GPS forte", variant: "default", score: 1 };
  }
  if (report.locationConfidence === "low") {
    return { label: "Confianca media", detail: "GPS razoavel", variant: "warning", score: 0.74 };
  }
  return { label: "Confianca basica", detail: "Vale checar", variant: "secondary", score: 0.58 };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getRecencyScore(reportedAt: string) {
  const tone = getRecencyTone(reportedAt);
  if (tone === "fresh") return 1;
  if (tone === "warning") return 0.7;
  return 0.26;
}

function getDistanceScore(distance: number | null) {
  if (distance === null) return 0.36;
  if (distance <= 1_200) return 1;
  if (distance <= 2_500) return 0.84;
  if (distance <= 4_000) return 0.68;
  if (distance <= 6_000) return 0.44;
  if (distance <= 9_000) return 0.24;
  return 0.1;
}

function hasRouteCoordinates(station: StationWithReports) {
  return Number.isFinite(Number(station.lat)) && Number.isFinite(Number(station.lng));
}

function byCityLowestPrice(left: CandidateEntry | RankedCandidate, right: CandidateEntry | RankedCandidate) {
  const priceDiff = Number(left.report.price) - Number(right.report.price);
  if (priceDiff !== 0) return priceDiff;

  const toneRank = { fresh: 0, warning: 1, stale: 2 } as const;
  const toneDiff = toneRank[left.recencyTone] - toneRank[right.recencyTone];
  if (toneDiff !== 0) return toneDiff;

  const confidenceDiff = right.confidence.score - left.confidence.score;
  if (confidenceDiff !== 0) return confidenceDiff;

  const leftDistance = left.distance ?? Number.MAX_SAFE_INTEGER;
  const rightDistance = right.distance ?? Number.MAX_SAFE_INTEGER;
  if (leftDistance !== rightDistance) return leftDistance - rightDistance;

  return new Date(right.report.reportedAt).getTime() - new Date(left.report.reportedAt).getTime();
}

function buildDecisionLabel(candidate: {
  distance: number | null;
  recencyTone: ReturnType<typeof getRecencyTone>;
  confidence: ConfidenceMeta;
  netSavings40: number;
  netSavings50: number;
  isCityLowest: boolean;
}): DecisionLabel {
  if (candidate.recencyTone === "stale" || candidate.confidence.score < 0.65) {
    return "barato, mas velho";
  }

  if (candidate.isCityLowest && candidate.distance !== null && candidate.distance > 4_500) {
    return "mais barato da cidade, mas longe";
  }

  if (candidate.distance !== null && candidate.distance <= 1_800 && candidate.netSavings40 >= 1.2) {
    return "vale no caminho";
  }

  if (candidate.netSavings50 >= 6 || (candidate.distance !== null && candidate.distance <= 4_000 && candidate.netSavings40 >= 2.5)) {
    return "vale pequeno desvio";
  }

  return "só compensa se você já for passar";
}

function buildRationale(candidate: RankedCandidate) {
  if (candidate.decisionLabel === "barato, mas velho") {
    return "Preço interessante, mas a leitura já ficou velha ou fraca para te empurrar até lá.";
  }
  if (candidate.decisionLabel === "mais barato da cidade, mas longe") {
    return "É o menor preço bruto do recorte, mas a distância reduz o ganho real da ida.";
  }
  if (candidate.decisionLabel === "vale no caminho") {
    return `A economia líquida estimada segura bem: ${formatCurrencyBRL(candidate.netSavings40)} em 40L sem te tirar do trajeto.`;
  }
  if (candidate.decisionLabel === "vale pequeno desvio") {
    return `O preço aguenta um desvio curto: sobra cerca de ${formatCurrencyBRL(candidate.netSavings50)} em 50L depois do deslocamento.`;
  }
  return "Preço bom, mas o ganho líquido fica curto se você precisar sair do caminho só por ele.";
}

function buildRankedCandidate(candidate: CandidateEntry, cityAveragePrice: number, cityLowestPrice: number): RankedCandidate {
  const priceGapToLowest = Math.max(0, Number(candidate.report.price) - cityLowestPrice);
  const savingsPerLiter = Math.max(0, cityAveragePrice - Number(candidate.report.price));
  const grossSavings40 = savingsPerLiter * 40;
  const grossSavings50 = savingsPerLiter * 50;
  const detourCost = candidate.distance === null ? 0 : (candidate.distance / 1000) * DETOUR_COST_PER_KM;
  const netSavings40 = Math.max(0, grossSavings40 - detourCost);
  const netSavings50 = Math.max(0, grossSavings50 - detourCost);
  const isCityLowest = priceGapToLowest <= 0.001;
  const priceScore = clamp(1 - priceGapToLowest / 0.65, 0, 1);
  const distanceScore = getDistanceScore(candidate.distance);
  const recencyScore = getRecencyScore(candidate.report.reportedAt);
  const netSavingsScore = clamp(netSavings50 / 12, 0, 1);
  const compensationBoost = candidate.distance !== null && candidate.distance > 2_500 && netSavings50 >= 6 ? 0.06 : 0;
  const proximityPenalty = candidate.distance !== null && candidate.distance <= 1_200 && netSavings40 < 1 ? 0.08 : 0;
  const valueScore =
    priceScore * 0.24
    + netSavingsScore * 0.26
    + distanceScore * 0.17
    + recencyScore * 0.17
    + candidate.confidence.score * 0.11
    + (isCityLowest ? 0.05 : 0)
    + compensationBoost
    - proximityPenalty;

  const ranked: RankedCandidate = {
    ...candidate,
    cityAveragePrice,
    cityLowestPrice,
    priceGapToLowest,
    savingsPerLiter,
    grossSavings40,
    grossSavings50,
    netSavings40,
    netSavings50,
    detourCost,
    valueScore,
    decisionLabel: "só compensa se você já for passar",
    rationale: "",
    isCityLowest
  };

  ranked.decisionLabel = buildDecisionLabel(ranked);
  ranked.rationale = buildRationale(ranked);
  return ranked;
}

function trackHomeQuickAction({
  station,
  scopeId,
  fuel,
  mode,
  action
}: {
  station: StationWithReports;
  scopeId: string;
  fuel: FuelType;
  mode: "city" | "value";
  action: "photo" | "station";
}) {
  void trackProductEvent({
    eventType: "quick_action_clicked",
    pagePath: "/",
    pageTitle: "Home",
    stationId: station.id,
    scopeType: "block",
    scopeId,
    payload: {
      source: "home_simplified",
      action,
      fuelType: fuel,
      mode
    }
  });
}

function CityRankRow({
  entry,
  index,
  fuel,
  contextHref,
  bestForYouId,
  onTrack
}: {
  entry: RankedCandidate;
  index: number;
  fuel: FuelType;
  contextHref: string;
  bestForYouId?: string | null;
  onTrack?: (scopeId: string) => void;
}) {
  const stationHref = getStationHref(entry.station.id, contextHref, fuel);
  const localityLabel = entry.station.neighborhood || entry.station.city || "Sem bairro";

  return (
    <div className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={index === 0 ? "warning" : "secondary"} className="px-2 text-[10px]">
              #{index + 1}
            </Badge>
            {bestForYouId === entry.station.id ? (
              <Badge variant="default" className="text-[10px]">
                Melhor para você
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 truncate text-[15px] font-semibold text-white">{getStationPublicName(entry.station)}</p>
          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-white/34">{localityLabel}</p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-lg font-black tracking-tight text-white sm:text-xl">{formatCurrencyBRL(Number(entry.report.price))}</p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">{fuelLabels[entry.report.fuelType]}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant={recencyToneToBadgeVariant(entry.recencyTone)} className="text-[10px]">
          {formatRecencyLabel(entry.report.reportedAt)}
        </Badge>
        {entry.distance !== null ? (
          <Badge variant="outline" className="text-[10px]">
            {formatDistanceFromYou(entry.distance)}
          </Badge>
        ) : null}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 text-xs leading-relaxed text-white/46 sm:truncate">
          {index === 0 ? "Lidera o preço bruto recente na cidade." : "Leitura ampla da cidade, não da melhor ida."}
        </p>
        <ButtonLink
          href={stationHref}
          variant="secondary"
          className="min-h-8 w-full justify-center px-3 text-[9px] font-black uppercase tracking-[0.14em] sm:w-auto sm:shrink-0"
          onClick={() => {
            rememberStationVisit({ id: entry.station.id, name: getStationPublicName(entry.station), city: entry.station.city });
            trackHomeQuickAction({ station: entry.station, scopeId: `home-city-top-${index + 1}`, fuel, mode: "city", action: "station" });
            onTrack?.(`city-top-${index + 1}-${entry.station.id}`);
          }}
        >
          Ver posto
        </ButtonLink>
      </div>
    </div>
  );
}

function CityTopThreeCard({
  entries,
  fuel,
  contextHref,
  bestForYouId,
  selectedCity,
  isCityWideIgnoringQuery,
  onTrack
}: {
  entries: RankedCandidate[];
  fuel: FuelType;
  contextHref: string;
  bestForYouId?: string | null;
  selectedCity: string;
  isCityWideIgnoringQuery: boolean;
  onTrack?: (scopeId: string) => void;
}) {
  return (
    <div className="rounded-[22px] border border-[color:var(--color-accent)]/18 bg-[linear-gradient(180deg,rgba(255,199,0,0.12),rgba(255,255,255,0.03))] p-4 sm:rounded-[24px] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Melhor preço da cidade</p>
          <h3 className="mt-1 text-base font-semibold text-white sm:text-lg">{selectedCity ? `Top 3 bruto de ${selectedCity}` : "Top 3 bruto da cidade"}</h3>
          <p className="mt-1 text-sm text-white/52">Visão ampla da cidade. O mais barato aqui não é automaticamente a melhor ida.</p>
        </div>
        <Badge variant="warning" className="max-w-full self-start text-[10px]">
          {fuelLabels[fuel]}
        </Badge>
      </div>

      {isCityWideIgnoringQuery ? (
        <div className="mt-3 rounded-[16px] border border-white/8 bg-black/18 px-3 py-2 text-xs text-white/56">
          A busca digitada não altera este ranking. Aqui entra a cidade inteira para mostrar o menor preço bruto real.
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {entries.map((entry, index) => (
          <CityRankRow
            key={`city-top-${entry.station.id}`}
            entry={entry}
            index={index}
            fuel={fuel}
            contextHref={contextHref}
            bestForYouId={bestForYouId}
            onTrack={onTrack}
          />
        ))}
      </div>
    </div>
  );
}

function BestChoiceCard({
  entry,
  fuel,
  contextHref,
  sameAsCityLeader,
  onTrack
}: {
  entry: RankedCandidate;
  fuel: FuelType;
  contextHref: string;
  sameAsCityLeader: boolean;
  onTrack?: (scopeId: string) => void;
}) {
  const stationHref = getStationHref(entry.station.id, contextHref, fuel);
  const sendHref = getSendHref(entry.station.id, contextHref, fuel);
  const localityLabel = [entry.station.neighborhood, entry.station.city].filter(Boolean).join(" · ") || "Recorte aberto";
  const canNavigate = hasRouteCoordinates(entry.station);

  return (
    <div className="rounded-[22px] border border-emerald-400/18 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(255,255,255,0.03))] p-4 sm:rounded-[24px] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Vale mais a pena para você</p>
          <h3 className="mt-1 text-base font-semibold text-white sm:text-lg">
            {sameAsCityLeader ? "Um posto vence os dois lados" : entry.decisionLabel}
          </h3>
          <p className="mt-1 text-sm text-white/52">
            {sameAsCityLeader
              ? "O mesmo posto é o menor preço bruto da cidade e também o que mais compensa agora."
              : "Preço, distância, recência, confiança e economia líquida por tanque entram na conta."}
          </p>
        </div>
        <Badge variant="default" className="max-w-full self-start text-[10px]">
          {fuelLabels[fuel]}
        </Badge>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            {sameAsCityLeader ? (
              <>
                <Badge variant="warning" className="text-[10px]">Menor preço da cidade</Badge>
                <Badge variant="default" className="text-[10px]">Melhor para você agora</Badge>
              </>
            ) : (
              <Badge variant="default" className="text-[10px]">{entry.decisionLabel}</Badge>
            )}
          </div>
          <p className="mt-2 truncate text-lg font-semibold text-white">{getStationPublicName(entry.station)}</p>
          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-white/34">{localityLabel}</p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-[1.65rem] font-black tracking-tight text-white sm:text-[2rem]">{formatCurrencyBRL(Number(entry.report.price))}</p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">{fuelLabels[entry.report.fuelType]}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-white/62">{entry.rationale}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant={recencyToneToBadgeVariant(entry.recencyTone)} className="text-[10px]">
          {formatRecencyLabel(entry.report.reportedAt)}
        </Badge>
        <Badge variant={entry.confidence.variant} className="text-[10px]">
          {entry.confidence.detail}
        </Badge>
        {entry.distance !== null ? (
          <Badge variant="outline" className="text-[10px]">
            {formatDistanceFromYou(entry.distance)}
          </Badge>
        ) : null}
        <Badge variant="accent" className="text-[10px]">
          {formatCurrencyBRL(entry.netSavings40)} líquido em 40L
        </Badge>
        <Badge variant="accent" className="text-[10px]">
          {formatCurrencyBRL(entry.netSavings50)} líquido em 50L
        </Badge>
      </div>

      <div className="mt-3 rounded-[18px] border border-white/8 bg-black/18 px-3 py-3 text-sm leading-relaxed text-white/58">
        Economia bruta: {formatCurrencyBRL(entry.grossSavings40)} em 40L e {formatCurrencyBRL(entry.grossSavings50)} em 50L.
        {entry.distance !== null ? ` O deslocamento pesa cerca de ${formatCurrencyBRL(entry.detourCost)} nessa conta.` : " Sem GPS forte, então a conta líquida fica mais conservadora."}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <ButtonLink
          href={stationHref}
          variant="secondary"
          className="min-h-10 justify-center px-4 text-[10px] font-black uppercase tracking-[0.16em]"
          onClick={() => {
            rememberStationVisit({ id: entry.station.id, name: getStationPublicName(entry.station), city: entry.station.city });
            trackHomeQuickAction({ station: entry.station, scopeId: "home-best-for-you-view", fuel, mode: "value", action: "station" });
            onTrack?.(`value-view-${entry.station.id}`);
          }}
        >
          Ver posto
        </ButtonLink>
        <ButtonLink
          href={sendHref}
          className="min-h-10 justify-center px-4 text-[10px] font-black uppercase tracking-[0.16em]"
          onClick={() => {
            rememberStationVisit({ id: entry.station.id, name: getStationPublicName(entry.station), city: entry.station.city });
            trackHomeQuickAction({ station: entry.station, scopeId: "home-best-for-you-update", fuel, mode: "value", action: "photo" });
            onTrack?.(`value-update-${entry.station.id}`);
          }}
        >
          Atualizar preço
        </ButtonLink>
        <Button
          type="button"
          variant="ghost"
          disabled={!canNavigate}
          className="min-h-10 justify-center px-4 text-[10px] font-black uppercase tracking-[0.16em] text-white/78 disabled:text-white/28"
          onClick={() => {
            if (!canNavigate) {
              return;
            }

            rememberStationVisit({ id: entry.station.id, name: getStationPublicName(entry.station), city: entry.station.city });
            onTrack?.(`value-route-${entry.station.id}`);
            openExternalNavigation({
              lat: entry.station.lat,
              lng: entry.station.lng,
              stationId: entry.station.id,
              stationName: getStationPublicName(entry.station),
              source: "home_best_for_you"
            });
          }}
        >
          <Navigation className="h-4 w-4" />
          Traçar rota
        </Button>
      </div>
    </div>
  );
}

export function HomeSimplifiedSections({
  contextHref,
  fuelFilter,
  decisionStations,
  mapStations,
  noRecentStations,
  railSendHref,
  selectedCity,
  query,
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
        if (!report) {
          return null;
        }

        return {
          station,
          report,
          distance: getDistanceValue(station),
          recencyTone: getRecencyTone(report.reportedAt),
          confidence: getReportConfidenceMeta(report)
        } satisfies CandidateEntry;
      })
      .filter((item): item is CandidateEntry => Boolean(item));
  }, [decisionStations, primaryFuel]);

  const recentCandidates = useMemo(() => candidates.filter((item) => item.recencyTone !== "stale"), [candidates]);
  const cityScope = recentCandidates.length > 0 ? recentCandidates : candidates;

  const cityStats = useMemo(() => {
    if (cityScope.length === 0) {
      return null;
    }

    const prices = cityScope.map((item) => Number(item.report.price));
    const total = prices.reduce((sum, price) => sum + price, 0);

    return {
      lowest: Math.min(...prices),
      average: total / prices.length
    };
  }, [cityScope]);

  const rankedCandidates = useMemo(() => {
    if (!cityStats) {
      return [];
    }

    return cityScope.map((candidate) => buildRankedCandidate(candidate, cityStats.average, cityStats.lowest));
  }, [cityScope, cityStats]);

  const cityTopThree = useMemo(() => [...rankedCandidates].sort(byCityLowestPrice).slice(0, 3), [rankedCandidates]);

  const bestForYou = useMemo(() => {
    return [...rankedCandidates].sort((left, right) => {
      const scoreDiff = right.valueScore - left.valueScore;
      if (scoreDiff !== 0) return scoreDiff;
      return byCityLowestPrice(left, right);
    })[0] ?? null;
  }, [rankedCandidates]);

  const sameLeader = Boolean(bestForYou && cityTopThree[0] && bestForYou.station.id === cityTopThree[0].station.id);
  const cityLabel = selectedCity || cityTopThree[0]?.station.city || "sua cidade";
  const isCityWideIgnoringQuery = Boolean(selectedCity && query.trim());
  const coverageNote = noRecentStations.length > 0
    ? `${noRecentStations.length} postos ainda pedem atualização para cobrir melhor o recorte.`
    : "Cobertura recente está estável neste recorte.";

  return (
    <div className="space-y-4">
      <SectionCard className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Decisão rápida</p>
            <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">Cidade inteira de um lado, escolha real do outro</h2>
            <p className="mt-1 text-sm text-white/52">A home responde onde está o menor preço bruto e qual posto realmente vale mais para você agora.</p>
          </div>
          <Badge variant="warning" className="max-w-full self-start text-[10px]">
            <Sparkles className="h-3.5 w-3.5" />
            {fuelLabels[primaryFuel]}
          </Badge>
        </div>

        {cityTopThree.length > 0 && bestForYou ? (
          <div className="grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
            <CityTopThreeCard
              entries={cityTopThree}
              fuel={primaryFuel}
              contextHref={contextHref}
              bestForYouId={bestForYou.station.id}
              selectedCity={cityLabel}
              isCityWideIgnoringQuery={isCityWideIgnoringQuery}
              onTrack={onStationTrack}
            />
            <BestChoiceCard
              entry={bestForYou}
              fuel={primaryFuel}
              contextHref={contextHref}
              sameAsCityLeader={sameLeader}
              onTrack={onStationTrack}
            />
          </div>
        ) : (
          <EmptyStateCard
            title="Ainda não existe base suficiente para separar cidade inteira de escolha pessoal."
            description="Assim que aparecer preço recente para este combustível, a home passa a mostrar o top 3 bruto da cidade e o posto que mais compensa agora."
            actionHref={railSendHref}
            actionLabel="Atualizar preço"
            className="text-left"
          />
        )}

        <div className="rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Leitura do custo-benefício</p>
          <p className="mt-1 text-sm text-white/52">
            O bloco da direita usa economia líquida por tanque como tradutor rápido: se o preço bruto é bom, mas o deslocamento come a vantagem, o rótulo cai para “só compensa se você já for passar” ou “mais barato da cidade, mas longe”.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {mapStations.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowMap((value) => !value)}
              className="h-11 flex-1 justify-center px-4 text-[11px] font-black uppercase tracking-[0.18em]"
            >
              <MapPinned className="h-4 w-4" />
              {showMap ? "Fechar mapa" : "Abrir mapa"}
            </Button>
          ) : null}
          <ButtonLink href={railSendHref} className="h-11 flex-1 justify-center px-4 text-[11px] font-black uppercase tracking-[0.18em]">
            Atualizar preço
          </ButtonLink>
        </div>

        <p className="text-[11px] text-white/42">
          Em {cityLabel}, o top 3 mostra visão ampla da cidade inteira. O card pessoal só sobe quando preço, distância, recência e confiança fecham a conta real. {coverageNote}
        </p>

        {showMap ? (
          <div className="pt-1">
            <HomeMapSurface
              stations={mapStations}
              contextHref={contextHref}
              fuelFilter={fuelFilter}
              center={center}
              userLocation={userLocation}
              preferListFirst={false}
            />
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
