"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Camera, Clock3, Navigation, Sparkles, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyStateCard } from "@/components/state/empty-state-card";
import { StationCard } from "@/components/station/station-card";
import { GroupStatusBadge } from "@/components/ui/group-status-badge";
import { QuickActionButton } from "@/components/ui/quick-action";
import { OperationalMemoryBar } from "@/components/home/operational-memory-bar";
import { HomeMapSurface } from "@/components/home/home-map-surface";
import { RecorteActivityWidget } from "@/components/home/recorte-activity-widget";
import { cn } from "@/lib/utils";
import { formatDistanceFromYou } from "@/lib/geo/distance";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { fuelLabels, publicFuelFilters } from "@/lib/format/labels";
import { canShowStationOnMap, getStationPublicName, hasPendingStationLocationReview } from "@/lib/quality/stations";
import { getSelectedStationReport, hasRecentStationPriceForFilter } from "@/lib/filters/public";
import { rememberStationVisit } from "@/lib/navigation/home-context";
import { openExternalNavigation } from "@/lib/navigation/external-maps";
import { trackProductEvent } from "@/lib/telemetry/client";
import type { FuelType } from "@/lib/types";

const ECONOMY_FUEL_STORAGE_KEY = "bomba-aberta:economy-fuel-filter";
const ECONOMY_FUEL_OPTIONS = publicFuelFilters.filter((item) => item.value !== "all") as Array<{ value: FuelType; label: string }>;
const FLEX_FUEL_RATIO_THRESHOLD = 0.75;
const ECONOMY_REFERENCE_MIN_ITEMS = 3;
const ECONOMY_SAVINGS_LITERS = [40, 50] as const;
const OPPORTUNITY_MIN_DELTA = 0.03;
const FOLLOWED_DROP_MIN_DELTA = 0.02;

function getStationHref(stationId: string, returnToHref?: string, fuelFilter?: FuelType | "all") {
  const params = new URLSearchParams();
  if (fuelFilter && fuelFilter !== "all") {
    params.set("fuel", fuelFilter);
  }
  if (returnToHref) {
    params.set("returnTo", returnToHref);
  }

  const suffix = params.toString();
  return suffix ? `/postos/${stationId}?${suffix}` : `/postos/${stationId}`;
}

function getSendHref(stationId: string, returnToHref?: string, fuelFilter?: string) {
  const fuelParam = fuelFilter && fuelFilter !== "all" ? `&fuel=${fuelFilter}` : "";
  const base = `/enviar?stationId=${stationId}${fuelParam}#photo`;
  return returnToHref ? `${base}&returnTo=${encodeURIComponent(returnToHref)}` : base;
}

function getReportConfidenceMeta(report: any) {
  const evidenceMode = String(report?.metadata?.evidence_mode ?? "");
  if (evidenceMode === "sem_placa_faixa") {
    return { label: "Confianca moderada", detail: "Sem placa", variant: "warning" as const, score: 0.42, strong: false };
  }
  if (report?.locationConfidence === "high") {
    return { label: "Confianca alta", detail: "GPS forte", variant: "default" as const, score: 1, strong: true };
  }
  if (report?.locationConfidence === "low") {
    return { label: "Confianca media", detail: "GPS razoavel", variant: "warning" as const, score: 0.74, strong: true };
  }
  return { label: "Confianca basica", detail: "Vale checar", variant: "secondary" as const, score: 0.58, strong: false };
}

function hasRouteCoordinates(station: any) {
  return Number.isFinite(Number(station?.lat)) && Number.isFinite(Number(station?.lng));
}

function dedupeStationItems(items: Array<{ station: any; report: any; key?: string }>) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const stationId = String(item?.station?.id ?? "");
    if (!stationId || seen.has(stationId)) return false;
    seen.add(stationId);
    return true;
  });
}

function getEconomyLocalityLabel(station: any) {
  return [station?.neighborhood, station?.city].filter(Boolean).join(" · ") || "Regiao sem bairro";
}

function isFuelType(value: string): value is FuelType {
  return ECONOMY_FUEL_OPTIONS.some((item) => item.value === value);
}

function readEconomyFuelPreference() {
  if (typeof window === "undefined") {
    return null;
  }

  const saved = window.localStorage.getItem(ECONOMY_FUEL_STORAGE_KEY);
  return saved && isFuelType(saved) ? saved : null;
}

function getStationDistanceValue(station: any) {
  const distance = Number(station?.distance);
  return Number.isFinite(distance) && distance >= 0 ? distance : null;
}

function sortEconomyCandidatesByPrice(items: Array<{ station: any; report: any }>) {
  return [...items].sort((left, right) => {
    const priceDiff = left.report.price - right.report.price;
    if (priceDiff !== 0) return priceDiff;
    return new Date(right.report.reportedAt).getTime() - new Date(left.report.reportedAt).getTime();
  });
}

function getEconomyRecencyScore(reportedAt: string) {
  const tone = getRecencyTone(reportedAt);
  if (tone === "fresh") return 1;
  if (tone === "warning") return 0.68;
  return 0.24;
}

function buildPracticalReason(
  priceGap: number,
  recencyTone: ReturnType<typeof getRecencyTone>,
  confidenceScore: number,
  distanceValue: number | null,
  preferDistance = false
) {
  if (recencyTone === "stale" || confidenceScore < 0.65) {
    return "Bom, mas checa o preço de novo antes de sair.";
  }

  if (preferDistance && distanceValue !== null && distanceValue <= 1500 && priceGap <= 0.12) {
    return "Eh barato mesmo e nao sai do caminho.";
  }

  if (priceGap <= 0.03 && recencyTone === "fresh" && confidenceScore >= 0.7) {
    return "Menor preco e o dado ainda ta quentinho.";
  }

  if (priceGap <= 0.12) {
    return "Melhor que o resto: preco, distancia e recencia combinam bem.";
  }

  return "Eh barato. Mas compara bem ligeirinho antes de ir.";
}

function buildPracticalCandidate(item: any, scopeMinPrice: number, options?: { preferDistance?: boolean }) {
  const preferDistance = Boolean(options?.preferDistance);
  const recencyTone = getRecencyTone(item.report.reportedAt);
  const confidence = getReportConfidenceMeta(item.report);
  const distanceValue = getStationDistanceValue(item.station);
  const priceGap = Math.max(0, Number(item.report.price) - scopeMinPrice);
  const priceScore = Math.max(0, 1 - priceGap / 0.75);
  const distanceScore = distanceValue === null ? 0.45 : Math.max(0, 1 - distanceValue / (preferDistance ? 6000 : 14000));
  const score = priceScore * 0.48 + getEconomyRecencyScore(item.report.reportedAt) * 0.24 + confidence.score * 0.18 + distanceScore * (preferDistance ? 0.1 : 0.06);

  return {
    ...item,
    score,
    recencyTone,
    confidence,
    distanceValue,
    reliable: recencyTone !== "stale" && confidence.score >= 0.7,
    reason: buildPracticalReason(priceGap, recencyTone, confidence.score, distanceValue, preferDistance)
  };
}

function pickBestPracticalCandidate(items: Array<{ station: any; report: any }>, options?: { preferDistance?: boolean }) {
  if (items.length === 0) return null;

  const scopeMinPrice = Math.min(...items.map((item) => Number(item.report.price)));

  return items
    .map((item) => buildPracticalCandidate(item, scopeMinPrice, options))
    .sort((left, right) => {
      const scoreDiff = right.score - left.score;
      if (scoreDiff !== 0) return scoreDiff;
      const priceDiff = left.report.price - right.report.price;
      if (priceDiff !== 0) return priceDiff;
      return new Date(right.report.reportedAt).getTime() - new Date(left.report.reportedAt).getTime();
    })[0] ?? null;
}

function getEconomyRecommendationMeta(candidate: any) {
  if (!candidate) {
    return { label: "Sem base", variant: "secondary" as const };
  }

  if (candidate.reliable) {
    return { label: "To indo", variant: "default" as const };
  }

  if (candidate.recencyTone === "stale" || candidate.confidence.score < 0.65) {
    return { label: "Checa depois", variant: "danger" as const };
  }

  return { label: "Talvez", variant: "warning" as const };
}

function FirstFoldSignalCard({
  eyebrow,
  title,
  station,
  report,
  note,
  href,
  actionLabel,
  actionVariant = "secondary"
}: {
  eyebrow: string;
  title: string;
  station: any;
  report?: any;
  note: string;
  href?: Route;
  actionLabel?: string;
  actionVariant?: "primary" | "secondary" | "ghost" | "accent";
}) {
  if (!station) {
    return null;
  }

  const distanceValue = getStationDistanceValue(station);
  const recencyTone = report ? getRecencyTone(report.reportedAt) : null;

  return (
    <div className="min-w-0 rounded-[22px] border border-white/8 bg-black/22 p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">{eyebrow}</p>
      <h3 className="mt-1 text-base font-semibold text-white">{title}</h3>
      <p className="mt-3 break-words text-sm font-semibold leading-snug text-white">{getStationPublicName(station)}</p>
      <p className="mt-1 break-words text-[11px] uppercase tracking-[0.16em] text-white/34">{[station?.neighborhood, station?.city].filter(Boolean).join(" · ") || "Recorte aberto"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {report ? <Badge variant="secondary" className="text-[10px]">{fuelLabels[report.fuelType as FuelType]} · {formatCurrencyBRL(Number(report.price))}</Badge> : <Badge variant="warning" className="text-[10px]">Sem preço recente</Badge>}
        {report && recencyTone ? <Badge variant={recencyToneToBadgeVariant(recencyTone)} className="text-[10px]">{formatRecencyLabel(report.reportedAt)}</Badge> : null}
        {distanceValue !== null ? <Badge variant="outline" className="text-[10px]">{formatDistanceFromYou(distanceValue)}</Badge> : null}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-white/52">{note}</p>
      {href && actionLabel ? (
        <ButtonLink href={href} variant={actionVariant} className="mt-4 h-10 justify-center px-4 text-[11px] font-black uppercase tracking-[0.16em]">
          {actionLabel}
        </ButtonLink>
      ) : null}
    </div>
  );
}

export function HomeDeferredSections(props: Record<string, any>) {
  const {
    homeState,
    missionActive,
    isStreetMode,
    isAssisted,
    toggleStreetMode,
    recentIds = [],
    favoriteIds = [],
    stations = [],
    recentCount = 0,
    selectedCity = "",
    selectedReadiness,
    contextHref = "/",
    fuelFilter = "all",
    listMode = "normal",
    isLowPerf = false,
    recordActivity,
    toggleFavorite,
    isFavorite,
    startMission,
    mapStations = [],
    summaryStations = [],
    priorityStations = [],
    priorityLabel = "",
    priorityHint = "",
    noRecentStations = [],
    cheapestNow = [],
    filteredFeed = [],
    orderedStations = [],
    stationsWithRecentPrice = [],
    stationsWithoutRecentPrice = 0,
    railSendHref = "/enviar",
    isHeroCollapsed = false,
    role,
    selectedCityLabel = selectedCity,
    suppressPrimaryMapHero = false,
    onQuickAccessTrack,
    onRouteTrack,
    onStationTrack
  } = props;

  const [economyFuelFilter, setEconomyFuelFilter] = useState<FuelType>("gasolina_comum");
  const availableEconomyFuels = useMemo(() => {
    const seen = new Set<FuelType>();

    for (const station of orderedStations as any[]) {
      for (const report of [...(station?.recentReports ?? []), ...(station?.latestReports ?? [])]) {
        if (isFuelType(String(report?.fuelType ?? ""))) {
          seen.add(report.fuelType as FuelType);
        }
      }
    }

    return ECONOMY_FUEL_OPTIONS.filter((item) => seen.has(item.value)).map((item) => item.value);
  }, [orderedStations]);

  useEffect(() => {
    const available = availableEconomyFuels.length > 0 ? availableEconomyFuels : ECONOMY_FUEL_OPTIONS.map((item) => item.value);
    const saved = readEconomyFuelPreference();
    const routeFuel = fuelFilter !== "all" && isFuelType(fuelFilter) ? fuelFilter : null;

    setEconomyFuelFilter((current) => {
      if (available.includes(current)) {
        return current;
      }
      if (routeFuel && available.includes(routeFuel)) {
        return routeFuel;
      }
      if (saved && available.includes(saved)) {
        return saved;
      }
      if (available.includes("gasolina_comum")) {
        return "gasolina_comum";
      }
      return available[0] ?? "gasolina_comum";
    });
  }, [availableEconomyFuels, fuelFilter]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(ECONOMY_FUEL_STORAGE_KEY, economyFuelFilter);
  }, [economyFuelFilter]);

  const showQuickAccess = homeState?.showQuickAccess && !missionActive && (recentIds.length > 0 || favoriteIds.length > 0);
  const priceCandidates = useMemo(() => {
    return (orderedStations as any[])
      .map((station: any) => ({ station, report: getSelectedStationReport(station, economyFuelFilter) }))
      .filter((item: any) => item.report);
  }, [orderedStations, economyFuelFilter]);
  const cheapestRecent = useMemo(() => {
    return dedupeStationItems(
      sortEconomyCandidatesByPrice(
        priceCandidates.filter(({ report }: any) => getRecencyTone(report.reportedAt) !== "stale")
      )
    ).slice(0, 3);
  }, [priceCandidates]);
  const cheapestNearYou = useMemo(() => {
    return dedupeStationItems(
      [...(cheapestNow as any[])]
        .map((entry: any) => entry?.station && entry?.report ? entry : { station: entry, report: getSelectedStationReport(entry, economyFuelFilter) })
        .filter((item: any) => item.station && item.report)
        .sort((left: any, right: any) => {
          const leftDistance = getStationDistanceValue(left.station) ?? Number.MAX_SAFE_INTEGER;
          const rightDistance = getStationDistanceValue(right.station) ?? Number.MAX_SAFE_INTEGER;
          if (leftDistance !== rightDistance) return leftDistance - rightDistance;
          return left.report.price - right.report.price;
        })
    ).slice(0, 3);
  }, [cheapestNow, economyFuelFilter]);
  const cheapestStale = useMemo(() => {
    return dedupeStationItems(
      sortEconomyCandidatesByPrice(
        priceCandidates.filter(({ report }: any) => getRecencyTone(report.reportedAt) === "stale")
      )
    ).slice(0, 3);
  }, [priceCandidates]);
  const nearbyBestOption = useMemo(() => {
    return pickBestPracticalCandidate(
      priceCandidates.filter((item: any) => getStationDistanceValue(item.station) !== null),
      { preferDistance: true }
    );
  }, [priceCandidates]);
  const neighborhoodBestOption = useMemo(() => {
    const groups = new Map<string, { label: string; items: Array<{ station: any; report: any }> }>();

    for (const item of priceCandidates as Array<{ station: any; report: any }>) {
      const key = String(item.station?.neighborhood ?? "").trim() || String(item.station?.city ?? "").trim() || "sem-bairro";
      const label = String(item.station?.neighborhood ?? "").trim() || String(item.station?.city ?? "").trim() || "Regiao sem bairro";
      const current = groups.get(key);
      groups.set(key, {
        label,
        items: [...(current?.items ?? []), item]
      });
    }

    let best: any = null;
    for (const group of groups.values()) {
      const candidate = pickBestPracticalCandidate(group.items);
      if (!candidate) continue;
      const candidateWithLabel = { ...candidate, localityLabel: group.label };
      if (!best || candidateWithLabel.score > best.score) {
        best = candidateWithLabel;
      }
    }

    return best;
  }, [priceCandidates]);
  const cityBestOption = useMemo(() => {
    const groups = new Map<string, { label: string; items: Array<{ station: any; report: any }> }>();

    for (const item of priceCandidates as Array<{ station: any; report: any }>) {
      const key = String(item.station?.city ?? "").trim() || "sem-cidade";
      const label = String(item.station?.city ?? "").trim() || "Cidade sem nome";
      const current = groups.get(key);
      groups.set(key, {
        label,
        items: [...(current?.items ?? []), item]
      });
    }

    let best: any = null;
    for (const group of groups.values()) {
      const candidate = pickBestPracticalCandidate(group.items);
      if (!candidate) continue;
      const candidateWithLabel = { ...candidate, localityLabel: group.label };
      if (!best || candidateWithLabel.score > best.score) {
        best = candidateWithLabel;
      }
    }

    return best;
  }, [priceCandidates]);
  const economyReadouts = useMemo(() => {
    return [
      {
        id: "nearby",
        title: "Melhor opcao perto de voce",
        hint: "Preco que ainda fecha melhor no caminho.",
        entry: nearbyBestOption,
        context: nearbyBestOption?.distanceValue !== null && nearbyBestOption?.distanceValue !== undefined ? formatDistanceFromYou(nearbyBestOption.distanceValue) : "Sem GPS forte"
      },
      {
        id: "neighborhood",
        title: "Melhor opcao no bairro",
        hint: "Boa leitura para resolver sem rodar muito.",
        entry: neighborhoodBestOption,
        context: neighborhoodBestOption?.localityLabel ?? "Sem bairro forte"
      },
      {
        id: "city",
        title: "Melhor opcao na cidade",
        hint: "Resumo mais amplo quando o recorte abre comparação.",
        entry: cityBestOption,
        context: cityBestOption?.localityLabel ?? (selectedCityLabel || "Sem cidade definida")
      }
    ];
  }, [cityBestOption, neighborhoodBestOption, nearbyBestOption, selectedCityLabel]);
  const flexComparator = useMemo(() => {
    const pairCandidates = (orderedStations as any[])
      .map((station: any) => {
        const gasolineReport = getSelectedStationReport(station, "gasolina_comum");
        const ethanolReport = getSelectedStationReport(station, "etanol");

        if (!gasolineReport || !ethanolReport) {
          return null;
        }

        const gasolineConfidence = getReportConfidenceMeta(gasolineReport);
        const ethanolConfidence = getReportConfidenceMeta(ethanolReport);
        const gasolineTone = getRecencyTone(gasolineReport.reportedAt);
        const ethanolTone = getRecencyTone(ethanolReport.reportedAt);
        const distanceValue = getStationDistanceValue(station);
        const distanceScore = distanceValue === null ? 0.35 : Math.max(0, 1 - distanceValue / 8000);
        const score = getEconomyRecencyScore(gasolineReport.reportedAt) * 0.28
          + getEconomyRecencyScore(ethanolReport.reportedAt) * 0.28
          + Math.min(gasolineConfidence.score, ethanolConfidence.score) * 0.24
          + distanceScore * 0.2;
        const ratio = Number(ethanolReport.price) / Number(gasolineReport.price);
        const reliable = gasolineTone !== "stale" && ethanolTone !== "stale" && gasolineConfidence.score >= 0.58 && ethanolConfidence.score >= 0.58;
        const strong = gasolineTone !== "stale" && ethanolTone !== "stale" && gasolineConfidence.score >= 0.7 && ethanolConfidence.score >= 0.7;

        return {
          station,
          gasolineReport,
          ethanolReport,
          gasolineConfidence,
          ethanolConfidence,
          gasolineTone,
          ethanolTone,
          distanceValue,
          score,
          ratio,
          reliable,
          strong
        };
      })
      .filter(Boolean)
      .sort((left: any, right: any) => {
        const scoreDiff = right.score - left.score;
        if (scoreDiff !== 0) return scoreDiff;
        return left.ratio - right.ratio;
      });

    const bestPair = pairCandidates[0] ?? null;
    if (!bestPair) {
      return null;
    }

    const winner = bestPair.ratio <= FLEX_FUEL_RATIO_THRESHOLD ? "etanol" : "gasolina";
    const ratioLabel = `${Math.round(bestPair.ratio * 100)}%`;

    return {
      ...bestPair,
      winner,
      ratioLabel,
      contextLabel: getEconomyLocalityLabel(bestPair.station),
      headline: bestPair.strong ? `${winner === "etanol" ? "Etanol" : "Gasolina"} compensa` : "Comparacao ainda pede cautela",
      description: bestPair.strong
        ? `Neste posto, o etanol ficou em ${ratioLabel} do preco da gasolina. Pela regra simples dos 70%, ${winner === "etanol" ? "etanol" : "gasolina"} fecha melhor hoje.`
        : `Os dois combustiveis aparecem, mas a comparacao ainda esta velha ou fraca demais para uma recomendacao forte.`
    };
  }, [orderedStations]);
  const leadEconomyOption = useMemo(() => {
    return nearbyBestOption ?? neighborhoodBestOption ?? cityBestOption ?? cheapestRecent[0] ?? null;
  }, [cheapestRecent, cityBestOption, neighborhoodBestOption, nearbyBestOption]);
  const economyReference = useMemo(() => {
    const items = priceCandidates.filter((item: any) => {
      const recencyTone = getRecencyTone(item.report.reportedAt);
      const confidence = getReportConfidenceMeta(item.report);
      return recencyTone !== "stale" && confidence.score >= 0.58;
    });

    if (items.length < ECONOMY_REFERENCE_MIN_ITEMS) {
      return {
        items,
        count: items.length,
        price: null
      };
    }

    return {
      items,
      count: items.length,
      price: items.reduce((sum: number, item: any) => sum + Number(item.report.price), 0) / items.length
    };
  }, [priceCandidates]);
  const economySavings = useMemo(() => {
    if (!leadEconomyOption) {
      return null;
    }

    if (economyReference.price === null) {
      return {
        kind: "insufficient" as const,
        candidate: leadEconomyOption,
        referenceCount: economyReference.count
      };
    }

    const candidatePrice = Number(leadEconomyOption.report.price);
    const deltaPerLiter = economyReference.price - candidatePrice;

    return {
      kind: deltaPerLiter > 0.02 ? "positive" as const : Math.abs(deltaPerLiter) <= 0.02 ? "flat" as const : "negative" as const,
      candidate: leadEconomyOption,
      referenceCount: economyReference.count,
      referencePrice: economyReference.price,
      deltaPerLiter,
      reliable: leadEconomyOption.reliable,
      liters: ECONOMY_SAVINGS_LITERS.map((volume) => ({
        volume,
        savings: deltaPerLiter * volume
      }))
    };
  }, [economyReference, leadEconomyOption]);
  const economyOpportunities = useMemo(() => {
    const cards: any[] = [];

    if (nearbyBestOption && economyReference.price !== null) {
      const deltaPerLiter = economyReference.price - Number(nearbyBestOption.report.price);
      if (deltaPerLiter >= OPPORTUNITY_MIN_DELTA) {
        cards.push({
          id: "nearby-price-window",
          eyebrow: "Perto de voce",
          title: `${fuelLabels[economyFuelFilter]} bom perto de voce`,
          station: nearbyBestOption.station,
          report: nearbyBestOption.report,
          fuelType: economyFuelFilter,
          contextLabel: nearbyBestOption.distanceValue !== null ? `${formatDistanceFromYou(nearbyBestOption.distanceValue)} · ${getEconomyLocalityLabel(nearbyBestOption.station)}` : getEconomyLocalityLabel(nearbyBestOption.station),
          summary: `${formatCurrencyBRL(deltaPerLiter)} mais barato que a media deste recorte.`,
          detail: nearbyBestOption.reliable
            ? `Paga ${formatCurrencyBRL(nearbyBestOption.report.price)} e nao sai do caminho.`
            : `Preco abriu mesmo, mas confere rapido antes de sair.`,
          badgeLabel: nearbyBestOption.reliable ? "To indo" : "Vale a pena",
          badgeVariant: nearbyBestOption.reliable ? "default" as const : "warning" as const,
          recencyTone: nearbyBestOption.recencyTone,
          confidence: nearbyBestOption.confidence,
          distanceValue: nearbyBestOption.distanceValue,
          referenceDelta: deltaPerLiter,
          ratioLabel: null,
          dropAmount: null
        });
      }
    }

    if ((economyFuelFilter === "gasolina_comum" || economyFuelFilter === "etanol") && flexComparator && flexComparator.reliable) {
      const winningFuel = flexComparator.winner === "etanol" ? "etanol" : "gasolina_comum";
      const winningReport = winningFuel === "etanol" ? flexComparator.ethanolReport : flexComparator.gasolineReport;
      const winningConfidence = winningFuel === "etanol" ? flexComparator.ethanolConfidence : flexComparator.gasolineConfidence;
      const winningTone = winningFuel === "etanol" ? flexComparator.ethanolTone : flexComparator.gasolineTone;

      cards.push({
        id: "flex-neighborhood-window",
        eyebrow: "Gasolina vs etanol",
        title: `${winningFuel === "etanol" ? "Etanol compensa" : "Gasolina compensa"} no bairro`,
        station: flexComparator.station,
        report: winningReport,
        fuelType: winningFuel,
        contextLabel: flexComparator.contextLabel,
        summary: flexComparator.description,
        detail: `Gasolina: ${formatCurrencyBRL(flexComparator.gasolineReport.price)} | Etanol: ${formatCurrencyBRL(flexComparator.ethanolReport.price)}`,
        badgeLabel: flexComparator.strong ? "Nota boa" : "Serve",
        badgeVariant: flexComparator.strong ? "default" as const : "warning" as const,
        recencyTone: winningTone,
        confidence: winningConfidence,
        distanceValue: flexComparator.distanceValue,
        referenceDelta: null,
        ratioLabel: flexComparator.ratioLabel,
        dropAmount: null
      });
    }

    if (favoriteIds.length > 0) {
      const favoriteSet = new Set(favoriteIds.map((id: string) => String(id)));
      const followedCandidates = (orderedStations as any[])
        .filter((station: any) => favoriteSet.has(String(station?.id ?? "")))
        .map((station: any) => {
          const currentReport = getSelectedStationReport(station, economyFuelFilter);
          if (!currentReport) {
            return null;
          }

          const history = [...(station?.recentReports ?? [])]
            .filter((report: any) => report?.fuelType === economyFuelFilter)
            .sort((left: any, right: any) => new Date(right.reportedAt).getTime() - new Date(left.reportedAt).getTime());
          const previousReport = history.find((report: any) => String(report?.id ?? "") !== String(currentReport.id));
          if (!previousReport) {
            return null;
          }

          const dropAmount = Number(previousReport.price) - Number(currentReport.price);
          if (dropAmount < FOLLOWED_DROP_MIN_DELTA) {
            return null;
          }

          const confidence = getReportConfidenceMeta(currentReport);
          const recencyTone = getRecencyTone(currentReport.reportedAt);
          const distanceValue = getStationDistanceValue(station);
          const reliable = recencyTone !== "stale" && confidence.score >= 0.58;
          const referenceDelta = economyReference.price === null ? null : economyReference.price - Number(currentReport.price);

          return {
            id: "followed-price-drop",
            eyebrow: "Posto acompanhado",
            title: "Preco caiu no posto que voce acompanha",
            station,
            report: currentReport,
            fuelType: economyFuelFilter,
            contextLabel: getEconomyLocalityLabel(station),
            summary: `Caiu ${formatCurrencyBRL(dropAmount)} desde a leitura anterior deste combustivel.`,
            detail: referenceDelta !== null && referenceDelta >= 0.02
              ? `Agora ele tambem aparece ${formatCurrencyBRL(referenceDelta)} abaixo da media recente do recorte.`
              : `A queda apareceu no proprio posto. Vale ver se ainda esta valendo agora.`,
            badgeLabel: reliable ? "Mudanca util" : "Mudanca com cautela",
            badgeVariant: reliable ? "default" as const : "warning" as const,
            recencyTone,
            confidence,
            distanceValue,
            referenceDelta,
            ratioLabel: null,
            dropAmount,
            sortScore: dropAmount + (reliable ? 0.25 : 0)
          };
        })
        .filter(Boolean)
        .sort((left: any, right: any) => right.sortScore - left.sortScore);

      if (followedCandidates[0]) {
        cards.push(followedCandidates[0]);
      }
    }

    return cards.slice(0, 3);
  }, [economyFuelFilter, economyReference, favoriteIds, flexComparator, nearbyBestOption, orderedStations]);
  const economyGroups = useMemo(() => {
    return [
      {
        id: "recent",
        eyebrow: "Decida agora",
        title: "Mais barato recente",
        hint: "Bom preco com atualização fresca para decidir sem rodeio.",
        items: cheapestRecent,
        empty: "Ainda nao apareceu um preco bom e recente neste recorte."
      },
      {
        id: "near",
        eyebrow: "No seu caminho",
        title: "Mais barato perto",
        hint: "Aqui o preco baixo ja vem junto com a distancia.",
        items: cheapestNearYou,
        empty: "Ative o GPS ou refine o recorte para comparar o que compensa perto de voce."
      },
      {
        id: "stale",
        eyebrow: "Vale conferir",
        title: "Barato, mas desatualizado",
        hint: "Pode compensar, mas ja pede uma checagem antes de sair.",
        items: cheapestStale,
        empty: "Nao ha preco barato envelhecido chamando atencao agora."
      }
    ];
  }, [cheapestNearYou, cheapestRecent, cheapestStale]);
  const hasEconomyItems = economyGroups.some((group) => group.items.length > 0);
  const heroComparisonEntry = cheapestRecent[0] ?? cheapestNearYou[0] ?? nearbyBestOption ?? null;
  const heroPriorityStation = priorityStations[0] ?? noRecentStations[0] ?? null;
  const heroPriorityReport = heroPriorityStation ? getSelectedStationReport(heroPriorityStation, fuelFilter) : null;

  function handleEconomyRoute(station: any, groupId: string) {
    if (!hasRouteCoordinates(station)) return;
    const lat = Number(station.lat);
    const lng = Number(station.lng);
    const stationName = getStationPublicName(station);
    void onRouteTrack?.(station.id, groupId);
    void trackProductEvent({
      eventType: "quick_action_clicked",
      pagePath: "/",
      pageTitle: "Home",
      stationId: station.id,
      scopeType: "block",
      scopeId: `economy-${groupId}`,
      payload: {
        source: "economy_surface",
        action: "route",
        groupId,
        stationName,
        fuelFilter: economyFuelFilter
      }
    });

    openExternalNavigation({
      lat,
      lng,
      stationId: station.id,
      stationName,
      source: `economy_${groupId}`
    });
  }
  return (
    <>
      {homeState.state !== "operation-normal" ? (
        <div className="mb-6 transition-all duration-300">
          <SectionCard className="space-y-4 border-white/8 bg-white/[0.04] py-4 xl:mb-3">
            <div className="space-y-1">
              <Badge className="text-[10px] uppercase tracking-widest">Mapa Vivo {role === 'senior' && "· Senior"}</Badge>
              <h2 className="text-2xl font-bold tracking-tight text-white xl:text-[1.6rem]">Buscar, comparar e enviar.</h2>
              <p className="text-sm leading-relaxed text-white/40 xl:max-w-xl">Veja os postos do recorte e entre no envio sem rodeio.</p>
            </div>

            <div className="flex min-h-[1.5rem] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {selectedReadiness ? (
                <div className="flex min-w-0 flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="text-xs text-white/40">{selectedReadiness.status === "ready" ? "✨ Recorte forte e validado." : selectedReadiness.status === "validating" ? "🧪 Recorte em validação técnica." : "🧱 Sua contribuição é útil aqui."}</span>
                  {selectedReadiness && <GroupStatusBadge status={selectedReadiness.status} className="mt-1" />}
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-white/44">Comece por Volta Redonda, Barra Mansa ou Barra do Piraí.</p>
              )}

              {selectedReadiness && selectedReadiness.status !== "ready" ? (
                <Button
                  variant="primary"
                  className="h-7 px-3 text-[9px] font-bold uppercase tracking-wider rounded-lg animate-pulse"
                  onClick={() => {
                    const cityStations = stations.filter((s: any) => s?.city && selectedCity && s.city.trim().toUpperCase() === selectedCity.trim().toUpperCase());
                    const cityStationIds = cityStations.map((s: any) => s.id);
                    if (selectedReadiness) {
                      startMission(selectedReadiness.slug || "general", selectedReadiness.name || (selectedCity || "Cidade"), cityStationIds);
                    }

                    void trackProductEvent({
                      eventType: "first_fold_action" as any,
                      pagePath: "/",
                      payload: { type: "mission_start", city: selectedCity }
                    });

                    void trackProductEvent({
                      eventType: "mission_start_from_home_cta" as any,
                      pagePath: "/",
                      pageTitle: "Home",
                      payload: {
                        city: selectedCity,
                        defaultReason: null
                      }
                    });
                  }}
                >
                  Missão Coleta
                </Button>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <FirstFoldSignalCard
                eyebrow="Comparar agora"
                title="Melhor leitura do recorte"
                station={heroComparisonEntry?.station}
                report={heroComparisonEntry?.report}
                note="Preco, recencia e contexto para decidir antes de sair."
                href={heroComparisonEntry ? (getStationHref(heroComparisonEntry.station.id, contextHref, heroComparisonEntry.report?.fuelType ?? economyFuelFilter) as Route) : undefined}
                actionLabel="Ver posto"
              />
              <FirstFoldSignalCard
                eyebrow="Enviar agora"
                title="Ponto que pede atualização"
                station={heroPriorityStation}
                report={heroPriorityReport}
                note="Se passar por aqui, vale transformar o recorte em dado novo."
                href={heroPriorityStation ? (getSendHref(heroPriorityStation.id, contextHref, fuelFilter) as Route) : undefined}
                actionLabel="Atualizar preço"
                actionVariant="primary"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink href={railSendHref as Route} className="h-11 flex-1 justify-center px-4 text-[11px] font-black uppercase tracking-[0.18em]">
                Enviar preço
              </ButtonLink>
              <ButtonLink href={"/#comparar-agora" as Route} variant="secondary" className="h-11 flex-1 justify-center px-4 text-[11px] font-black uppercase tracking-[0.18em]">
                Comparar agora
              </ButtonLink>
              <ButtonLink href={"/#mapa-ao-vivo" as Route} variant="secondary" className="h-11 flex-1 justify-center px-4 text-[11px] font-black uppercase tracking-[0.18em]">
                Abrir mapa
              </ButtonLink>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {showQuickAccess ? (
        <SectionCard
          className="mb-4 space-y-4 p-5 border-white/10 bg-white/5 xl:hidden"
          onClick={() => {
            void onQuickAccessTrack?.();
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-[color:var(--color-accent)]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">Acesso Rápido</p>
            </div>
            <Badge variant="outline" className="h-5 px-2 text-[9px] border-white/10 text-white/30 font-black uppercase tracking-tighter">Polegar amigável</Badge>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {favoriteIds.map((fid: string) => {
              const s = stations.find((st: any) => st.id === fid);
              if (!s) return null;
              const displayName = getStationPublicName(s);
              return (
                <Link
                  key={`fav-${fid}`}
                  href={getSendHref(fid, contextHref, fuelFilter) as Route}
                  className={cn("flex min-w-[160px] h-20 items-center gap-3 rounded-[24px] border border-yellow-400/30 bg-yellow-400/5 pl-4 pr-5 transition duration-200 active:scale-95 active:brightness-125 hover:bg-yellow-400/10", isAssisted && "border-yellow-400/50 bg-yellow-400/10")}
                  onClick={() => {
                    void onQuickAccessTrack?.(fid, "favorite");
                  }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-black shadow-lg shadow-yellow-400/20">
                    <Star className="h-5 w-5 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase italic tracking-tight text-white">{displayName}</p>
                    <p className="truncate text-[10px] font-bold uppercase tracking-widest text-yellow-400/50">{isAssisted ? "ENVIAR FOTO" : s.neighborhood}</p>
                  </div>
                </Link>
              );
            })}
            {recentIds.filter((rid: string) => !favoriteIds.includes(rid)).map((rid: string) => {
              const s = stations.find((st: any) => st.id === rid);
              if (!s) return null;
              const displayName = getStationPublicName(s);
              return (
                <Link
                  key={`rec-${rid}`}
                  href={getSendHref(rid, contextHref, fuelFilter) as Route}
                  className={cn("flex min-w-[160px] h-20 items-center gap-3 rounded-[24px] border border-white/10 bg-white/5 pl-4 pr-5 transition duration-200 active:scale-95 active:brightness-125 hover:bg-white/10", isAssisted && "border-white/20 bg-white/8")}
                  onClick={() => {
                    void onQuickAccessTrack?.(rid, "recent");
                  }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white/42 group-hover:bg-white/20">
                    <Clock3 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase italic tracking-tight text-white">{displayName}</p>
                    <p className="truncate text-[10px] font-bold uppercase tracking-widest text-white/30">{isAssisted ? "RETOMAR ENVIO" : s.neighborhood}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      ) : null}

      {homeState.state === "senior-hub" ? (
        <SectionCard className="mb-6 space-y-4" onClick={() => void onStationTrack?.("priority_refresh") }>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Avance o recorte</p>
              <h2 className="mt-1 text-xl font-semibold text-white">{selectedCity ? `Onde vale atualizar em ${selectedCity}` : "Próximos postos para atualizar"}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{priorityHint}</p>
            </div>
            <Badge variant={priorityStations.length > 0 ? "warning" : "secondary"}>{priorityLabel}</Badge>
          </div>

          {priorityStations.length > 0 ? (
            <div className="grid gap-3">
              {priorityStations.map((station: any) => {
                const latest = getSelectedStationReport(station, fuelFilter);
                const distanceValue = getStationDistanceValue(station);
                const recencyTone = latest ? getRecencyTone(latest.reportedAt) : null;

                return (
                  <div key={station.id} className="rounded-[22px] border border-white/8 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-white">{getStationPublicName(station)}</p>
                        <p className="mt-1 truncate text-xs uppercase tracking-[0.16em] text-white/36">
                          {[station.neighborhood, station.city].filter(Boolean).join(" · ") || "Recorte aberto"}
                        </p>
                      </div>
                      {distanceValue !== null ? (
                        <Badge variant="outline" className="shrink-0 text-[10px]">{formatDistanceFromYou(distanceValue)}</Badge>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant={latest && recencyTone ? recencyToneToBadgeVariant(recencyTone) : "warning"} className="text-[10px]">
                        {latest ? formatRecencyLabel(latest.reportedAt) : "Sem preço recente"}
                      </Badge>
                      {latest ? <Badge variant="secondary" className="text-[10px]">{fuelLabels[latest.fuelType as FuelType]} · {formatCurrencyBRL(Number(latest.price))}</Badge> : null}
                      {station.brand ? <Badge variant="outline" className="text-[10px]">{station.brand}</Badge> : null}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <ButtonLink href={getSendHref(station.id, contextHref, fuelFilter) as Route} className="flex-1 justify-center text-[11px] font-black uppercase tracking-[0.18em]">
                        Atualizar preço
                      </ButtonLink>
                      <ButtonLink href={getStationHref(station.id, contextHref, latest?.fuelType ?? fuelFilter) as Route} variant="secondary" className="justify-center px-4 text-[11px] font-bold uppercase tracking-[0.16em]">
                        Ver posto
                      </ButtonLink>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyStateCard
              title="Sem prioridade aberta agora"
              description="O recorte atual está coberto. Vale abrir o mapa ou mudar a cidade para procurar lacunas reais."
              actionHref={"/#mapa-ao-vivo" as Route}
              actionLabel="Abrir mapa"
              className="text-left"
            />
          )}
        </SectionCard>
      ) : null}

      {homeState.state === "senior-hub" && selectedCity && !isLowPerf ? (
        <div className="mb-6">
          <RecorteActivityWidget city={selectedCity} groupSlug={selectedReadiness?.slug} isReady={selectedReadiness?.status === "ready"} />
        </div>
      ) : null}

      {homeState.state === "operation-normal" && !isHeroCollapsed && !suppressPrimaryMapHero ? (
        <SectionCard id="mapa-ao-vivo" data-hero-primary="home-map" className="space-y-3 shadow-lg shadow-black/14 xl:p-5">
          <div className="space-y-4 px-5 xl:px-0">
            <div className="flex w-full items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">Primeiro movimento</p>
                <h3 className="mt-1 text-xl font-semibold text-white xl:text-[1.35rem]">Buscar, comparar e enviar.</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">A capa mostra primeiro o melhor sinal do recorte, o ponto que pede atualização e só depois abre o mapa completo.</p>
              </div>
              <ButtonLink href="/enviar" data-cta-inline="home-send-now" className="relative z-[1001] hidden h-9 whitespace-nowrap px-3.5 text-[11px] font-black uppercase tracking-[0.18em] md:inline-flex">Enviar preço</ButtonLink>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <FirstFoldSignalCard
                eyebrow="Comparar agora"
                title="Melhor leitura do recorte"
                station={heroComparisonEntry?.station}
                report={heroComparisonEntry?.report}
                note="Comece pelo melhor equilibrio entre preço, recencia e proximidade." 
                href={heroComparisonEntry ? (getStationHref(heroComparisonEntry.station.id, contextHref, heroComparisonEntry.report?.fuelType ?? economyFuelFilter) as Route) : undefined}
                actionLabel="Ver posto"
              />
              <FirstFoldSignalCard
                eyebrow="Enviar agora"
                title="Onde sua foto destrava o mapa"
                station={heroPriorityStation}
                report={heroPriorityReport}
                note="Se passar aqui, vale transformar dúvida do recorte em preço confirmado."
                href={heroPriorityStation ? (getSendHref(heroPriorityStation.id, contextHref, fuelFilter) as Route) : undefined}
                actionLabel="Atualizar preço"
                actionVariant="primary"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink href={railSendHref as Route} className="h-11 flex-1 justify-center px-4 text-[11px] font-black uppercase tracking-[0.18em]">
                Enviar preço
              </ButtonLink>
              <ButtonLink href={"/#comparar-agora" as Route} variant="secondary" className="h-11 flex-1 justify-center px-4 text-[11px] font-black uppercase tracking-[0.18em]">
                Comparar agora
              </ButtonLink>
              <ButtonLink href={"/atualizacoes" as Route} variant="secondary" className="h-11 flex-1 justify-center px-4 text-[11px] font-black uppercase tracking-[0.18em]">
                Ver atualizações
              </ButtonLink>
            </div>
          </div>
          {mapStations.length > 0 ? (
            <HomeMapSurface stations={mapStations} contextHref={contextHref} fuelFilter={fuelFilter} center={null} preferListFirst={Boolean(false)} />
          ) : (
            <EmptyStateCard
              title={"Nenhum posto disponível no momento."}
              description={"Ajuste a cidade, o combustível ou a recência para trazer um recorte útil de volta."}
              actionHref="/"
              actionLabel="Limpar recorte"
              className="text-left"
            />
          )}
        </SectionCard>
      ) : null}

      <SectionCard className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-4">
        {[
          { label: "No Recorte", value: mapStations.length, note: "Postos visíveis" },
          { label: "Com Preço", value: stationsWithRecentPrice.length, note: "Recentemente" },
          { label: "Falta Atualizar", value: stationsWithoutRecentPrice, note: "Sem preço recente", tone: "warning" },
          { label: "No Ar 24h", value: recentCount, note: "Últimos envios", tone: "accent" }
        ].map((stat: any) => (
          <div key={stat.label} className="flex flex-col rounded-[18px] border border-white/5 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold tracking-tighter ${stat.tone === 'accent' ? 'text-[color:var(--color-accent)]' : stat.tone === 'warning' ? 'text-orange-400' : 'text-white'}`}>
              {stat.value}
            </p>
            <p className="text-[10px] text-white/20">{stat.note}</p>
          </div>
        ))}
      </SectionCard>

      <SectionCard id="comparar-agora" className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Vale a pena para mim</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Decida melhor antes de abastecer</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/50">O menor preco bruto continua aqui, mas agora junto com distancia, recencia, confianca e uma leitura simples de gasolina x etanol quando o recorte ajudar.</p>
          </div>
          <Badge variant="warning">{fuelLabels[economyFuelFilter]}</Badge>
        </div>

        <div className="space-y-3 rounded-[22px] border border-white/8 bg-black/20 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">Filtro principal</p>
              <p className="mt-1 text-sm text-white/58">Compare so o combustivel que voce realmente quer abastecer.</p>
            </div>
            <Badge variant="secondary">Lembra neste aparelho</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {ECONOMY_FUEL_OPTIONS.map((option) => {
              const isActive = option.value === economyFuelFilter;
              const hasData = availableEconomyFuels.length === 0 || availableEconomyFuels.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setEconomyFuelFilter(option.value);
                    void trackProductEvent({
                      eventType: "quick_action_clicked",
                      pagePath: "/",
                      pageTitle: "Home",
                      scopeType: "block",
                      scopeId: "economy-fuel-filter",
                      payload: {
                        source: "economy_surface",
                        action: "filter_fuel",
                        fuelFilter: option.value,
                        hasData
                      }
                    });
                  }}
                  className={cn(
                    "rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition",
                    isActive
                      ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-black"
                      : "border-white/10 bg-white/[0.04] text-white/62 hover:border-white/20 hover:bg-white/[0.08]",
                    !hasData && !isActive && "opacity-60"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs leading-relaxed text-white/42">
            Os cards abaixo seguem <span className="font-semibold text-white/72">{fuelLabels[economyFuelFilter]}</span>. Quando existir base suficiente, o comparador flex aparece a parte para gasolina comum x etanol.
          </p>
        </div>

        <div className="space-y-4 rounded-[22px] border border-white/8 bg-black/20 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Leitura de oportunidade</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Quando vale acelerar a decisao</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/52">A superficie so chama atencao quando aparece vantagem real contra a media recente, no bairro ou em posto que voce ja acompanha.</p>
            </div>
            <Badge variant={economyOpportunities.length > 0 ? "default" : "secondary"}>{economyOpportunities.length > 0 ? `${economyOpportunities.length} sinais agora` : "Sem barulho"}</Badge>
          </div>

          {economyOpportunities.length === 0 ? (
            <p className="text-sm leading-relaxed text-white/42">Sem oportunidade clara de {fuelLabels[economyFuelFilter].toLowerCase()} neste momento. O app continua mostrando comparacao e preco bruto, mas sem forcar alerta fraco.</p>
          ) : (
            <div className="grid gap-3 xl:grid-cols-3">
              {economyOpportunities.map((opportunity: any) => {
                const stationHref = getStationHref(opportunity.station.id, contextHref, opportunity.fuelType) as Route;
                const sendHref = getSendHref(opportunity.station.id, contextHref, opportunity.fuelType) as Route;
                const canRoute = hasRouteCoordinates(opportunity.station);

                return (
                  <div key={opportunity.id} className="rounded-[20px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">{opportunity.eyebrow}</p>
                        <h3 className="mt-1 text-base font-semibold text-white">{opportunity.title}</h3>
                      </div>
                      <Badge variant={opportunity.badgeVariant} className="self-start">{opportunity.badgeLabel}</Badge>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold leading-snug text-white">{getStationPublicName(opportunity.station)}</p>
                        <p className="mt-1 text-[11px] text-white/46">{opportunity.contextLabel}</p>
                      </div>
                      <div className="shrink-0 sm:text-right">
                        <p className="text-2xl font-black tracking-tight text-white">{formatCurrencyBRL(opportunity.report.price)}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/34">{fuelLabels[opportunity.fuelType as FuelType]}</p>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-white/58">{opportunity.summary}</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/46">{opportunity.detail}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant={recencyToneToBadgeVariant(opportunity.recencyTone)}>{formatRecencyLabel(opportunity.report.reportedAt)}</Badge>
                      <Badge variant={opportunity.confidence.variant}>{opportunity.confidence.label}</Badge>
                      {opportunity.distanceValue !== null ? <Badge variant="secondary">{formatDistanceFromYou(opportunity.distanceValue)}</Badge> : null}
                      {opportunity.referenceDelta !== null && opportunity.referenceDelta >= 0.02 ? <Badge variant="secondary">{formatCurrencyBRL(opportunity.referenceDelta)} abaixo da media</Badge> : null}
                      {opportunity.dropAmount !== null ? <Badge variant="secondary">Caiu {formatCurrencyBRL(opportunity.dropAmount)}</Badge> : null}
                      {opportunity.ratioLabel ? <Badge variant="secondary">{opportunity.ratioLabel}</Badge> : null}
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <ButtonLink
                        href={stationHref}
                        variant="secondary"
                        className="min-h-9 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em]"
                        onClick={() => {
                          rememberStationVisit({ id: opportunity.station.id, name: getStationPublicName(opportunity.station), city: opportunity.station.city });
                          void onStationTrack?.(`economy-opportunity-${opportunity.id}`);
                        }}
                      >
                        Ver posto
                      </ButtonLink>
                      <ButtonLink
                        href={sendHref}
                        className="min-h-9 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em]"
                        onClick={() => {
                          rememberStationVisit({ id: opportunity.station.id, name: getStationPublicName(opportunity.station), city: opportunity.station.city });
                          void trackProductEvent({
                            eventType: "quick_action_clicked",
                            pagePath: sendHref,
                            pageTitle: "Home",
                            stationId: opportunity.station.id,
                            scopeType: "block",
                            scopeId: `economy-opportunity-${opportunity.id}`,
                            payload: {
                              source: "economy_surface",
                              action: "photo",
                              groupId: opportunity.id,
                              fuelFilter: opportunity.fuelType
                            }
                          });
                        }}
                      >
                        Atualizar preco
                      </ButtonLink>
                      {canRoute ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-9 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/72 sm:col-span-2"
                          onClick={() => handleEconomyRoute(opportunity.station, opportunity.id)}
                        >
                          <Navigation className="h-3.5 w-3.5" />
                          Tracar rota
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Melhor opcao agora</p>
              <h3 className="mt-1 text-lg font-semibold text-white">O app resume o que fecha melhor no momento</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/52">O preco continua visivel. A diferenca e que agora entra junto o peso de distancia, recencia e confianca.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {economyReadouts.map((readout) => {
                const entry = readout.entry;
                const report = entry?.report ?? null;
                const station = entry?.station ?? null;
                const recommendation = getEconomyRecommendationMeta(entry);

                return (
                  <div key={readout.id} className="rounded-[20px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">{readout.title}</p>
                        <p className="mt-1 text-sm text-white/58">{readout.hint}</p>
                      </div>
                      {entry ? <Badge variant={recommendation.variant} className="self-start">{recommendation.label}</Badge> : null}
                    </div>
                    {report && station ? (
                      <>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold leading-snug text-white">{getStationPublicName(station)}</p>
                            <p className="mt-1 text-[11px] text-white/42">{readout.context}</p>
                          </div>
                          <div className="shrink-0 sm:text-right">
                            <p className="text-xl font-black tracking-tight text-white">{formatCurrencyBRL(report.price)}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/34">{fuelLabels[economyFuelFilter]}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-white/58">{entry.reason}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant={recencyToneToBadgeVariant(entry.recencyTone)}>{formatRecencyLabel(report.reportedAt)}</Badge>
                          <Badge variant={entry.confidence.variant}>{entry.confidence.label}</Badge>
                          <Badge variant="secondary">{entry.confidence.detail}</Badge>
                          {entry.distanceValue !== null ? <Badge variant="secondary">{formatDistanceFromYou(entry.distanceValue)}</Badge> : null}
                        </div>
                      </>
                    ) : (
                      <p className="mt-4 text-sm leading-relaxed text-white/42">Ainda nao apareceu leitura util de {fuelLabels[economyFuelFilter].toLowerCase()} para esta lente do recorte.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Gasolina x etanol</p>
                  <h3 className="mt-1 text-base font-semibold text-white">Comparador flex</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/52">Regra popular dos 70% sem virar calculadora complicada.</p>
                </div>
                <Badge variant={flexComparator ? flexComparator.strong ? "default" : flexComparator.reliable ? "warning" : "danger" : "secondary"} className="self-start">
                  {flexComparator ? flexComparator.strong ? "Base boa" : flexComparator.reliable ? "Base util" : "Base fraca" : "Sem base"}
                </Badge>
              </div>

              {flexComparator ? (
                <>
                  <div className="mt-4 rounded-[18px] border border-white/8 bg-white/[0.04] p-4">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Posto usado na comparacao</p>
                    <p className="mt-1 text-sm font-semibold text-white">{getStationPublicName(flexComparator.station)}</p>
                    <p className="mt-1 text-[11px] text-white/46">{flexComparator.contextLabel}</p>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {[
                      {
                        id: "gasolina",
                        label: fuelLabels.gasolina_comum,
                        report: flexComparator.gasolineReport,
                        tone: flexComparator.gasolineTone,
                        confidence: flexComparator.gasolineConfidence
                      },
                      {
                        id: "etanol",
                        label: fuelLabels.etanol,
                        report: flexComparator.ethanolReport,
                        tone: flexComparator.ethanolTone,
                        confidence: flexComparator.ethanolConfidence
                      }
                    ].map((item) => (
                      <div key={item.id} className="rounded-[18px] border border-white/8 bg-white/[0.04] p-4">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">{item.label}</p>
                        <p className="mt-2 text-xl font-black tracking-tight text-white">{formatCurrencyBRL(item.report.price)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant={recencyToneToBadgeVariant(item.tone)}>{formatRecencyLabel(item.report.reportedAt)}</Badge>
                          <Badge variant={item.confidence.variant}>{item.confidence.label}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-[18px] border border-white/8 bg-black/20 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-base font-semibold text-white">{flexComparator.headline}</p>
                      <Badge variant="secondary" className="self-start">{flexComparator.ratioLabel}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-white/58">{flexComparator.description}</p>
                    {!flexComparator.strong ? (
                      <p className="mt-2 text-xs leading-relaxed text-white/42">Quando um dos dois precos envelhece ou chega fraco, a recomendacao continua visivel, mas perde peso.</p>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-white/42">Ainda faltam gasolina comum e etanol recentes no mesmo posto para comparar flex com seguranca neste recorte.</p>
              )}
            </div>

            <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Economia estimada</p>
                  <h3 className="mt-1 text-base font-semibold text-white">Quanto isso pode representar no tanque</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/52">Leitura curta contra a referencia recente do proprio recorte.</p>
                </div>
                <Badge variant={economySavings ? economySavings.kind === "positive" ? "default" : economySavings.kind === "insufficient" ? "secondary" : "warning" : "secondary"} className="self-start">
                  {economySavings ? economySavings.kind === "positive" ? "Abrindo economia" : economySavings.kind === "insufficient" ? "Base curta" : "Sem folga clara" : "Sem base"}
                </Badge>
              </div>

              {!economySavings ? (
                <p className="mt-4 text-sm leading-relaxed text-white/42">Ainda nao apareceu base suficiente de {fuelLabels[economyFuelFilter].toLowerCase()} para estimar economia com honestidade.</p>
              ) : economySavings.kind === "insufficient" ? (
                <p className="mt-4 text-sm leading-relaxed text-white/42">Ainda faltam pelo menos {ECONOMY_REFERENCE_MIN_ITEMS} leituras recentes de {fuelLabels[economyFuelFilter].toLowerCase()} para prometer economia estimada sem forcar a barra.</p>
              ) : economySavings.kind === "positive" ? (
                <>
                  <p className="mt-4 text-sm leading-relaxed text-white/58">
                    Se voce escolher <span className="font-semibold text-white">{getStationPublicName(economySavings.candidate.station)}</span> agora, o litro sai a <span className="font-semibold text-white">{formatCurrencyBRL(economySavings.candidate.report.price)}</span>. Contra a media recente do recorte ({economySavings.referenceCount} leituras), isso abre economia real.
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {economySavings.liters.map((entry) => (
                      <div key={entry.volume} className="rounded-[18px] border border-white/8 bg-white/[0.04] p-4">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">{entry.volume}L</p>
                        <p className="mt-2 text-xl font-black tracking-tight text-white">{formatCurrencyBRL(entry.savings)}</p>
                        <p className="mt-1 text-[11px] text-white/46">contra a media recente</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-white/42">
                    Referencia recente: {formatCurrencyBRL(economySavings.referencePrice)} por litro.
                    {!economySavings.reliable ? " A economia aparece, mas a leitura do posto ainda pede cautela." : ""}
                  </p>
                </>
              ) : economySavings.kind === "flat" ? (
                <p className="mt-4 text-sm leading-relaxed text-white/42">O melhor preco ficou praticamente colado a media recente do recorte. Hoje a diferenca esta pequena demais para prometer economia real no tanque.</p>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-white/42">O recorte nao abriu uma economia clara contra a referencia recente. Vale olhar rota, recencia e confianca, mas sem promessa forte de poupanca agora.</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Preco bruto", note: "Nao some da tela. Continua na frente para a conta fechar rapido." },
            { label: "Recencia", note: "Preco velho perde peso, mesmo quando parece o melhor da lista." },
            { label: "Confianca", note: "Recomendacao forte so aparece quando o dado ainda se sustenta." },
            { label: "Distancia", note: "Ajuda a separar o barato distante do que vale no caminho." }
          ].map((signal) => (
            <div key={signal.label} className="rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">{signal.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/58">{signal.note}</p>
            </div>
          ))}
        </div>

        {!hasEconomyItems ? (
          <EmptyStateCard
            title={mapStations.length > 0 ? `Ha postos cadastrados, mas ainda sem ${fuelLabels[economyFuelFilter].toLowerCase()} recente neste recorte.` : `Nenhum preco de ${fuelLabels[economyFuelFilter].toLowerCase()} disponivel neste recorte.`}
            description={mapStations.length > 0 ? "Abra a lista dos postos sem atualizacao e envie a primeira foto desse combustivel onde puder." : "Tente outro bairro, cidade ou mude o combustivel da comparacao para voltar a um recorte util."}
            actionHref="/postos/sem-atualizacao"
            actionLabel="Ver postos sem atualizacao"
            className="text-left"
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-3">
            {economyGroups.map((group: any) => (
              <div key={group.id} className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">{group.eyebrow}</p>
                    <h3 className="mt-1 text-base font-semibold text-white">{group.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/50">{group.hint}</p>
                  </div>
                  <Badge variant="outline" className="self-start">{group.items.length}</Badge>
                </div>

                {group.items.length === 0 ? (
                  <p className="text-sm leading-relaxed text-white/48">{group.empty}</p>
                ) : (
                  <div className="space-y-3">
                    {group.items.map(({ station, report }: any) => {
                      const recencyTone = getRecencyTone(report.reportedAt);
                      const confidence = getReportConfidenceMeta(report);
                      const canRoute = hasRouteCoordinates(station);
                      const distanceValue = getStationDistanceValue(station);
                      const stationHref = getStationHref(station.id, contextHref, economyFuelFilter) as Route;
                      const sendHref = getSendHref(station.id, contextHref, economyFuelFilter) as Route;

                      return (
                        <div key={report.id || `${group.id}-${station.id}`} className="rounded-[18px] border border-white/8 bg-black/20 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <Link
                                href={stationHref}
                                className="block"
                                onClick={() => {
                                  rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
                                  void onStationTrack?.(`economy-${group.id}`);
                                }}
                              >
                                <p className="break-words text-sm font-semibold leading-snug text-white">{getStationPublicName(station)}</p>
                                <p className="mt-1 text-[11px] text-white/46">{getEconomyLocalityLabel(station)}</p>
                              </Link>
                            </div>
                            <div className="shrink-0 sm:text-right">
                              <p className="text-2xl font-black tracking-tight text-white">{formatCurrencyBRL(report.price)}</p>
                              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/34">{fuelLabels[economyFuelFilter]}</p>
                              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]/78">{group.id === "stale" ? "Pode ter mudado" : group.id === "near" ? "Bom no caminho" : "Bom agora"}</p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant={recencyToneToBadgeVariant(recencyTone)}>
                              {recencyTone === "stale" ? `Preco de ${formatRecencyLabel(report.reportedAt)}` : `Atualizado ${formatRecencyLabel(report.reportedAt)}`}
                            </Badge>
                            <Badge variant={confidence.variant}>{confidence.label}</Badge>
                            <Badge variant="secondary">{confidence.detail}</Badge>
                            {distanceValue !== null ? <Badge variant="secondary">{formatDistanceFromYou(distanceValue)}</Badge> : null}
                          </div>

                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            <ButtonLink
                              href={stationHref}
                              variant="secondary"
                              className="min-h-9 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em]"
                              onClick={() => {
                                rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
                                void onStationTrack?.(`economy-${group.id}`);
                              }}
                            >
                              Ver posto
                            </ButtonLink>
                            <ButtonLink
                              href={sendHref}
                              className="min-h-9 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em]"
                              onClick={() => {
                                rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
                                void trackProductEvent({
                                  eventType: "quick_action_clicked",
                                  pagePath: sendHref,
                                  pageTitle: "Home",
                                  stationId: station.id,
                                  scopeType: "block",
                                  scopeId: `economy-${group.id}`,
                                  payload: {
                                    source: "economy_surface",
                                    action: "photo",
                                    groupId: group.id,
                                    fuelFilter: economyFuelFilter
                                  }
                                });
                              }}
                            >
                              Atualizar preco
                            </ButtonLink>
                            {canRoute ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="min-h-9 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/72 sm:col-span-2"
                                onClick={() => handleEconomyRoute(station, group.id)}
                              >
                                <Navigation className="h-3.5 w-3.5" />
                                Tracar rota
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {noRecentStations.length > 0 ? (
        <SectionCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Postos sem atualização recente</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Onde ainda falta preço aprovado</h2>
            </div>
            <Link href="/postos/sem-atualizacao" className="text-sm text-[color:var(--color-accent)]">
              Ver lista completa
            </Link>
          </div>
          <div className="space-y-3">
            {noRecentStations.map((station: any) => (
              <StationCard
                key={station.id}
                station={station}
                fuelFilter={fuelFilter}
                returnToHref={contextHref}
                isStreetMode={isStreetMode}
                isAssisted={isAssisted}
                isUltraClaro={listMode === 'ultra-claro'}
                isAdvanced={listMode === 'avancado'}
                isFavorite={isFavorite(station.id)}
                onFavoriteToggle={() => toggleFavorite(station.id)}
                recordActivity={recordActivity}
                isHeaderSticky={isHeroCollapsed || missionActive}
                isHeaderMicro={false}
              />
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Agora no mapa</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Consulta rápida</h2>
          </div>
          <Clock3 className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>
        <div className="space-y-3">
          {orderedStations.length === 0 ? (
            <EmptyStateCard
              title="Nenhum posto encontrado para essa busca."
              description="Tente outra cidade, combustível ou janela de recência. Se quiser, abra os postos sem atualização para colaborar."
              actionHref="/postos/sem-atualizacao"
              actionLabel="Ver postos sem atualização"
              className="text-left"
            />
          ) : (
            orderedStations.map((station: any) => (
              <StationCard
                key={station.id}
                station={station}
                fuelFilter={fuelFilter}
                returnToHref={contextHref}
                isStreetMode={isStreetMode}
                isAssisted={isAssisted}
                isUltraClaro={listMode === 'ultra-claro'}
                isAdvanced={listMode === 'avancado'}
                isFavorite={isFavorite(station.id)}
                onFavoriteToggle={() => toggleFavorite(station.id)}
                recordActivity={recordActivity}
                isHeaderSticky={isHeroCollapsed || missionActive}
                isHeaderMicro={false}
              />
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Atualizações recentes</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Transparência popular</h2>
          </div>
          <Badge variant={filteredFeed.length === 0 ? "outline" : "warning"}>{filteredFeed.length} itens</Badge>
        </div>
        <div className="space-y-2">
          {filteredFeed.slice(0, 3).length === 0 ? (
            <EmptyStateCard
              title="Nenhuma atualização recente neste filtro."
              description="Ajuste o combustível, a cidade ou a janela de recência. Se quiser colaborar, envie o primeiro preço."
              actionHref="/postos/sem-atualizacao"
              actionLabel="Ver postos sem atualização"
              className="text-left"
            />
          ) : (
            filteredFeed.slice(0, 3).map((report: any) => (
              <div key={report.id} className="flex items-center justify-between rounded-[18px] border border-white/5 bg-white/5 px-4 py-3">
                <div className="min-w-0 pr-4">
                  <p className="truncate text-sm font-medium text-white/80">{getStationPublicName(report.station)}</p>
                  <p className="truncate text-[10px] text-white/30">
                    {report.station.neighborhood} · {fuelLabels[report.fuelType as keyof typeof fuelLabels]}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-white">{formatCurrencyBRL(report.price)}</p>
                  <p className="text-[10px] text-white/30">{formatRecencyLabel(report.reportedAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </>
  );
}











