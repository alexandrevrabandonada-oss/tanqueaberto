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
import { cn } from "@/lib/utils";

const HomeMapSurface = dynamic(() => import("@/components/home/home-map-surface").then((mod) => mod.HomeMapSurface), {
  ssr: false,
  loading: () => <div className="h-[220px] rounded-[22px] border border-white/8 bg-white/[0.04]" />
});

type DecisionLabel = "vale no caminho" | "vale desviar" | "barato, mas longe" | "barato, mas velho";

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
  estimatedSavings: number;
  valueScore: number;
  decisionLabel: DecisionLabel;
  rationale: string;
}

interface HomeSimplifiedSectionsProps {
  contextHref: string;
  fuelFilter: FuelFilter;
  orderedStations: StationWithReports[];
  mapStations: StationWithReports[];
  noRecentStations: StationWithReports[];
  railSendHref: Route;
  selectedCity: string;
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
  if (tone === "warning") return 0.72;
  return 0.28;
}

function getDistanceScore(distance: number | null) {
  if (distance === null) {
    return 0.44;
  }
  if (distance <= 1_200) return 1;
  if (distance <= 2_500) return 0.86;
  if (distance <= 4_500) return 0.68;
  if (distance <= 7_000) return 0.44;
  if (distance <= 10_000) return 0.24;
  return 0.1;
}

function hasRouteCoordinates(station: StationWithReports) {
  return Number.isFinite(Number(station.lat)) && Number.isFinite(Number(station.lng));
}

function byCityLowestPrice(left: CandidateEntry, right: CandidateEntry) {
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
  recencyTone: ReturnType<typeof getRecencyTone>;
  confidence: ConfidenceMeta;
  distance: number | null;
  estimatedSavings: number;
  savingsPerLiter: number;
}): DecisionLabel {
  if (candidate.recencyTone === "stale" || candidate.confidence.score < 0.65) {
    return "barato, mas velho";
  }
  if (candidate.distance !== null && candidate.distance > 4_500 && candidate.estimatedSavings < 7) {
    return "barato, mas longe";
  }
  if (candidate.estimatedSavings >= 7 || candidate.savingsPerLiter >= 0.14) {
    return "vale desviar";
  }
  if (candidate.distance !== null && candidate.distance <= 2_500) {
    return "vale no caminho";
  }
  return "barato, mas longe";
}

function buildRationale(label: DecisionLabel, candidate: {
  distance: number | null;
  estimatedSavings: number;
  recencyTone: ReturnType<typeof getRecencyTone>;
  confidence: ConfidenceMeta;
}) {
  if (label === "vale no caminho") {
    return "Preço competitivo sem te tirar do trajeto.";
  }
  if (label === "vale desviar") {
    return candidate.distance !== null
      ? `O ganho estimado compensa o desvio em ${formatDistanceFromYou(candidate.distance)}.`
      : "O preço compensa a ida mesmo sem GPS forte.";
  }
  if (label === "barato, mas longe") {
    return candidate.distance !== null
      ? `É barato, mas ${formatDistanceFromYou(candidate.distance)} já pesa na conta real.`
      : "Preço chama atenção, mas faltou proximidade confiável.";
  }
  return candidate.recencyTone === "stale" || candidate.confidence.score < 0.65
    ? "Preço interessante, mas a leitura já pede conferência."
    : `Economia estimada de ${formatCurrencyBRL(candidate.estimatedSavings)} em 50L.`;
}

function buildRankedCandidate(candidate: CandidateEntry, cityAveragePrice: number, cityLowestPrice: number): RankedCandidate {
  const priceGapToLowest = Math.max(0, Number(candidate.report.price) - cityLowestPrice);
  const savingsPerLiter = Math.max(0, cityAveragePrice - Number(candidate.report.price));
  const estimatedSavings = savingsPerLiter * 50;
  const priceScore = clamp(1 - priceGapToLowest / 0.6, 0, 1);
  const distanceScore = getDistanceScore(candidate.distance);
  const recencyScore = getRecencyScore(candidate.report.reportedAt);
  const savingsScore = clamp(estimatedSavings / 16, 0, 1);
  const compensationBonus = candidate.distance !== null && candidate.distance > 2_500 && estimatedSavings >= 7 ? 0.08 : 0;
  const proximityGuard = candidate.distance !== null && candidate.distance <= 1_200 && estimatedSavings < 1.5 ? -0.05 : 0;
  const valueScore =
    priceScore * 0.3
    + savingsScore * 0.22
    + distanceScore * 0.18
    + recencyScore * 0.16
    + candidate.confidence.score * 0.14
    + compensationBonus
    + proximityGuard;
  const decisionLabel = buildDecisionLabel({
    recencyTone: candidate.recencyTone,
    confidence: candidate.confidence,
    distance: candidate.distance,
    estimatedSavings,
    savingsPerLiter
  });

  return {
    ...candidate,
    cityAveragePrice,
    cityLowestPrice,
    priceGapToLowest,
    savingsPerLiter,
    estimatedSavings,
    valueScore,
    decisionLabel,
    rationale: buildRationale(decisionLabel, {
      distance: candidate.distance,
      estimatedSavings,
      recencyTone: candidate.recencyTone,
      confidence: candidate.confidence
    })
  };
}

function DecisionCard({
  eyebrow,
  title,
  summary,
  entry,
  fuel,
  contextHref,
  highlight,
  cityNote,
  onTrack
}: {
  eyebrow: string;
  title: string;
  summary: string;
  entry: RankedCandidate;
  fuel: FuelType;
  contextHref: string;
  highlight: "city" | "value";
  cityNote?: string;
  onTrack?: (scopeId: string) => void;
}) {
  const stationHref = getStationHref(entry.station.id, contextHref, fuel);
  const sendHref = getSendHref(entry.station.id, contextHref, fuel);
  const localityLabel = [entry.station.neighborhood, entry.station.city].filter(Boolean).join(" · ") || "Recorte aberto";
  const canNavigate = hasRouteCoordinates(entry.station);

  return (
    <div
      className={cn(
        "rounded-[24px] border p-5",
        highlight === "city"
          ? "border-[color:var(--color-accent)]/18 bg-[linear-gradient(180deg,rgba(255,199,0,0.12),rgba(255,255,255,0.03))]"
          : "border-emerald-400/18 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(255,255,255,0.03))]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">{eyebrow}</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-white/52">{summary}</p>
        </div>
        <Badge variant={highlight === "city" ? "warning" : "default"} className="shrink-0 text-[10px]">
          {fuelLabels[fuel]}
        </Badge>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-white">{getStationPublicName(entry.station)}</p>
          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-white/34">{localityLabel}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[2rem] font-black tracking-tight text-white">{formatCurrencyBRL(Number(entry.report.price))}</p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/38">{fuelLabels[entry.report.fuelType]}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-white/62">{cityNote ?? entry.rationale}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant={highlight === "city" ? "secondary" : "default"} className="text-[10px]">
          {highlight === "city" ? "Menor preco bruto" : entry.decisionLabel}
        </Badge>
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
        {entry.savingsPerLiter >= 0.03 ? (
          <Badge variant="accent" className="text-[10px]">
            {formatCurrencyBRL(entry.estimatedSavings)} em 50L
          </Badge>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <ButtonLink
          href={stationHref}
          variant="secondary"
          className="min-h-10 justify-center px-4 text-[10px] font-black uppercase tracking-[0.16em]"
          onClick={() => {
            rememberStationVisit({ id: entry.station.id, name: getStationPublicName(entry.station), city: entry.station.city });
            onTrack?.(`${highlight}-view-${entry.station.id}`);
          }}
        >
          Ver posto
        </ButtonLink>
        <ButtonLink
          href={sendHref}
          className="min-h-10 justify-center px-4 text-[10px] font-black uppercase tracking-[0.16em]"
          onClick={() => {
            rememberStationVisit({ id: entry.station.id, name: getStationPublicName(entry.station), city: entry.station.city });
            void trackProductEvent({
              eventType: "quick_action_clicked",
              pagePath: sendHref,
              pageTitle: "Home",
              stationId: entry.station.id,
              scopeType: "block",
              scopeId: `home-${highlight}-update`,
              payload: {
                source: "home_simplified",
                action: "photo",
                fuelType: fuel,
                decisionLabel: entry.decisionLabel,
                mode: highlight
              }
            });
            onTrack?.(`${highlight}-update-${entry.station.id}`);
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
            onTrack?.(`${highlight}-route-${entry.station.id}`);
            openExternalNavigation({
              lat: entry.station.lat,
              lng: entry.station.lng,
              stationId: entry.station.id,
              stationName: getStationPublicName(entry.station),
              source: highlight === "city" ? "home_city_lowest" : "home_best_for_you"
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
  orderedStations,
  mapStations,
  noRecentStations,
  railSendHref,
  selectedCity,
  center,
  userLocation,
  onStationTrack
}: HomeSimplifiedSectionsProps) {
  const [showMap, setShowMap] = useState(false);

  const primaryFuel = useMemo(() => resolvePrimaryFuel(orderedStations, fuelFilter), [fuelFilter, orderedStations]);

  const candidates = useMemo(() => {
    return orderedStations
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
  }, [orderedStations, primaryFuel]);

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

  const cityLowest = useMemo(() => {
    if (!cityStats) {
      return null;
    }

    return [...rankedCandidates].sort(byCityLowestPrice)[0] ?? null;
  }, [cityStats, rankedCandidates]);

  const bestForYou = useMemo(() => {
    return [...rankedCandidates].sort((left, right) => {
      const scoreDiff = right.valueScore - left.valueScore;
      if (scoreDiff !== 0) return scoreDiff;
      return byCityLowestPrice(left, right);
    })[0] ?? null;
  }, [rankedCandidates]);

  const cityLabel = selectedCity || cityLowest?.station.city || "sua cidade";
  const coverageNote = noRecentStations.length > 0
    ? `${noRecentStations.length} postos ainda pedem atualização para cobrir melhor o recorte.`
    : "Cobertura recente está estável neste recorte.";

  return (
    <div className="space-y-4">
      <SectionCard className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Decisão rápida</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Preço bruto e escolha real, separados</h2>
            <p className="mt-1 text-sm text-white/52">A home curta mostra o menor preço da cidade e, ao lado, o posto que mais compensa para você agora.</p>
          </div>
          <Badge variant="warning" className="text-[10px]">
            <Sparkles className="h-3.5 w-3.5" />
            {fuelLabels[primaryFuel]}
          </Badge>
        </div>

        {cityLowest && bestForYou ? (
          <div className="grid gap-3 xl:grid-cols-2">
            <DecisionCard
              eyebrow="Melhor preço da cidade"
              title={cityLabel}
              summary="Menor preço bruto recente no combustível filtrado."
              entry={cityLowest}
              fuel={primaryFuel}
              contextHref={contextHref}
              highlight="city"
              cityNote={`Visão ampla de ${cityLabel}. Pode ser o menor preço bruto sem ser a melhor ida para você.`}
              onTrack={onStationTrack}
            />
            <DecisionCard
              eyebrow="Vale mais a pena para você"
              title={bestForYou.decisionLabel}
              summary="Score combinando preço, distância, recência, confiança e economia estimada."
              entry={bestForYou}
              fuel={primaryFuel}
              contextHref={contextHref}
              highlight="value"
              onTrack={onStationTrack}
            />
          </div>
        ) : (
          <EmptyStateCard
            title="Ainda não existe base suficiente para separar preço bruto de escolha real."
            description="Assim que aparecer preço recente para este combustível, a home passa a destacar o menor preço da cidade e o posto que mais compensa."
            actionHref={railSendHref}
            actionLabel="Atualizar preço"
            className="text-left"
          />
        )}

        <div className="rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Leitura do score</p>
          <p className="mt-1 text-sm text-white/52">
            O card da direita não escolhe só o posto mais perto. Ele sobe quando o preço realmente compensa o desvio e cai quando o dado está velho ou a distância dilui a economia.
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

        <p className="text-[11px] text-white/42">{coverageNote}</p>

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
