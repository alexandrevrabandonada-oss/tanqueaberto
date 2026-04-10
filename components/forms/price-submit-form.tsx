/* eslint-disable @next/next/no-img-element */
"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ChangeEvent, ReactNode } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Camera, ShieldCheck, ArrowRight, Clock3, Trophy, Target, Zap, Search, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FuelType, StationWithReports } from "@/lib/types";
import { countFilledFuelPrices, getFilledFuelPriceEntries, getPrimaryFuelSelection, normalizeFuelPriceMap, submissionFuelOptions, type FuelPriceMap } from "@/lib/submissions/fuel-prices";
import { fuelLabels } from "@/lib/format/labels";
import { submitPriceReportAction, type SubmitState } from "@/app/enviar/actions";
import { completeStationInRoute, readRouteContext, type RouteContext } from "@/lib/navigation/route-context";
import { useLocationHardening } from "@/hooks/use-location-hardening";
import { calculateDistance, formatDistanceFromYou } from "@/lib/geo/distance";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel } from "@/lib/format/time";
import { trackProductEvent } from "@/lib/telemetry/client";
import { clearSubmissionDraft, loadSubmissionDraft, saveSubmissionDraft, type SubmissionDraftSnapshot, type SubmissionDraftStep, type SubmissionDraftStatus } from "@/lib/drafts/submission-draft";
import { buildSubmissionQueueHref, clearSubmissionQueueForDraftKey, loadSubmissionQueue, removeSubmissionQueueEntry, upsertSubmissionQueueEntry, type SubmissionQueueEntry } from "@/lib/queue/submission-queue";
import { getQueuePhoto } from "@/lib/queue/photo-storage";
import { useStreetMode } from "@/hooks/use-street-mode";
import { useSubmissionHistory } from "@/components/history/submission-history-context";
import { useMissionContext } from "@/components/mission/mission-context";
import { cn } from "@/lib/utils"
import { getSelectedStationReport } from "@/lib/filters/public"
import { getStationPublicName, hasPendingStationLocationReview, isValidStationCoordinate } from "@/lib/quality/stations";
import { analyzePhotoQuality, type PhotoQualityResult } from "@/lib/camera/quality-analyzer";
import { processImageForUpload } from "@/lib/camera/image-processor";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles, MessageCircleQuestion } from "lucide-react";
import { consumeHubAttribution } from "@/lib/telemetry/attribution";
import { useMySubmissions } from "@/hooks/use-my-submissions";
import { persistProgressiveIdentityNickname, readProgressiveIdentityProfile } from "@/lib/identity/progressive";
import { useStreetSession } from "@/hooks/use-street-session";
import { useTestMode } from "@/hooks/use-test-mode";
import { submitContextualFeedbackAction } from "@/app/hub/feedback-actions";
import { normalizeContextValue, readHomeContext, readLastStationContext, rememberStationVisit } from "@/lib/navigation/home-context";

const SubmissionQueuePanel = dynamic(() => import("@/components/forms/submission-queue-panel").then((mod) => mod.SubmissionQueuePanel), {
  ssr: false,
  loading: () => null
});

const ProgressiveIdentityPrompt = dynamic(() => import("@/components/identity/progressive-identity-prompt").then((mod) => mod.ProgressiveIdentityPrompt), {
  ssr: false,
  loading: () => null
});

const PostSubmissionBridge = dynamic(() => import("./post-submission-bridge").then((mod) => mod.PostSubmissionBridge), {
  ssr: false,
  loading: () => null
});

const ContextualFeedback = dynamic(() => import("@/components/feedback/contextual-feedback").then((mod) => mod.ContextualFeedback), {
  ssr: false,
  loading: () => null
});
const fuelOptions: FuelType[] = submissionFuelOptions;

type EvidenceMode = "placa_faixa" | "sem_placa_faixa";
type ManualPriceSource = "" | "bomba" | "recibo" | "painel_interno" | "informacao_local";
const manualPriceSourceLabels: Record<Exclude<ManualPriceSource, "">, string> = {
  bomba: "Bomba",
  recibo: "Recibo",
  painel_interno: "Painel interno",
  informacao_local: "Informação local"
};
const allowedFuelSet = new Set<FuelType>(fuelOptions);
const initialState: SubmitState = { error: null, errorCode: null, retryable: false, success: false, noticeTitle: null, noticeBody: null, noticeTone: null, noticeCode: null };
interface PriceSubmitFormProps {
  stations: StationWithReports[];
  initialStationId?: string;
  initialFuelType?: FuelType;
  returnToHref?: string;
  draftKeyOverride?: string;
}

function safeRoute(value?: string): Route | null {
  return value && value.startsWith("/") ? (value as Route) : null;
}

function createDraftKey(initialStationId?: string, override?: string) {
  if (override) {
    return override;
  }

  return `bomba-aberta:price-draft:${initialStationId ?? "default"}`;
}

function buildStepPayload(step: SubmissionDraftStep, compactMode: boolean, lockedStation: boolean, hasPhoto: boolean, selectedStationId: string | null) {
  return { step, compactMode, lockedStation, hasPhoto, selectedStationId };
}

function buildDraftSnapshot(input: {
  key: string;
  stationId: string;
  fuelType: FuelType;
  price: string;
  fuelPrices: FuelPriceMap;
  nickname: string;
  lastStep: SubmissionDraftStep;
  status: SubmissionDraftStatus;
  photo: File | null;
}) {
  return {
    key: input.key,
    stationId: input.stationId,
    fuelType: input.fuelType,
    price: input.price,
    fuelPrices: input.fuelPrices,
    nickname: input.nickname,
    status: input.status,
    lastStep: input.lastStep,
    updatedAt: new Date().toISOString(),
    photoName: input.photo?.name ?? null,
    photoType: input.photo?.type ?? null,
    photoSize: input.photo?.size ?? null,
    photo: input.photo
  } satisfies SubmissionDraftSnapshot;
}

function isPhotoMetadataPresent(snapshot: Partial<SubmissionDraftSnapshot>) {
  return Boolean(snapshot.photoName || snapshot.photoType || snapshot.photoSize);
}

function hasMeaningfulDraftContent(snapshot: Partial<SubmissionDraftSnapshot>, fuelPrices: FuelPriceMap) {
  return (
    countFilledFuelPrices(fuelPrices) > 0 ||
    Boolean(snapshot.nickname?.trim()) ||
    Boolean(snapshot.photo) ||
    isPhotoMetadataPresent(snapshot)
  );
}

function getPhotoName(photoType?: string | null, fallbackName = "foto") {
  const suffix = photoType?.split("/")[1] ?? "jpg";
  return `${fallbackName}.${suffix}`;
}

function syncProcessedFileToInput(input: HTMLInputElement | null, file: File) {
  if (!input || typeof DataTransfer === "undefined") {
    return false;
  }

  try {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    return input.files?.[0]?.name === file.name && input.files?.[0]?.size === file.size;
  } catch {
    return false;
  }
}

export interface StationPickerCandidate {
  station: StationWithReports;
  publicName: string;
  neighborhoodLabel: string;
  addressShort: string;
  fullAddress: string;
  brandLabel: string | null;
  searchText: string;
  distance: number | null;
  recentIndex: number;
  visibilityRank: number;
  geoRank: number;
  ambiguityCount: number;
  cityContextMatch: boolean;
  hasReliableCoordinate: boolean;
}

function shortAddress(address?: string | null) {
  if (!address) return "";
  return address
    .split(",")
    .slice(0, 2)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(", ");
}

function normalizeStationSearchValue(value: string) {
  return normalizeContextValue(value)
    .replace(/[.,/\-]+/g, " ")
    .replace(/\bav(?:enida)?\b/g, "avenida")
    .replace(/\br(?:ua)?\b/g, "rua")
    .replace(/\brod(?:ovia)?\b/g, "rodovia")
    .replace(/\best(?:rada)?\b/g, "estrada")
    .replace(/\bpres(?:idente)?\b/g, "presidente")
    .replace(/\bgov(?:ernador)?\b/g, "governador")
    .replace(/\bquilometros?\b/g, "km")
    .replace(/\bpetrobras\b/g, "br")
    .replace(/\bvibra\b/g, "br")
    .replace(/\s+/g, " ")
    .trim();
}

function expandStationHighlightTokens(query: string) {
  const rawTokens = normalizeContextValue(query).split(/\s+/g).filter(Boolean);
  const canonicalTokens = normalizeStationSearchValue(query).split(/\s+/g).filter(Boolean);
  const tokens = new Set<string>([...rawTokens, ...canonicalTokens]);

  canonicalTokens.forEach((token) => {
    if (token === "avenida") tokens.add("av");
    if (token === "rua") tokens.add("r");
    if (token === "rodovia") tokens.add("rod");
    if (token === "estrada") tokens.add("est");
    if (token === "presidente") tokens.add("pres");
    if (token === "governador") tokens.add("gov");
  });

  return Array.from(tokens).filter((token) => token.length >= 2);
}

function buildSearchableCharacterIndex(value: string) {
  let normalized = "";
  const map: number[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const normalizedChunk = value[index]
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();

    for (const character of normalizedChunk) {
      normalized += character;
      map.push(index);
    }
  }

  return { normalized, map };
}

function renderHighlightedStationText(value: string, query: string): ReactNode {
  const text = String(value ?? "");
  if (!text.trim() || !query.trim()) {
    return text;
  }

  const tokens = expandStationHighlightTokens(query);
  if (tokens.length === 0) {
    return text;
  }

  const { normalized, map } = buildSearchableCharacterIndex(text);
  const ranges: Array<{ start: number; end: number }> = [];

  tokens.forEach((token) => {
    let cursor = normalized.indexOf(token);
    while (cursor >= 0) {
      const start = map[cursor];
      const end = map[cursor + token.length - 1] + 1;
      ranges.push({ start, end });
      cursor = normalized.indexOf(token, cursor + token.length);
    }
  });

  if (ranges.length === 0) {
    return text;
  }

  ranges.sort((left, right) => left.start - right.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const range of ranges) {
    const current = merged[merged.length - 1];
    if (!current || range.start > current.end) {
      merged.push({ ...range });
      continue;
    }

    current.end = Math.max(current.end, range.end);
  }

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  merged.forEach((range, index) => {
    if (range.start > lastIndex) {
      nodes.push(text.slice(lastIndex, range.start));
    }

    nodes.push(
      <span key={`${text}-${range.start}-${range.end}-${index}`} className="rounded bg-[color:var(--color-accent)]/18 px-0.5 text-white">
        {text.slice(range.start, range.end)}
      </span>
    );
    lastIndex = range.end;
  });

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function getStationVisibilityRank(station: StationWithReports) {
  if (station.visibilityStatus === "public") return 3;
  if (station.releaseStatus === "ready") return 3;
  if (station.visibilityStatus === "review") return 2;
  if (station.releaseStatus === "validating" || station.releaseStatus === "limited") return 1;
  return 0;
}

function getStationGeoRank(station: StationWithReports) {
  if (!isValidStationCoordinate(station.lat, station.lng)) return -1;
  if (station.geoReviewStatus === "ok") return 3;
  if (station.geoReviewStatus === "pending") return 2;
  if (station.geoReviewStatus === "manual_review") return 0;
  return 1;
}

function getStationAmbiguityKey(station: StationWithReports, publicName: string) {
  return [normalizeContextValue(publicName), normalizeContextValue(station.city), normalizeContextValue(station.neighborhood)].join("|");
}

function getStationSearchScore(candidate: StationPickerCandidate, query: string) {
  const normalized = normalizeStationSearchValue(query);
  if (!normalized) return 0;

  const tokens = normalized.split(/\s+/g).filter(Boolean);
  if (tokens.length === 0) return 0;

  const searchable = candidate.searchText;
  if (!tokens.every((token) => searchable.includes(token))) {
    return 0;
  }

  let score = 0;
  if (normalizeStationSearchValue(candidate.publicName).startsWith(normalized)) score += 120;
  if (searchable.includes(normalized)) score += 60;
  if (normalizeStationSearchValue(candidate.neighborhoodLabel).includes(normalized)) score += 24;
  if (normalizeStationSearchValue(candidate.fullAddress).includes(normalized)) score += 28;
  if (normalizeStationSearchValue(candidate.addressShort).includes(normalized)) score += 18;
  if (candidate.brandLabel && normalizeStationSearchValue(candidate.brandLabel).includes(normalized)) score += 16;
  score += Math.max(0, 24 - candidate.recentIndex * 3);
  score += candidate.visibilityRank * 8;
  score += candidate.geoRank * 6;
  if (candidate.distance !== null) {
    score += Math.max(0, 30 - Math.round(candidate.distance / 200));
  }

  return score;
}

function getStationSearchMatchContext(candidate: StationPickerCandidate, query: string) {
  const normalized = normalizeStationSearchValue(query);
  if (!normalized) return null;

  const publicName = normalizeStationSearchValue(candidate.publicName);
  const neighborhood = normalizeStationSearchValue(candidate.neighborhoodLabel);
  const addressShort = normalizeStationSearchValue(candidate.addressShort);
  const fullAddress = normalizeStationSearchValue(candidate.fullAddress);
  const city = normalizeStationSearchValue(candidate.station.city);
  const brand = normalizeStationSearchValue(candidate.brandLabel ?? "");

  if (fullAddress.includes(normalized)) {
    return {
      label: "Endereco",
      value: candidate.fullAddress || candidate.addressShort || candidate.neighborhoodLabel
    };
  }

  if (addressShort.includes(normalized)) {
    return {
      label: "Endereco",
      value: candidate.addressShort
    };
  }

  if (neighborhood.includes(normalized)) {
    return {
      label: "Bairro",
      value: candidate.neighborhoodLabel
    };
  }

  if (city.includes(normalized)) {
    return {
      label: "Cidade",
      value: candidate.station.city
    };
  }

  if (brand.includes(normalized) && candidate.brandLabel) {
    return {
      label: "Bandeira",
      value: candidate.brandLabel
    };
  }

  if (publicName.includes(normalized)) {
    return {
      label: "Nome",
      value: candidate.publicName
    };
  }

  return null;
}

function compareStationCandidates(left: StationPickerCandidate, right: StationPickerCandidate) {
  if (left.recentIndex !== right.recentIndex) return left.recentIndex - right.recentIndex;
  if (left.visibilityRank !== right.visibilityRank) return right.visibilityRank - left.visibilityRank;
  if (left.geoRank !== right.geoRank) return right.geoRank - left.geoRank;
  if (left.cityContextMatch !== right.cityContextMatch) return left.cityContextMatch ? -1 : 1;
  if (left.distance !== null && right.distance !== null && left.distance !== right.distance) return left.distance - right.distance;
  if (left.distance !== null && right.distance === null) return -1;
  if (left.distance === null && right.distance !== null) return 1;
  if (left.ambiguityCount !== right.ambiguityCount) return left.ambiguityCount - right.ambiguityCount;
  return left.publicName.localeCompare(right.publicName, "pt-BR");
}

function getGeoReviewBadge(candidate: StationPickerCandidate) {
  if (!candidate.hasReliableCoordinate) {
    return { label: "Sem geo", variant: "warning" as const };
  }

  if (candidate.station.geoReviewStatus === "pending") {
    return { label: "Geo em revisão", variant: "outline" as const };
  }

  if (candidate.station.geoReviewStatus === "manual_review") {
    return { label: "Geo em revisão", variant: "danger" as const };
  }

  return { label: "Geo ok", variant: "accent" as const };
}

function getStationSourceBadge(candidate: StationPickerCandidate, source: "nearby" | "recent" | "search" | "fallback") {
  if (source === "nearby" && candidate.hasReliableCoordinate) {
    return { label: "GPS", variant: "accent" as const };
  }

  if (source === "recent" || candidate.recentIndex < 999) {
    return { label: "Usado antes", variant: "outline" as const };
  }

  if (source === "search") {
    return { label: "Busca", variant: "secondary" as const };
  }

  if (candidate.cityContextMatch) {
    return { label: "Cidade", variant: "secondary" as const };
  }

  return { label: "Ranqueado", variant: "secondary" as const };
}

function PriceSubmitFormBody({
  stations,
  initialStationId,
  initialFuelType,
  returnToHref,
  draftKeyOverride,
  onResetRequest
}: PriceSubmitFormProps & {
  onResetRequest: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(submitPriceReportAction, initialState);
  const { isStreetMode } = useStreetMode();
  const { mission, nextStation } = useMissionContext();
  const { addSubmission } = useSubmissionHistory();
  const { submissions } = useMySubmissions();
  const safeReturnToHref = useMemo(() => safeRoute(returnToHref), [returnToHref]);
  const { recordActivity, session, history, lastSummary } = useStreetSession();
  const { isActive: isTestMode } = useTestMode();
  const draftKey = useMemo(() => createDraftKey(initialStationId, draftKeyOverride), [draftKeyOverride, initialStationId]);
  const [routeContext, setRouteContext] = useState<RouteContext | null>(null);

  const initialStation = useMemo(() => stations.find((station) => station.id === initialStationId) ?? null, [initialStationId, stations]);
  const hasInitialStation = Boolean(initialStation);
  const compactMode = hasInitialStation;
  const defaultStationId = useMemo(() => initialStation?.id ?? "", [initialStation]);
  const defaultFuelType: FuelType = initialFuelType && allowedFuelSet.has(initialFuelType) ? initialFuelType : "gasolina_comum";
  const [stationId, setStationId] = useState(defaultStationId);
  const [lastTouchedFuelType, setLastTouchedFuelType] = useState<FuelType>(defaultFuelType);
  const [fuelPrices, setFuelPrices] = useState<FuelPriceMap>(() => normalizeFuelPriceMap(undefined, defaultFuelType, ""));
  const [nickname, setNickname] = useState("");
  const [evidenceMode, setEvidenceMode] = useState<EvidenceMode>("placa_faixa");
  const [priceSource, setPriceSource] = useState<ManualPriceSource>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stationSearch, setStationSearch] = useState("");
  const [homeContextSnapshot, setHomeContextSnapshot] = useState<ReturnType<typeof readHomeContext>>({});
  const [lastStationSnapshot, setLastStationSnapshot] = useState<ReturnType<typeof readLastStationContext>>(() => null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftPhotoMissing, setDraftPhotoMissing] = useState(false);
  const [isSuggested, setIsSuggested] = useState(false);
  const [stationConfirmed, setStationConfirmed] = useState(Boolean(hasInitialStation));
  const [pricesReviewed, setPricesReviewed] = useState(false);
  const [submittedStationId, setSubmittedStationId] = useState<string | null>(null);
  const [queueItems, setQueueItems] = useState<SubmissionQueueEntry[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [showStationPicker, setShowStationPicker] = useState(true);
  const [showStationProposalFlow, setShowStationProposalFlow] = useState(false);
  const [stationProposalConfirmed, setStationProposalConfirmed] = useState(false);
  const [stationProposalName, setStationProposalName] = useState("");
  const [stationProposalStreet, setStationProposalStreet] = useState("");
  const [stationProposalNeighborhood, setStationProposalNeighborhood] = useState("");
  const [stationProposalBrand, setStationProposalBrand] = useState("");
  const [stationProposalCity, setStationProposalCity] = useState("");
  const { location, refresh } = useLocationHardening();
  const coords = useMemo(() => (location ? { lat: location.lat, lng: location.lng } : null), [location]);
  const canTrustProximity = Boolean(location && location.trustStatus !== "incerto");
  const routeTargetStation = useMemo(() => {
    if (!routeContext?.active || !routeContext.targetStationId) {
      return null;
    }

    return stations.find((station) => station.id === routeContext.targetStationId) ?? null;
  }, [routeContext, stations]);
  const lockedStationMeta = useMemo(() => {
    if (initialStation) {
      return {
        stationId: initialStation.id,
        source: "initial" as const
      };
    }

    if (!routeTargetStation || !coords || !canTrustProximity || !isValidStationCoordinate(routeTargetStation.lat, routeTargetStation.lng)) {
      return null;
    }

    const distance = calculateDistance(coords.lat, coords.lng, routeTargetStation.lat, routeTargetStation.lng);
    const arrivalRadiusMeters = Math.min(450, Math.max(180, Math.round((location?.accuracy ?? 60) * 3)));
    const retainRadiusMeters = Math.max(650, arrivalRadiusMeters * 2);

    if (distance > retainRadiusMeters) {
      return null;
    }

    return {
      stationId: routeTargetStation.id,
      source: "route" as const,
      distance
    };
  }, [canTrustProximity, coords, initialStation, location?.accuracy, routeTargetStation]);
  const lockedStationId = lockedStationMeta?.stationId ?? null;
  const lockedStation = Boolean(lockedStationId);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const priceInputRefs = useRef<Partial<Record<FuelType, HTMLInputElement | null>>>({});

  const filledFuelEntries = useMemo(() => getFilledFuelPriceEntries(fuelPrices), [fuelPrices]);
  const primaryFuelSelection = useMemo(() => getPrimaryFuelSelection(fuelPrices, lastTouchedFuelType), [fuelPrices, lastTouchedFuelType]);
  const fuelType = primaryFuelSelection.fuelType;
  const price = primaryFuelSelection.price;

  // Record history on success
  useEffect(() => {
    if (!state.success || !state.reportId) {
      return;
    }

    const station = stations.find((item) => item.id === stationId);
    if (!station) {
      return;
    }

    const submittedReports = state.submittedReports?.length
      ? state.submittedReports
      : [{ reportId: state.reportId, fuelType, price }];

    submittedReports.forEach((entry) => {
      addSubmission({
        reportId: entry.reportId,
        stationId: station.id,
        stationName: getStationPublicName(station),
        fuelType: entry.fuelType,
        price: String(Number(entry.price.replace(",", ".")) || 0),
        status: "pending",
        submittedAt: new Date().toISOString(),
        reporterNickname: nickname || null
      });
    });

    if (submissions.length === 0) {
      void trackProductEvent({
        eventType: "first_submission_milestone" as any,
        pagePath: "/enviar",
        pageTitle: "Enviar preço",
        stationId: station.id,
        fuelType,
        payload: { source: "activation_funnel", packageSize: submittedReports.length }
      });
    }

    if (consumeHubAttribution()) {
      void trackProductEvent({
        eventType: "hub_conversion_success",
        pagePath: "/enviar",
        pageTitle: "Enviar preço",
        stationId: station.id,
        fuelType,
        payload: {
          reportId: state.reportId,
          reportIds: submittedReports.map((entry) => entry.reportId),
          source: "hub",
          packageSize: submittedReports.length
        }
      });
    }

    recordActivity("complete", station.id);

    if (state.noticeCode && state.noticeTone === "warning") {
      void trackProductEvent({
        eventType: "submission_quality_flagged",
        pagePath: "/enviar",
        pageTitle: "Enviar preço",
        stationId: station.id,
        fuelType,
        reason: state.noticeCode,
        payload: {
          reportId: state.reportId,
          noticeTitle: state.noticeTitle,
          noticeTone: state.noticeTone,
          reviewReason: state.noticeCode,
          packageSize: submittedReports.length
        }
      });
    }
  }, [state.success, state.reportId, state.submittedReports, state.noticeCode, state.noticeTitle, state.noticeTone, addSubmission, stations, stationId, fuelType, price, nickname, recordActivity, submissions.length]);
  const [showFeedback, setShowFeedback] = useState(false);
  const stationSuggestionShownKeyRef = useRef<string | null>(null);
  const stationSuggestionAcceptedKeyRef = useRef<string | null>(null);
  const stationSuggestionChangedKeyRef = useRef<string | null>(null);
  const stationLastUsedReuseTrackedRef = useRef<string | null>(null);
  const stationStepAbandonedTrackedRef = useRef<string | null>(null);
  const suggestedStationIdRef = useRef<string | null>(null);
  const selectedFileRef = useRef<File | null>(null);
  const submissionFlowOpenedAtRef = useRef(Date.now());
  const submissionAutoDecisionCountRef = useRef(0);
  const submissionFlowOpenedTrackedRef = useRef(false);
  const submissionFlowCompletedTrackedRef = useRef(false);
  const stationSuggestionTrackedRef = useRef(false);
  const stationSuggestionSourceRef = useRef<"nearby" | "recent" | "fallback" | null>(null);
  const stationSelectionOriginRef = useRef<"auto" | "manual" | "draft" | "initial" | null>(hasInitialStation ? "initial" : null);
  const fuelSuggestionTrackedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const completedRef = useRef(false);
  const stationProposalNameInputRef = useRef<HTMLInputElement | null>(null);
  const stationProposalStreetInputRef = useRef<HTMLInputElement | null>(null);
  const currentStepRef = useRef<SubmissionDraftStep | null>(null);
  const telemetryContextRef = useRef({ stationId: stationId || null, fuelType, compactMode, lockedStation });
  const formRef = useRef<HTMLFormElement | null>(null);
  const stationSearchInputRef = useRef<HTMLInputElement | null>(null);
  const restoredDraftTrackedRef = useRef(false);
  const lastFailureKeyRef = useRef<string | null>(null);
  const submitFeedbackRef = useRef<HTMLDivElement | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [qualityResult, setQualityResult] = useState<PhotoQualityResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    stationId?: string;
    fuelPrices?: string;
    priceByFuel?: Partial<Record<FuelType, string>>;
    photo?: string;
    priceSource?: string;
  }>({});
  const lastFieldRef = useRef<string | null>(null);
  const retryAttemptRef = useRef(0);
  const lastQueuedFailureSignatureRef = useRef<string | null>(null);
  const lastQueuedAbandonmentSignatureRef = useRef<string | null>(null);
  const abandonmentSentRef = useRef(false);

  useEffect(() => {
    setRouteContext(readRouteContext());
  }, []);

  function openCameraPicker() {
    cameraInputRef.current?.click();
  }

  function openGalleryPicker() {
    fileInputRef.current?.click();
  }

  useEffect(() => {
    telemetryContextRef.current = { stationId: stationId || null, fuelType, compactMode, lockedStation };
  }, [compactMode, fuelType, lockedStation, stationId]);

  useEffect(() => {
    let active = true;

    void loadSubmissionQueue()
      .then((items) => {
        if (active) {
          setQueueItems(items);
        }
      })
      .catch(() => undefined);

    const syncOnlineState = () => {
      setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    };

    syncOnlineState();
    window.addEventListener("online", syncOnlineState);
    window.addEventListener("offline", syncOnlineState);

    return () => {
      active = false;
      window.removeEventListener("online", syncOnlineState);
      window.removeEventListener("offline", syncOnlineState);
    };
  }, []);

  useEffect(() => {
    setHomeContextSnapshot(readHomeContext());
    setLastStationSnapshot(readLastStationContext());
  }, []);

  useEffect(() => {
    const savedProfile = readProgressiveIdentityProfile();
    if (!savedProfile?.nickname) {
      return;
    }

    setNickname((current) => current || savedProfile.nickname || "");
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const draft = await loadSubmissionDraft(draftKey);
        if (!active || !draft) {
          setDraftLoaded(true);
          return;
        }

        const restoredPrices = normalizeFuelPriceMap(draft.fuelPrices, draft.fuelType, draft.price);
        if (!hasMeaningfulDraftContent(draft, restoredPrices)) {
          void clearSubmissionDraft(draftKey).catch(() => undefined);
          setDraftLoaded(true);
          return;
        }

        if (!lockedStation && draft.stationId && stations.some((station) => station.id === draft.stationId)) {
          stationSelectionOriginRef.current = "draft";
          setStationId(draft.stationId);
          setStationConfirmed(true);
        }
        if (draft.fuelType && allowedFuelSet.has(draft.fuelType)) {
          setLastTouchedFuelType(draft.fuelType);
        }
        setFuelPrices(restoredPrices);
        setPricesReviewed(draft.lastStep === "submit");
        if (typeof draft.nickname === "string") {
          setNickname(draft.nickname);
          persistProgressiveIdentityNickname(draft.nickname, "draft");
        }

        if (draft.photo && draft.photo instanceof Blob) {
          const restoredFile = new File([draft.photo], getPhotoName(draft.photoType, draft.photoName ?? "foto"), {
            type: draft.photoType ?? draft.photo.type ?? "image/jpeg",
            lastModified: new Date(draft.updatedAt).getTime()
          });
          selectedFileRef.current = restoredFile;
          syncProcessedFileToInput(fileInputRef.current, restoredFile);
          const objectUrl = URL.createObjectURL(restoredFile);
          setPreviewUrl(objectUrl);
          setDraftPhotoMissing(false);
        } else {
          const queuedPhoto = await getQueuePhoto(draftKey).catch(() => null);
          if (queuedPhoto) {
            selectedFileRef.current = queuedPhoto;
            syncProcessedFileToInput(fileInputRef.current, queuedPhoto);
            const objectUrl = URL.createObjectURL(queuedPhoto);
            setPreviewUrl(objectUrl);
            setDraftPhotoMissing(false);
          } else if (isPhotoMetadataPresent(draft)) {
            setDraftPhotoMissing(true);
          }
        }

        setDraftRestored(true);
        setDraftLoaded(true);

        if (!restoredDraftTrackedRef.current) {
          restoredDraftTrackedRef.current = true;
          void trackProductEvent({
            eventType: "submission_draft_restored",
            pagePath: "/enviar",
            pageTitle: "Enviar preço",
            stationId: draft.stationId || null,
            fuelType: draft.fuelType,
            scopeType: "submission",
            scopeId: draft.stationId || null,
            payload: {
              lastStep: draft.lastStep,
              status: draft.status,
              hasPhoto: Boolean(draft.photo),
              ageMs: Date.now() - new Date(draft.updatedAt).getTime(),
              compactMode,
              lockedStation,
              packageSize: countFilledFuelPrices(restoredPrices)
            }
          });
        }

        if (!draft.photo && isPhotoMetadataPresent(draft)) {
          void trackProductEvent({
            eventType: "submission_photo_lost",
            pagePath: "/enviar",
            pageTitle: "Enviar preço",
            stationId: draft.stationId || null,
            fuelType: draft.fuelType,
            scopeType: "submission",
            scopeId: draft.stationId || null,
            payload: {
              lastStep: draft.lastStep,
              compactMode,
              lockedStation,
              source: "restore_missing_photo"
            }
          });
        }
      } catch {
        setDraftLoaded(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [compactMode, draftKey, lockedStation, stations]);

  useEffect(() => {
    if (!initialStation) {
      return;
    }

    stationSelectionOriginRef.current = "initial";
    setStationId(initialStation.id);
    setStationConfirmed(true);
  }, [initialStation]);

  useEffect(() => {
    if (location || hasInitialStation) {
      return;
    }

    refresh();
  }, [hasInitialStation, location, refresh]);

  useEffect(() => {
    if (!lockedStationId) {
      return;
    }

    if (stationId !== lockedStationId) {
      stationSelectionOriginRef.current = lockedStationMeta?.source === "initial" ? "initial" : "auto";
      setStationId(lockedStationId);
    }

    setShowStationPicker(false);
    setStationConfirmed(true);
    setValidationErrors((current) => (current.stationId ? { ...current, stationId: undefined } : current));
    setIsSuggested(lockedStationMeta?.source === "route");
  }, [lockedStationId, lockedStationMeta?.source, stationId]);

  useEffect(() => {
    if (!draftLoaded || completedRef.current) {
      return;
    }

    const shouldPersistDraft =
      hasStartedRef.current ||
      countFilledFuelPrices(fuelPrices) > 0 ||
      Boolean(selectedFileRef.current) ||
      Boolean(nickname.trim()) ||
      draftPhotoMissing;

    if (!shouldPersistDraft) {
      void clearSubmissionDraft(draftKey).catch(() => undefined);
      return;
    }

    const status: SubmissionDraftStatus = pending ? "submitting" : state.error ? "failed" : "in_progress";
    const snapshot = buildDraftSnapshot({
      key: draftKey,
      stationId,
      fuelType,
      price,
      fuelPrices,
      nickname,
      lastStep: currentStepRef.current ?? "photo",
      status,
      photo: selectedFileRef.current
    });

    void saveSubmissionDraft(snapshot).catch(() => undefined);
  }, [draftKey, draftLoaded, draftPhotoMissing, evidenceMode, fuelPrices, fuelType, nickname, pending, price, priceSource, stationId, state.error]);

  const currentQueueItem = queueItems.find((item) => item.draftKey === draftKey) ?? null;
  const selectedStation = stations.find((station) => station.id === stationId) ?? null;
  const proposalCity = stationProposalCity.trim() || homeContextSnapshot.city?.trim() || lastStationSnapshot?.city?.trim() || selectedStation?.city?.trim() || "";

  useEffect(() => {
    if (stationProposalCity.trim()) return;
    const fallbackCity = homeContextSnapshot.city?.trim() || lastStationSnapshot?.city?.trim() || selectedStation?.city?.trim() || "";
    if (fallbackCity) setStationProposalCity(fallbackCity);
  }, [homeContextSnapshot.city, lastStationSnapshot?.city, selectedStation?.city, stationProposalCity]);

  const isFirstSendFlow = useMemo(() => submissions.length === 0 && history.length === 0 && !draftRestored, [draftRestored, history.length, submissions.length]);



  const suggestedFuelType = useMemo<FuelType>(() => {

    const stationFuel = selectedStation ? submissions.find((entry) => entry.stationId === selectedStation.id)?.fuelType ?? null : null;
    return initialFuelType ?? stationFuel ?? submissions[0]?.fuelType ?? defaultFuelType;
  }, [defaultFuelType, initialFuelType, selectedStation, submissions]);

  useEffect(() => {
    if (!draftLoaded || submissionFlowOpenedTrackedRef.current) {
      return;
    }

    submissionFlowOpenedTrackedRef.current = true;
    void trackProductEvent({
      eventType: "submission_flow_opened",
      pagePath: "/enviar",
      pageTitle: "Enviar preço",
      stationId: stationId || null,
      fuelType,
      scopeType: "submission",
      scopeId: stationId || null,
      payload: {
        firstSendFlow: isFirstSendFlow,
        lockedStation,
        draftRestored,
        hasInitialStation: Boolean(initialStation),
        hasSuggestedFuel: Boolean(initialFuelType),
        queuedItems: queueItems.length
      }
    });
  }, [draftLoaded, draftRestored, fuelType, initialFuelType, initialStation, isFirstSendFlow, lockedStation, queueItems.length, stationId]);

  useEffect(() => {
    if (draftRestored || fuelSuggestionTrackedRef.current || (!initialFuelType && fuelType !== defaultFuelType && fuelType !== "gasolina_comum")) {
      return;
    }

    const stationFuel = selectedStation ? submissions.find((entry) => entry.stationId === selectedStation.id)?.fuelType ?? null : null;
    const nextFuel = initialFuelType ?? stationFuel ?? submissions[0]?.fuelType ?? defaultFuelType;
    if (!nextFuel || nextFuel === fuelType) {
      return;
    }

    fuelSuggestionTrackedRef.current = true;
    submissionAutoDecisionCountRef.current += 1;
    setLastTouchedFuelType(nextFuel);
    void trackProductEvent({
      eventType: "submission_context_autofilled",
      pagePath: "/enviar",
      pageTitle: "Enviar preço",
      stationId: (selectedStation?.id ?? stationId) || null,
      city: selectedStation?.city ?? null,
      fuelType: nextFuel,
      scopeType: "submission",
      scopeId: (selectedStation?.id ?? stationId) || null,
      payload: {
        field: "fuel",
        source: initialFuelType ? "query" : stationFuel ? "station_history" : "submission_history",
        decisionsSkipped: submissionAutoDecisionCountRef.current
      }
    });
  }, [defaultFuelType, draftRestored, fuelType, initialFuelType, selectedStation, stationId, submissions]);

  const { currentDistance, locationConfidence, isAmbiguous, closestStationId } = useMemo(() => {
    if (!coords || !selectedStation || !isValidStationCoordinate(selectedStation.lat, selectedStation.lng)) {
      return { currentDistance: null, locationConfidence: "none", isAmbiguous: false, closestStationId: null };
    }

    let closestId: string | null = null;
    let minDistance = Infinity;
    let nearbyInCluster = 0;
    const proximityRadiusMeters = Math.min(320, Math.max(120, Math.round((location?.accuracy ?? 60) * 2.5)));
    const cautionRadiusMeters = Math.min(900, Math.max(260, Math.round((location?.accuracy ?? 60) * 5)));

    for (const s of stations) {
      if (!isValidStationCoordinate(s.lat, s.lng)) {
        continue;
      }

      const dist = calculateDistance(coords.lat, coords.lng, s.lat, s.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestId = s.id;
      }
      // If another station is within 60m of the selected station AND within 100m of the user
      if (s.id !== selectedStation.id) {
        const distFromSelected = calculateDistance(selectedStation.lat, selectedStation.lng, s.lat, s.lng);
        if (distFromSelected < 60 && dist < 120) {
          nearbyInCluster++;
        }
      }
    }

    const dist = calculateDistance(coords.lat, coords.lng, selectedStation.lat, selectedStation.lng);
    const confidence = !canTrustProximity
      ? "low"
      : dist <= proximityRadiusMeters
        ? "high"
        : dist <= cautionRadiusMeters
          ? "medium"
          : "low";
    const ambiguous = canTrustProximity
      && nearbyInCluster > 0
      && closestId !== null
      && closestId !== selectedStation.id
      && minDistance <= Math.max(120, proximityRadiusMeters);

    return { 
      currentDistance: dist, 
      locationConfidence: confidence, 
      isAmbiguous: ambiguous,
      closestStationId: closestId
    };
  }, [canTrustProximity, coords, location?.accuracy, selectedStation, stations]);

  const nearbyStationsList = useMemo(() => {
    if (!coords || !canTrustProximity) return [];
    return stations
      .map(s => ({ ...s, distance: calculateDistance(coords.lat, coords.lng, s.lat, s.lng) }))
      .filter(s => (s.distance || 0) <= 2000)
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [canTrustProximity, coords, stations]);

  const recentStationIds = useMemo(() => {
    const ids: string[] = [];
    const push = (value?: string | null) => {
      if (!value || ids.includes(value)) return;
      ids.push(value);
    };

    push(initialStationId ?? null);
    push(lastStationSnapshot?.id ?? null);
    push(session?.lastGesture?.stationId ?? null);
    session?.stationsTouched.slice().reverse().forEach((id) => push(id));
    session?.stationsSeen.slice().reverse().forEach((id) => push(id));
    history.forEach((entry) => push(entry.lastGesture?.stationId ?? null));
    push(lastSummary?.lastGesture?.stationId ?? null);
    submissions.forEach((entry) => push(entry.stationId));

    return ids;
  }, [history, initialStationId, lastStationSnapshot?.id, lastSummary?.lastGesture?.stationId, session?.lastGesture?.stationId, session?.stationsSeen, session?.stationsTouched, submissions]);

  const stationCandidates = useMemo<StationPickerCandidate[]>(() => {
    const cityContext = normalizeContextValue(homeContextSnapshot.city ?? "");
    const publicNameCounts = new Map<string, number>();

    for (const station of stations) {
      const publicName = getStationPublicName(station);
      const key = getStationAmbiguityKey(station, publicName);
      publicNameCounts.set(key, (publicNameCounts.get(key) ?? 0) + 1);
    }

    return stations.map((station) => {
      const publicName = getStationPublicName(station);
      const addressShort = shortAddress(station.address);
      const fullAddress = station.address?.trim() || "";
      const neighborhoodLabel = station.neighborhood?.trim() || "Bairro nao informado";
      const brandLabel = station.distributorName?.trim() || station.brand?.trim() || null;
      const hasReliableCoordinate = isValidStationCoordinate(station.lat, station.lng);
      const distance = coords && canTrustProximity && hasReliableCoordinate ? calculateDistance(coords.lat, coords.lng, station.lat, station.lng) : null;
      const ambiguityCount = publicNameCounts.get(getStationAmbiguityKey(station, publicName)) ?? 1;
      const recentIndex = recentStationIds.indexOf(station.id);

      return {
        station,
        publicName,
        neighborhoodLabel,
        addressShort,
        fullAddress,
        brandLabel,
        searchText: normalizeStationSearchValue([publicName, neighborhoodLabel, addressShort, fullAddress, station.city, station.brand, station.distributorName].filter(Boolean).join(" ")),
        distance,
        recentIndex: recentIndex >= 0 ? recentIndex : 999,
        visibilityRank: getStationVisibilityRank(station),
        geoRank: getStationGeoRank(station),
        ambiguityCount,
        cityContextMatch: Boolean(cityContext) && normalizeContextValue(station.city).includes(cityContext),
        hasReliableCoordinate
      };
    }).sort(compareStationCandidates);
  }, [canTrustProximity, coords, homeContextSnapshot.city, recentStationIds, stations]);

  const autoSuggestedStation = useMemo(() => {
    if (stationCandidates.length === 0) {
      return null;
    }

    if (coords && canTrustProximity) {
      const nearbyCandidate = stationCandidates
        .filter((candidate) => candidate.distance !== null && candidate.hasReliableCoordinate && candidate.visibilityRank > 0 && candidate.geoRank >= 1 && (candidate.distance ?? Infinity) <= 1500)
        .sort((left, right) => {
          if ((left.distance ?? Infinity) !== (right.distance ?? Infinity)) return (left.distance ?? Infinity) - (right.distance ?? Infinity);
          if (left.visibilityRank !== right.visibilityRank) return right.visibilityRank - left.visibilityRank;
          if (left.geoRank !== right.geoRank) return right.geoRank - left.geoRank;
          if (left.recentIndex !== right.recentIndex) return left.recentIndex - right.recentIndex;
          if (left.ambiguityCount !== right.ambiguityCount) return left.ambiguityCount - right.ambiguityCount;
          return left.publicName.localeCompare(right.publicName, "pt-BR");
        })[0] ?? null;

      if (!nearbyCandidate) {
        return null;
      }

      return { candidate: nearbyCandidate, source: "nearby" as const };
    }

    const recentCandidate = stationCandidates.find((candidate) => candidate.recentIndex < 999 && candidate.visibilityRank > 0) ?? null;
    if (recentCandidate) {
      return { candidate: recentCandidate, source: "recent" as const };
    }

    const fallbackCandidate = stationCandidates.find((candidate) => candidate.visibilityRank > 0 && candidate.geoRank >= 0) ?? stationCandidates[0] ?? null;
    return fallbackCandidate ? { candidate: fallbackCandidate, source: "fallback" as const } : null;
  }, [canTrustProximity, coords, stationCandidates]);

  useEffect(() => {
    if (lockedStation || draftRestored || !autoSuggestedStation) {
      return;
    }

    const suggestionSource = autoSuggestedStation.source;
    const canUpgradeToNearby =
      stationSelectionOriginRef.current === "auto" &&
      stationSuggestionSourceRef.current !== "nearby" &&
      suggestionSource === "nearby";

    if (stationSelectionOriginRef.current === "manual" || stationSelectionOriginRef.current === "draft" || stationSelectionOriginRef.current === "initial") {
      return;
    }

    if (stationSuggestionTrackedRef.current && !canUpgradeToNearby) {
      return;
    }
    const suggestedStation = autoSuggestedStation.candidate;
    if (!suggestedStation || (suggestedStation.station.id === stationId && !canUpgradeToNearby)) {
      return;
    }

    const suggestionKey = [draftKey, suggestedStation.station.id, suggestionSource, suggestedStation.distance !== null ? "geo" : "no-geo"].join(":");

    stationSuggestionTrackedRef.current = true;
    stationSuggestionSourceRef.current = suggestionSource;
    stationSelectionOriginRef.current = "auto";
    submissionAutoDecisionCountRef.current += 1;
    suggestedStationIdRef.current = suggestedStation.station.id;
    if (suggestedStation.station.id !== stationId) {
      setStationId(suggestedStation.station.id);
    }
    setIsSuggested(suggestionSource === "nearby" && suggestedStation.distance !== null);
    setShowStationPicker(false);

    if (stationSuggestionShownKeyRef.current !== suggestionKey) {
      stationSuggestionShownKeyRef.current = suggestionKey;
      void trackProductEvent({
        eventType: "station_suggestion_shown",
        pagePath: "/enviar",
        pageTitle: "Enviar preço",
        stationId: suggestedStation.station.id,
        city: suggestedStation.station.city,
        fuelType,
        scopeType: "submission",
        scopeId: suggestedStation.station.id,
        payload: {
          source: suggestionSource,
          distance: suggestedStation.distance,
          geoReviewStatus: suggestedStation.station.geoReviewStatus ?? null,
          visibilityRank: suggestedStation.visibilityRank,
          geoRank: suggestedStation.geoRank,
          cityContextMatch: suggestedStation.cityContextMatch,
          decisionsSkipped: submissionAutoDecisionCountRef.current
        }
      });
    }

    if (suggestionSource === "recent" && stationLastUsedReuseTrackedRef.current !== suggestionKey) {
      stationLastUsedReuseTrackedRef.current = suggestionKey;
      void trackProductEvent({
        eventType: "station_last_used_reused",
        pagePath: "/enviar",
        pageTitle: "Enviar preço",
        stationId: suggestedStation.station.id,
        city: suggestedStation.station.city,
        fuelType,
        scopeType: "submission",
        scopeId: suggestedStation.station.id,
        payload: {
          source: suggestionSource,
          distance: suggestedStation.distance,
          recentIndex: suggestedStation.recentIndex,
          cityContextMatch: suggestedStation.cityContextMatch
        }
      });
    }

    if (stationSuggestionAcceptedKeyRef.current !== suggestionKey) {
      stationSuggestionAcceptedKeyRef.current = suggestionKey;
      void trackProductEvent({
        eventType: "station_suggestion_accepted",
        pagePath: "/enviar",
        pageTitle: "Enviar preço",
        stationId: suggestedStation.station.id,
        city: suggestedStation.station.city,
        fuelType,
        scopeType: "submission",
        scopeId: suggestedStation.station.id,
        payload: {
          source: suggestionSource,
          distance: suggestedStation.distance,
          geoReviewStatus: suggestedStation.station.geoReviewStatus ?? null,
          visibilityRank: suggestedStation.visibilityRank,
          decisionsSkipped: submissionAutoDecisionCountRef.current
        }
      });
    }

    void trackProductEvent({
      eventType: "submission_context_autofilled",
      pagePath: "/enviar",
      pageTitle: "Enviar preço",
      stationId: suggestedStation.station.id,
      city: suggestedStation.station.city,
      fuelType: fuelType,
      scopeType: "submission",
      scopeId: suggestedStation.station.id,
      payload: {
        field: "station",
        source: suggestionSource === "nearby" ? "geo_nearest" : suggestionSource,
        distance: suggestedStation.distance,
        geoReviewStatus: suggestedStation.station.geoReviewStatus ?? null,
        visibilityRank: suggestedStation.visibilityRank,
        decisionsSkipped: submissionAutoDecisionCountRef.current
      }
    });
  }, [autoSuggestedStation, draftKey, draftRestored, fuelType, lockedStation, stationId]);

  const normalizedStationSearch = useMemo(() => normalizeStationSearchValue(stationSearch), [stationSearch]);

  const nearbyRadiusMeters = useMemo(() => {
    const distances = stationCandidates
      .map((candidate) => candidate.distance)
      .filter((value): value is number => value !== null)
      .sort((left, right) => left - right);

    if (distances.length === 0) return 0;
    return distances[0] <= 2000 ? 2000 : 5000;
  }, [stationCandidates]);

  const nearbyPickerItems = useMemo(() => {
    const prioritized = stationCandidates.filter((candidate) => candidate.distance !== null && candidate.geoRank >= 2 && candidate.visibilityRank > 0 && (candidate.distance ?? 0) <= nearbyRadiusMeters);
    if (prioritized.length > 0) return prioritized.slice(0, 7);
    return stationCandidates.filter((candidate) => candidate.distance !== null && candidate.geoRank >= 0).slice(0, 7);
  }, [nearbyRadiusMeters, stationCandidates]);

  const recentPickerItems = useMemo(() => {
    return stationCandidates
      .filter((candidate) => candidate.recentIndex < 999)
      .slice()
      .sort((left, right) => left.recentIndex - right.recentIndex)
      .slice(0, 6);
  }, [stationCandidates]);



  const fallbackPickerItems = useMemo(() => {
    const blockedIds = new Set([...nearbyPickerItems, ...recentPickerItems].map((candidate) => candidate.station.id));
    return stationCandidates.filter((candidate) => !blockedIds.has(candidate.station.id)).slice(0, 8);
  }, [nearbyPickerItems, recentPickerItems, stationCandidates]);

  const searchPickerItems = useMemo(() => {
    if (!normalizedStationSearch) return [] as StationPickerCandidate[];

    return stationCandidates
      .map((candidate) => ({ candidate, score: getStationSearchScore(candidate, normalizedStationSearch) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => {
        if (left.score !== right.score) return right.score - left.score;
        return compareStationCandidates(left.candidate, right.candidate);
      })
      .map((entry) => entry.candidate)
      .slice(0, 14);
  }, [normalizedStationSearch, stationCandidates]);

  const normalizedProposalSearch = useMemo(() => normalizeStationSearchValue([stationProposalName, stationProposalStreet, stationProposalNeighborhood, proposalCity].filter(Boolean).join(" ")), [proposalCity, stationProposalName, stationProposalNeighborhood, stationProposalStreet]);
  const proposalDuplicateCandidates = useMemo(() => {
    if (!normalizedProposalSearch) return [] as StationPickerCandidate[];
    return stationCandidates
      .map((candidate) => ({ candidate, score: getStationSearchScore(candidate, normalizedProposalSearch) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.candidate)
      .slice(0, 3);
  }, [normalizedProposalSearch, stationCandidates]);
  const proposalReady = Boolean(stationProposalName.trim() && proposalCity.trim() && (stationProposalStreet.trim() || coords));
  const stationSuggestionTone: "high" | "medium" | "none" = isSuggested ? (locationConfidence === "high" ? "high" : "medium") : "none";
  const stationSuggestionReason = showStationProposalFlow
    ? "Seu posto ainda não está na base? Faça uma proposta leve e a curadoria revisa antes de publicar."
    : isSuggested
      ? locationConfidence === "high"
        ? "O app cruzou GPS, histórico curto e contexto para sugerir este posto primeiro."
        : "Há um posto provável por perto, mas a confirmação manual ainda vale."
      : "Use nome, bairro, endereço, cidade ou bandeira. Se não achar, proponha o posto na hora.";
  const geoStatusCopy = canTrustProximity
    ? locationConfidence === "high"
      ? "Sua localização está ajudando a priorizar os postos mais prováveis."
      : "Sua localização existe, mas o contexto ainda pede confirmação manual."
    : "Sem sua localização, a lista usa memória curta, busca e ranking territorial.";

  const nextStationNode = useMemo(() => {
    if (!mission || mission.currentIndex + 1 >= mission.stationIds.length) return null;
    const nextId = mission.stationIds[mission.currentIndex + 1];
    return stations.find(s => s.id === nextId) || null;
  }, [mission, stations]);
  const ambiguityTrackedRef = useRef<string | null>(null);
  const [showMoreNearby, setShowMoreNearby] = useState(false);
  const [showMoreRecent, setShowMoreRecent] = useState(false);
  const [showMoreFallback, setShowMoreFallback] = useState(false);
  const [showMoreSearch, setShowMoreSearch] = useState(false);
  useEffect(() => {
    if (isAmbiguous && !lockedStation && canTrustProximity && ambiguityTrackedRef.current !== stationId) {
      ambiguityTrackedRef.current = stationId;
      void trackProductEvent({
        eventType: "field_quality_warning_shown",
        pagePath: "/enviar",
        pageTitle: "Enviar preço",
        stationId: stationId || null,
        city: selectedStation?.city ?? null,
        fuelType,
        scopeType: "submission",
        scopeId: stationId || null,
        reason: "proximity_ambiguity",
        payload: {
          currentDistance,
          closestStationId,
          compactMode,
          lockedStation
        }
      });
    }
  }, [isAmbiguous, lockedStation, canTrustProximity, stationId, selectedStation, fuelType, currentDistance, closestStationId, compactMode]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    completedRef.current = true;
    if (nickname.trim()) {
      persistProgressiveIdentityNickname(nickname, "submission");
    }
    setSubmittedStationId(stationId);
    setFuelPrices(normalizeFuelPriceMap(undefined, lastTouchedFuelType, ""));
    setPricesReviewed(false);
    setNickname("");
    setPreviewUrl(null);
    selectedFileRef.current = null;
    setDraftRestored(false);
    setDraftPhotoMissing(false);
    window.sessionStorage.removeItem(draftKey);
    void clearSubmissionDraft(draftKey).catch(() => undefined);
    
    // Route completion
    if (stationId) {
      completeStationInRoute(stationId);
      setRouteContext(readRouteContext());
    }

    void clearSubmissionQueueForDraftKey(draftKey)
      .then((items: SubmissionQueueEntry[]) => setQueueItems(items))
      .catch(() => undefined);
    if (currentQueueItem) {
      void trackProductEvent({
        eventType: "submission_queue_completed",
        pagePath: "/enviar",
        pageTitle: "Enviar preço",
        stationId: currentQueueItem.stationId,
        city: currentQueueItem.city,
        fuelType: currentQueueItem.fuelType,
        scopeType: "submission",
        scopeId: currentQueueItem.stationId,
        payload: {
          draftKey: currentQueueItem.draftKey,
          hasPhoto: currentQueueItem.hasPhoto,
          status: currentQueueItem.status
        }
      });
    }
    lastQueuedFailureSignatureRef.current = null;
    lastQueuedAbandonmentSignatureRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    router.refresh();
  }, [currentQueueItem, draftKey, nickname, router, state.success, stationId]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    const sendAbandonment = () => {
      if (!hasStartedRef.current || completedRef.current || abandonmentSentRef.current) {
        return;
      }

      abandonmentSentRef.current = true;
      const hasPhoto = Boolean(selectedFileRef.current);
      const shouldTrackStationAbandonment = currentStepRef.current === "station" || (!stationConfirmed && Boolean(stationId));
      if (shouldTrackStationAbandonment && stationStepAbandonedTrackedRef.current !== draftKey) {
        stationStepAbandonedTrackedRef.current = draftKey;
        void trackProductEvent({
          eventType: "submission_station_step_abandoned",
          pagePath: "/enviar",
          pageTitle: "Enviar preço",
          stationId: telemetryContextRef.current.stationId,
          fuelType: telemetryContextRef.current.fuelType,
          scopeType: "submission",
          scopeId: telemetryContextRef.current.stationId,
          payload: {
            lastStep: currentStepRef.current,
            compactMode: telemetryContextRef.current.compactMode,
            lockedStation: telemetryContextRef.current.lockedStation,
            hasPhoto,
            photoMissing: draftPhotoMissing,
            locationConfidence,
            stationConfirmed,
            suggestionAccepted: suggestedStationIdRef.current === stationId
          }
        });
      }
      void trackProductEvent({
        eventType: hasPhoto ? "submission_abandoned_after_photo" : "submission_abandoned_before_photo",
        pagePath: "/enviar",
        pageTitle: "Enviar preço",
        stationId: telemetryContextRef.current.stationId,
        fuelType: telemetryContextRef.current.fuelType,
        scopeType: "submission",
        scopeId: telemetryContextRef.current.stationId,
        payload: {
          lastStep: currentStepRef.current,
          compactMode: telemetryContextRef.current.compactMode,
          lockedStation: telemetryContextRef.current.lockedStation,
          hasPhoto,
          photoMissing: draftPhotoMissing
        }
      });

      const queuedSignature = [draftKey, "abandonment", hasPhoto ? "photo" : "no-photo", JSON.stringify(filledFuelEntries), stationId || ""].join(":");
      if (lastQueuedAbandonmentSignatureRef.current === queuedSignature) {
        return;
      }
      lastQueuedAbandonmentSignatureRef.current = queuedSignature;

      const resolvedStation = stations.find((station) => station.id === stationId) ?? selectedStation;
      void upsertSubmissionQueueEntry({
        draftKey,
        stationId: resolvedStation?.id ?? stationId,
        stationName: resolvedStation ? (resolvedStation.name || resolvedStation.brand || "Posto") : "Posto",
        city: resolvedStation?.city ?? "",
        neighborhood: resolvedStation?.neighborhood ?? null,
        fuelType,
        price,
        fuelPrices,
        nickname,
        status: hasPhoto ? "stored" : "photo_required",
        photo: selectedFileRef.current,
        photoName: selectedFileRef.current?.name ?? (draftPhotoMissing ? "foto" : null),
        photoType: selectedFileRef.current?.type ?? null,
        photoSize: selectedFileRef.current?.size ?? null,
        lastErrorCode: "abandoned",
        lastErrorLabel: "Envio interrompido antes de concluir.",
        attempts: retryAttemptRef.current,
        returnToHref: safeReturnToHref ?? null
      })
        .then((items: SubmissionQueueEntry[]) => setQueueItems(items))
        .catch(() => undefined);

      void trackProductEvent({
        eventType: "submission_queue_added",
        pagePath: "/enviar",
        pageTitle: "Enviar preço",
        stationId: telemetryContextRef.current.stationId,
        city: resolvedStation?.city ?? null,
        fuelType: telemetryContextRef.current.fuelType,
        scopeType: "submission",
        scopeId: telemetryContextRef.current.stationId,
        reason: "abandoned",
        payload: {
          source: "abandonment",
        status: hasPhoto ? "stored" : "photo_required",
          hasPhoto,
          photoMissing: draftPhotoMissing
        }
      });
    };

    window.addEventListener("pagehide", sendAbandonment);
    window.addEventListener("beforeunload", sendAbandonment);
    return () => {
      sendAbandonment();
      window.removeEventListener("pagehide", sendAbandonment);
      window.removeEventListener("beforeunload", sendAbandonment);
    };
  }, [draftKey, draftPhotoMissing, filledFuelEntries, fuelPrices, fuelType, nickname, price, safeReturnToHref, selectedStation, stationConfirmed, locationConfidence, stationId, stations]);

  useEffect(() => {
    if (!state.error || state.errorCode === lastFailureKeyRef.current) {
      return;
    }

    lastFailureKeyRef.current = state.errorCode;
    void trackProductEvent({
      eventType: "submission_failed",
      pagePath: "/enviar",
      pageTitle: "Enviar preço",
      stationId: telemetryContextRef.current.stationId,
      fuelType: telemetryContextRef.current.fuelType,
      scopeType: "submission",
      scopeId: telemetryContextRef.current.stationId,
      reason: state.errorCode,
      payload: {
        retryable: state.retryable,
        message: state.error,
        step: currentStepRef.current,
        compactMode: telemetryContextRef.current.compactMode,
        lockedStation: telemetryContextRef.current.lockedStation,
        hasPhoto: Boolean(selectedFileRef.current),
        photoMissing: draftPhotoMissing
      }
    });
  }, [draftPhotoMissing, state.error, state.errorCode, state.retryable]);

  useEffect(() => {
    if (!state.error) {
      return;
    }

    submitFeedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state.error]);

  useEffect(() => {
    if (!state.error || !draftLoaded) {
      return;
    }

    const shouldQueue = state.retryable || state.errorCode === "photo_missing" || state.errorCode === "network_offline" || state.errorCode === "network_timeout" || state.errorCode === "upload_failed" || state.errorCode === "upload_interrupted";
    if (!shouldQueue) {
      return;
    }

    const queuedSignature = [draftKey, state.errorCode ?? "error", state.retryable ? "retryable" : "final", Boolean(selectedFileRef.current) ? "photo" : "no-photo", JSON.stringify(filledFuelEntries), stationId || ""].join(":");
    if (lastQueuedFailureSignatureRef.current === queuedSignature) {
      return;
    }
    lastQueuedFailureSignatureRef.current = queuedSignature;

    const resolvedStation = stations.find((station) => station.id === stationId) ?? selectedStation;
    const hasPhoto = Boolean(selectedFileRef.current);
    
    // Map internal error codes to operational statuses
    let nextQueueStatus: any = "stored";
    if (state.errorCode === "photo_missing" || !hasPhoto) {
      nextQueueStatus = "photo_required";
    } else if (state.errorCode === "network_offline" || !isOnline) {
      nextQueueStatus = "ready";
    } else if (state.retryable) {
      nextQueueStatus = "failed";
    }

    void upsertSubmissionQueueEntry({
      draftKey,
      stationId: resolvedStation?.id ?? stationId,
      stationName: resolvedStation ? (resolvedStation.name || resolvedStation.brand || "Posto") : "Posto",
      city: resolvedStation?.city ?? "",
      neighborhood: resolvedStation?.neighborhood ?? null,
      fuelType,
      price,
      fuelPrices,
      nickname,
      status: nextQueueStatus,
      photo: selectedFileRef.current,
      photoName: selectedFileRef.current?.name ?? (draftPhotoMissing ? "foto" : null),
      photoType: selectedFileRef.current?.type ?? null,
      photoSize: selectedFileRef.current?.size ?? null,
      lastErrorCode: state.errorCode,
      lastErrorLabel: state.error,
      attempts: retryAttemptRef.current,
      returnToHref: safeReturnToHref ?? null
    })
      .then((items) => setQueueItems(items))
      .catch(() => undefined);

    void trackProductEvent({
      eventType: "submission_queue_added",
      pagePath: "/enviar",
      pageTitle: "Enviar preço",
      stationId: telemetryContextRef.current.stationId,
      city: resolvedStation?.city ?? null,
      fuelType: telemetryContextRef.current.fuelType,
      scopeType: "submission",
      scopeId: telemetryContextRef.current.stationId,
      reason: state.errorCode,
      payload: {
        source: "failure",
        status: nextQueueStatus,
        hasPhoto,
        photoMissing: draftPhotoMissing,
        retryable: state.retryable,
        message: state.error
      }
    });
  }, [
    draftKey,
    draftLoaded,
    draftPhotoMissing,
    fuelType,
    nickname,
    price,
    safeReturnToHref,
    selectedStation,
    stationId,
    stations,
    state.error,
    state.errorCode,
    state.retryable,
    isOnline
  ]);

  function markStarted(step: SubmissionDraftStep, extra?: Record<string, unknown>) {
    hasStartedRef.current = true;
    currentStepRef.current = step;
    void trackProductEvent({
      eventType: "submission_step",
      pagePath: "/enviar",
      pageTitle: "Enviar preço",
      stationId: stationId || null,
      fuelType,
      scopeType: "submission",
      scopeId: stationId || null,
      payload: {
        ...buildStepPayload(step, compactMode, lockedStation, Boolean(selectedFileRef.current), stationId || null),
        ...extra
      }
    });
  }

  async function resetForAnotherSubmission() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
    completedRef.current = false;
    abandonmentSentRef.current = false;
    submissionFlowCompletedTrackedRef.current = false;
    submissionFlowOpenedTrackedRef.current = false;
    submissionAutoDecisionCountRef.current = 0;
    stationSuggestionTrackedRef.current = false;
    stationSuggestionSourceRef.current = null;
    stationSelectionOriginRef.current = hasInitialStation ? "initial" : null;
    stationSuggestionShownKeyRef.current = null;
    stationSuggestionAcceptedKeyRef.current = null;
    stationSuggestionChangedKeyRef.current = null;
    stationLastUsedReuseTrackedRef.current = null;
    stationStepAbandonedTrackedRef.current = null;
    suggestedStationIdRef.current = null;
    fuelSuggestionTrackedRef.current = false;
    setDraftRestored(false);
    setDraftPhotoMissing(false);
    setPreviewUrl(null);
    selectedFileRef.current = null;
    await clearSubmissionDraft(draftKey).catch(() => undefined);
    window.sessionStorage.removeItem(draftKey);
    setRouteContext(readRouteContext());
    onResetRequest();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    const isRestored = draftRestored || draftPhotoMissing;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!nextFile) {
      selectedFileRef.current = null;
      setPreviewUrl(null);
      setQualityResult(null);
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      selectedFileRef.current = null;
      setPreviewUrl(null);
      setQualityResult(null);
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
      return;
    }

    setIsProcessingPhoto(true);
    setQualityResult(null);
    setValidationErrors((prev) => ({ ...prev, photo: undefined, priceSource: undefined }));

    try {
      // 1. Processar/Comprimir
      const processed = await processImageForUpload(nextFile);
      const inputSynced = syncProcessedFileToInput(fileInputRef.current, processed);
      if (!inputSynced) {
        throw new Error("Nao foi possivel sincronizar a foto processada para envio.");
      }

      selectedFileRef.current = processed;
      
      // 2. Analisar qualidade
      const quality = await analyzePhotoQuality(processed);
      setQualityResult(quality);

      markStarted("photo", { 
        fileType: processed.type, 
        fileSize: processed.size,
        qualityScore: quality.score,
        qualityWarnings: quality.warnings
      });

      if (isRestored) {
        void trackProductEvent({
          eventType: "submission_photo_reselected",
          pagePath: "/enviar",
          pageTitle: "Enviar preço",
          stationId: stationId || null,
          fuelType,
          scopeType: "submission",
          scopeId: stationId || null,
          payload: {
            source: draftPhotoMissing ? "missing_photo" : "restored_draft",
            fileType: processed.type,
            fileSize: processed.size,
            qualityScore: quality.score,
            compactMode,
            lockedStation
          }
        });
      }

      setDraftPhotoMissing(false);
      setPreviewUrl(URL.createObjectURL(processed));
      
      focusPreferredPriceField();
    } catch (error) {
      selectedFileRef.current = null;
      setPreviewUrl(null);
      setQualityResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }

      const message = error instanceof Error ? error.message : "Erro ao preparar a foto.";
      setValidationErrors((prev) => ({
        ...prev,
        photo: /sincronizar/i.test(message)
          ? "Nao foi possivel preparar a foto para envio. Tire outra e tente novamente."
          : "Nao foi possivel processar a foto. Tente outra imagem ou abra a camera novamente."
      }));

      void trackProductEvent({
        eventType: "submission_validation_error" as any,
        pagePath: "/enviar",
        pageTitle: "Enviar preco",
        stationId: stationId || null,
        fuelType,
        payload: {
          field: "photo",
          reason: "photo_processing_failed",
          message
        }
      });
    } finally {
      setIsProcessingPhoto(false);
    }
  }

  function formatPrice(value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";

    const num = parseInt(digits, 10);
    const formatted = (num / 1000).toLocaleString("pt-BR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
    return formatted;
  }

  function focusPreferredPriceField(targetFuelType?: FuelType) {
    const preferredFuel = targetFuelType ?? lastTouchedFuelType;
    const orderedFuelTypes = [preferredFuel, ...fuelOptions.filter((fuel) => fuel !== preferredFuel)];

    for (const fuel of orderedFuelTypes) {
      const input = priceInputRefs.current[fuel];
      if (input) {
        input.focus();
        input.select();
        return;
      }
    }
  }

  function handleFuelPriceChange(fuel: FuelType, rawValue: string) {
    const formatted = formatPrice(rawValue);
    setFuelPrices((current) => ({ ...current, [fuel]: formatted }));
    setLastTouchedFuelType(fuel);
    setPricesReviewed(false);

    setValidationErrors((current) => {
      const nextByFuel = { ...(current.priceByFuel ?? {}) };
      delete nextByFuel[fuel];
      return {
        ...current,
        fuelPrices: undefined,
        priceByFuel: Object.keys(nextByFuel).length > 0 ? nextByFuel : undefined
      };
    });
  }

  function handlePriceFieldFocus(fuel: FuelType) {
    setLastTouchedFuelType(fuel);
    handleFieldFocus(`price:${fuel}`);
  }

  function handleFieldFocus(fieldName: string) {
    lastFieldRef.current = fieldName;
  }

  function validateForm() {
    const errors: typeof validationErrors = {};
    const priceByFuel: Partial<Record<FuelType, string>> = {};
    const filledEntries = getFilledFuelPriceEntries(fuelPrices);

    if (!stationId) errors.stationId = "Selecione um posto.";

    if (filledEntries.length === 0) {
      errors.fuelPrices = "Preencha pelo menos um preço que apareca na foto.";
    }

    filledEntries.forEach((entry) => {
      if (!entry.price || entry.price.length < 5) {
        priceByFuel[entry.fuelType] = "Use um preco valido, como 5,699.";
      }
    });

    if (Object.keys(priceByFuel).length > 0) {
      errors.priceByFuel = priceByFuel;
      errors.fuelPrices = errors.fuelPrices ?? "Revise os precos destacados antes de enviar.";
    }

    if (evidenceMode === "placa_faixa") {
      if (!selectedFileRef.current) {
        errors.photo = "A foto e obrigatoria para o envio de rua.";
      }
    } else if (!priceSource) {
      errors.priceSource = "Escolha a origem do preco.";
    }

    setValidationErrors(errors);

    Object.entries(errors).forEach(([field, message]) => {
      if (!message) return;
      void trackProductEvent({
        eventType: "submission_validation_error" as any,
        pagePath: "/enviar",
        payload: { field, message, price, fuelType, packageSize: filledEntries.length }
      });
    });

    return Object.keys(errors).length === 0;
  }

  const requiresDocumentPhoto = evidenceMode === "placa_faixa";
  const hasPhoto = Boolean(previewUrl);
  const manualSourceReady = evidenceMode === "sem_placa_faixa" ? Boolean(priceSource) : true;
  const evidenceReady = requiresDocumentPhoto ? hasPhoto : manualSourceReady;
  const canSubmit = Boolean(selectedStation && filledFuelEntries.length > 0 && evidenceReady);
  const retryableError = state.error && state.retryable;
  const guidedStage: SubmissionDraftStep = !evidenceReady ? "photo" : !stationConfirmed ? "station" : filledFuelEntries.length === 0 ? "price" : !pricesReviewed ? "price" : "submit";
  const stageLabel = {
    photo: evidenceMode === "sem_placa_faixa" ? "Origem" : "Foto",
    station: "Posto",
    price: "Precos",
    submit: "Revisao"
  }[guidedStage];
  const submitButtonLabel =
    guidedStage === "photo"
      ? evidenceMode === "sem_placa_faixa"
        ? (priceSource ? "Continuar sem foto" : "Escolher origem")
        : "Abrir camera"
      : guidedStage === "station"
        ? "Confirmar posto"
        : guidedStage === "price"
          ? (filledFuelEntries.length > 0 ? "Ver revisao" : "Preencher precos")
          : `Enviar ${filledFuelEntries.length > 1 ? `${filledFuelEntries.length} precos` : "preco"}`;
  async function refreshQueueItems() {
    const items = await loadSubmissionQueue().catch(() => [] as SubmissionQueueEntry[]);
    setQueueItems(items);
  }

  async function handleRetryQueueItem(item: SubmissionQueueEntry) {
    void trackProductEvent({
      eventType: "submission_queue_retried",
      pagePath: "/enviar",
      pageTitle: "Enviar preço",
      stationId: item.stationId,
      city: item.city,
      fuelType: item.fuelType,
      scopeType: "submission",
      scopeId: item.stationId,
      payload: {
        draftKey: item.draftKey,
        hasPhoto: item.hasPhoto,
        status: item.status
      }
    });

    if (item.draftKey === draftKey && isOnline && canSubmit && selectedFileRef.current) {
      formRef.current?.requestSubmit();
      return;
    }

    router.push(buildSubmissionQueueHref(item));
  }

  async function handleReviewQueueItem(item: SubmissionQueueEntry) {
    router.push(buildSubmissionQueueHref(item));
  }

  async function handleDiscardQueueItem(item: SubmissionQueueEntry) {
    void trackProductEvent({
      eventType: "submission_queue_discarded",
      pagePath: "/enviar",
      pageTitle: "Enviar preço",
      stationId: item.stationId,
      city: item.city,
      fuelType: item.fuelType,
      scopeType: "submission",
      scopeId: item.stationId,
      payload: {
        draftKey: item.draftKey,
        hasPhoto: item.hasPhoto,
        status: item.status
      }
    });

    await removeSubmissionQueueEntry(item.id).catch(() => undefined);
    await clearSubmissionDraft(item.draftKey).catch(() => undefined);
    window.sessionStorage.removeItem(item.draftKey);
    if (item.draftKey === draftKey) {
      completedRef.current = false;
      setFuelPrices(normalizeFuelPriceMap(undefined, lastTouchedFuelType, ""));
      setPricesReviewed(false);
      setNickname("");
      setPreviewUrl(null);
      selectedFileRef.current = null;
      setDraftRestored(false);
      setDraftPhotoMissing(false);
      setStationConfirmed(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onResetRequest();
    }
    await refreshQueueItems();
  }

  function handleStationSelect(candidate: StationPickerCandidate, source: "nearby" | "recent" | "search" | "fallback") {
    const suggestionId = suggestedStationIdRef.current;
    const isChangingSuggestedStation = Boolean(suggestionId && suggestionId !== candidate.station.id);
    const suggestionChangedKey = suggestionId ? [draftKey, suggestionId, candidate.station.id].join(":") : null;
    const isManualReuse = candidate.station.id === (lastStationSnapshot?.id ?? session?.lastGesture?.stationId ?? null);
    const acceptedKey = [draftKey, candidate.station.id, "accepted"].join(":");

    if (candidate.ambiguityCount > 1) {
      void trackProductEvent({
        eventType: "station_similar_choice_clicked",
        pagePath: "/enviar",
        pageTitle: "Enviar preço",
        stationId: candidate.station.id,
        city: candidate.station.city,
        fuelType,
        scopeType: "submission",
        scopeId: candidate.station.id,
        payload: {
          source,
          distance: candidate.distance,
          ambiguityCount: candidate.ambiguityCount
        }
      });
    }

    if (isChangingSuggestedStation && suggestionChangedKey && stationSuggestionChangedKeyRef.current !== suggestionChangedKey) {
      stationSuggestionChangedKeyRef.current = suggestionChangedKey;
      void trackProductEvent({
        eventType: "station_suggestion_changed",
        pagePath: "/enviar",
        pageTitle: "Enviar preço",
        stationId: candidate.station.id,
        city: candidate.station.city,
        fuelType,
        scopeType: "submission",
        scopeId: candidate.station.id,
        payload: {
          fromStationId: suggestionId,
          toStationId: candidate.station.id,
          source,
          distance: candidate.distance,
          ambiguityCount: candidate.ambiguityCount
        }
      });
    }

    if (suggestionId === candidate.station.id && stationSuggestionAcceptedKeyRef.current !== acceptedKey) {
      stationSuggestionAcceptedKeyRef.current = acceptedKey;
      void trackProductEvent({
        eventType: "station_suggestion_accepted",
        pagePath: "/enviar",
        pageTitle: "Enviar preço",
        stationId: candidate.station.id,
        city: candidate.station.city,
        fuelType,
        scopeType: "submission",
        scopeId: candidate.station.id,
        payload: {
          source,
          distance: candidate.distance,
          geoReviewStatus: candidate.station.geoReviewStatus ?? null,
          visibilityRank: candidate.visibilityRank,
          decisionsSkipped: submissionAutoDecisionCountRef.current
        }
      });
    }

    if (isManualReuse && stationLastUsedReuseTrackedRef.current !== acceptedKey) {
      stationLastUsedReuseTrackedRef.current = acceptedKey;
      void trackProductEvent({
        eventType: "station_last_used_reused",
        pagePath: "/enviar",
        pageTitle: "Enviar preço",
        stationId: candidate.station.id,
        city: candidate.station.city,
        fuelType,
        scopeType: "submission",
        scopeId: candidate.station.id,
        payload: {
          source,
          distance: candidate.distance,
          recentIndex: candidate.recentIndex,
          cityContextMatch: candidate.cityContextMatch
        }
      });
    }

    stationSelectionOriginRef.current = "manual";
    setStationId(candidate.station.id);
    setStationSearch("");
    setValidationErrors((prev) => ({ ...prev, stationId: undefined }));
    setIsSuggested(source === "nearby" && candidate.distance !== null);
    setStationConfirmed(true);
    setPricesReviewed(false);
    markStarted("station", {
      changed: true,
      source,
      distance: candidate.distance,
      geoReviewStatus: candidate.station.geoReviewStatus ?? null,
      ambiguityCount: candidate.ambiguityCount
    });
    rememberStationVisit({ id: candidate.station.id, name: candidate.publicName, city: candidate.station.city });
    setLastStationSnapshot({ id: candidate.station.id, name: candidate.publicName, city: candidate.station.city });
    recordActivity("touch", candidate.station.id);
  }


  function openStationProposalFlow() {
    setShowStationProposalFlow(true);
    setStationConfirmed(false);
    setStationProposalConfirmed(false);
    setStationId("");
    setValidationErrors((prev) => ({ ...prev, stationId: undefined }));
    queueMicrotask(() => stationProposalNameInputRef.current?.focus());
  }

  function handleConfirmStationProposal() {
    if (!proposalReady) {
      if (!stationProposalName.trim()) {
        stationProposalNameInputRef.current?.focus();
      } else if (!stationProposalStreet.trim() && !coords) {
        stationProposalStreetInputRef.current?.focus();
      }
      return;
    }

    setStationId("");
    setStationConfirmed(true);
    setStationProposalConfirmed(true);
    setValidationErrors((prev) => ({ ...prev, stationId: undefined }));
    markStarted("station", {
      changed: true,
      source: "station_proposal",
      proposalCity,
      hasCoords: Boolean(coords)
    });
  }

  function handleRejectStationProposal() {
    setShowStationProposalFlow(false);
    setStationProposalConfirmed(false);
    queueMicrotask(() => stationSearchInputRef.current?.focus());
  }
  function renderStationOption(candidate: StationPickerCandidate, source: "nearby" | "recent" | "search" | "fallback") {
    const isSelected = candidate.station.id === stationId;
    const geoBadge = getGeoReviewBadge(candidate);
    const sourceBadge = getStationSourceBadge(candidate, source);
    const isGeoPending = hasPendingStationLocationReview(candidate.station);
    const selectedReport = getSelectedStationReport(candidate.station, fuelType);
    const recentPriceLabel = selectedReport ? formatCurrencyBRL(selectedReport.price) : null;
    const recentTimeLabel = selectedReport ? formatRecencyLabel(selectedReport.reportedAt) : null;
    const streetLabel = candidate.addressShort || candidate.neighborhoodLabel || "Endereco curto indisponivel";
    const brandLabel = candidate.brandLabel ?? "Sem bandeira";
    const searchMatch = source === "search" ? getStationSearchMatchContext(candidate, normalizedStationSearch) : null;
    const highlightQuery = source === "search" ? stationSearch : "";

    return (
      <button
        key={`${source}:${candidate.station.id}`}
        type="button"
        onClick={() => handleStationSelect(candidate, source)}
        className={cn(
          "w-full rounded-[20px] border px-4 py-3 text-left transition-all",
          isSelected
            ? "border-[color:var(--color-accent)]/45 bg-[color:var(--color-accent)]/12 shadow-[0_12px_32px_rgba(255,212,0,0.12)]"
            : "border-white/10 bg-black/25 hover:border-white/18 hover:bg-white/[0.04]"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-white">{renderHighlightedStationText(candidate.publicName, highlightQuery)}</p>
              {isSelected ? <Badge variant="default">Escolhido</Badge> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/66">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/78">{brandLabel}</span>
              <span className="truncate">{renderHighlightedStationText(streetLabel, highlightQuery)}</span>
            </div>
            {searchMatch ? (
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--color-accent)]">
                <Badge variant="accent" className="px-2 py-0.5 text-[9px]">{searchMatch.label}</Badge>
                <span className="truncate text-white/84">{renderHighlightedStationText(searchMatch.value, highlightQuery)}</span>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/54">
              <Badge variant={sourceBadge.variant}>{sourceBadge.label}</Badge>
              {candidate.distance !== null ? <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 font-semibold text-white/72">{formatDistanceFromYou(candidate.distance)}</span> : null}
              {recentPriceLabel ? <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-emerald-100">Preço {recentPriceLabel} · {recentTimeLabel}</span> : <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">Sem preço</span>}
              <Badge variant={geoBadge.variant}>{geoBadge.label}</Badge>
              {candidate.ambiguityCount > 1 ? <Badge variant="warning">Parecido</Badge> : null}
              {isGeoPending ? <Badge variant="outline">Geo em revisão</Badge> : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-1 text-xs text-white/42">
            <MapPin className="h-4 w-4" />
          </div>
        </div>
      </button>
    );
  }
  function handlePrimaryAction() {
    if (guidedStage === "photo") {
      if (evidenceMode === "sem_placa_faixa") {
        setValidationErrors((prev) => ({ ...prev, priceSource: priceSource ? undefined : "Escolha a origem do preço." }));
        return;
      }

      openCameraPicker();
      recordActivity("start", stationId);
      return;
    }

    if (guidedStage === "station") {
      if (!selectedStation) {
        stationSearchInputRef.current?.focus();
        return;
      }

      setStationConfirmed(true);
      markStarted("station", {
        confirmed: true,
        source: "guided_footer"
      });
      return;
    }

    if (guidedStage === "price") {
      if (filledFuelEntries.length === 0) {
        focusPreferredPriceField();
        return;
      }

      setPricesReviewed(true);
      markStarted("submit", {
        confirmed: true,
        source: "guided_footer"
      });
      return;
    }

    formRef.current?.requestSubmit();
  }

  return (
    <>
      {state.noticeTitle && state.noticeBody ? (
        <div
          className={cn(
            "mb-4 rounded-[18px] border px-4 py-3 text-sm",
            state.noticeTone === "warning"
              ? "border-amber-400/30 bg-amber-400/10 text-amber-50"
              : state.noticeTone === "success"
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-50"
                : "border-sky-400/25 bg-sky-400/10 text-sky-50"
          )}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium text-white">{state.noticeTitle}</p>
              <p className="mt-1 text-white/78">{state.noticeBody}</p>
            </div>
          </div>
        </div>
      ) : null}
    <form
      ref={formRef}
      action={formAction}
      className={cn("space-y-4 pb-32", state.success && "hidden") }
      onSubmit={(e) => {
        if (!validateForm()) {
          e.preventDefault();
          return;
        }
        // Success tracking
        markStarted("submit");
      }}
    >
      <input type="hidden" name="website" value="" />
      <input type="hidden" name="locationDistance" value={currentDistance?.toString() ?? ""} />
      <input type="hidden" name="locationConfidence" value={locationConfidence} />

      <div className={cn("rounded-[24px] border border-[color:var(--color-accent)]/18 bg-[color:var(--color-accent)]/8 p-4", isStreetMode && "border-none bg-white/5 p-3")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">{isStreetMode ? "Modo Rua Ativo" : "Selecione o posto"}</p>
              {isSuggested && (
                <p className="text-[10px] font-medium text-[color:var(--color-accent)]">📍 GPS</p>
              )}
            </div>
            {!canTrustProximity && !lockedStation && (
              <Button 
                type="button" 
                variant="ghost" 
                className="h-6 px-2 text-[10px]"
                onClick={() => refresh()}
              >
                {coords ? "Reforçar GPS" : "Ativar GPS"}
              </Button>
            )}
            {locationConfidence === "low" && (
              <div className={cn("mt-2 rounded-lg border border-orange-400/20 bg-orange-400/10 px-3 py-2 text-[11px] text-orange-200", isStreetMode && "mt-1")}>
                ⚠️ <strong>Posto distante:</strong> Este posto está {formatDistanceFromYou(currentDistance!)}.
              </div>
            )}
            {isAmbiguous && !lockedStation && (
              <div className={cn("mt-2 rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-[11px] text-yellow-200", isStreetMode && "mt-1")}>
                ✨ <strong>Confirme o posto:</strong> Há outros postos muito próximos aqui. Verifique se escolheu o correto.
              </div>
            )}
            {!isStreetMode && (
              <>
                <h3 className="mt-2 text-xl font-semibold text-white">{isFirstSendFlow ? "Escolha sua prova. O resto é guiado." : "Foto, contexto ou proposta leve. O resto continua rápido."}</h3>
                <p className="mt-1 text-sm text-white/62">{isFirstSendFlow ? "Se houver placa ou faixa, use foto. Se não houver, siga com preço manual e origem do dado." : "Com placa ou faixa, use foto. Sem isso, o app aceita contexto manual e manda para revisão mais conservadora."}</p>
              </>
            )}
          </div>
          <Badge variant={state.success ? "accent" : "warning"}>{state.success ? "Enviado" : isStreetMode ? "Compacto" : "Rápido"}</Badge>
        </div>
        {!isStreetMode && (
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/52">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">1. Prova</span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">2. Posto</span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">3. Combustível</span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">4. Preço</span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">5. Enviar</span>
          </div>
        )}
        <div className={cn("mt-4 flex flex-wrap gap-2", isStreetMode && "mt-2")}>
          <Button
            type="button"
            onClick={() => {
              void trackProductEvent({
                eventType: "submission_camera_opened",
                pagePath: "/enviar",
                pageTitle: "Enviar preço",
                stationId: stationId || null,
                fuelType,
                scopeType: "submission",
                scopeId: stationId || null,
                payload: {
                  source: "camera-primary",
                  compactMode,
                  lockedStation,
                  streetMode: isStreetMode,
                  hasPhoto: Boolean(selectedFileRef.current)
                }
              });
              openCameraPicker();
              recordActivity('start', stationId);
            }}
            className={cn("w-full sm:w-auto", isStreetMode && "h-16 text-lg font-bold shadow-2xl")}
          >
            {isStreetMode ? "ABRIR CÂMERA AGORA" : "Tirar foto agora"}
          </Button>
          {!isFirstSendFlow && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void trackProductEvent({
                  eventType: "submission_camera_opened",
                  pagePath: "/enviar",
                  pageTitle: "Enviar preço",
                  stationId: stationId || null,
                  fuelType,
                  scopeType: "submission",
                  scopeId: stationId || null,
                  payload: {
                    source: "camera-secondary",
                    compactMode,
                    lockedStation,
                    hasPhoto: Boolean(selectedFileRef.current)
                  }
                });
                openCameraPicker();
                recordActivity('start', stationId);
              }}
              className="w-full sm:w-auto"
            >
              Abrir câmera
            </Button>
          )}
        </div>
        {draftRestored ? (
          <div className="mt-3 rounded-[18px] border border-white/8 bg-black/30 p-3 text-sm text-white/66">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-white">Continuar envio salvo</p>
              <Button type="button" variant="ghost" onClick={() => openCameraPicker()}>
                {draftPhotoMissing ? "Refazer foto" : "Continuar"}
              </Button>
            </div>
            <p className="mt-1 text-white/54">Os dados que já estavam preenchidos voltaram. Se a foto não veio junto, tire outra antes de enviar.</p>
          </div>
        ) : null}
        {!isStreetMode && <p className="mt-3 text-xs leading-relaxed text-white/52">Se a conexão cair, os campos continuam na tela. Se a foto falhar, tente de novo sem refazer tudo.</p>}
      </div>
      {queueItems.length > 0 ? (
        <div className="rounded-[18px] border border-white/8 bg-black/24 px-4 py-3 text-sm text-white/68">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-white">Fila local</p>
              <p className="text-xs text-white/48">Novo envio continua sendo a acao principal.</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="shrink-0"
              onClick={() => document.getElementById('submission-queue-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              Ver fila
            </Button>
          </div>
        </div>
      ) : null}

      {!state.success && (draftRestored || queueItems.length > 0) ? (
        <div className="mb-4">
          <ProgressiveIdentityPrompt context="submit" source={queueItems.length > 0 ? "queue" : "draft"} />
        </div>
      ) : null}

      {state.success ? (
        <div className="space-y-4">
          <ProgressiveIdentityPrompt context="submit" source="success" />
          <PostSubmissionBridge
            status={currentQueueItem ? "queued" : "success"}
            station={selectedStation!}
            fuelType={fuelType}
            price={price}
            submittedReports={state.submittedReports}
            isStreetMode={isStreetMode}
            mission={mission}
            nextMissionStation={nextStationNode}
            nearbyStations={nearbyStationsList}
            safeReturnToHref={safeReturnToHref}
            onReset={resetForAnotherSubmission}
          />
        </div>
      ) : null}
      {queueItems.length > 0 ? (
        <div id="submission-queue-panel" className="pt-1">
          <SubmissionQueuePanel
            items={queueItems}
            online={isOnline}
            onRetry={handleRetryQueueItem}
            onReview={handleReviewQueueItem}
            onDiscard={handleDiscardQueueItem}
          />
        </div>
      ) : null}

      {state.error ? (
        <div ref={submitFeedbackRef} className={`rounded-[18px] border px-4 py-3 text-sm ${retryableError ? "border-[color:var(--color-accent)]/24 bg-[color:var(--color-accent)]/10 text-white" : "border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)]"}`}>
          <p className="font-medium text-white">
            {state.errorCode === "network_offline"
              ? "Sem conexão agora."
              : state.errorCode === "network_timeout"
                ? "A conexão demorou demais."
                : state.errorCode === "upload_failed"
                  ? "Falha no upload."
                  : state.errorCode === "upload_interrupted"
                    ? "A foto foi interrompida no meio do caminho."
                    : state.errorCode === "photo_missing"
                      ? "A foto não foi recuperada."
                      : state.errorCode === "rate_limited"
                        ? "Muitas tentativas em pouco tempo."
                        : "Não foi possível concluir."}
          </p>
          <p className="mt-1 text-white/78">{state.error}</p>
          {retryableError ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  retryAttemptRef.current += 1;
                  void trackProductEvent({
                    eventType: "submission_retry_clicked",
                    pagePath: "/enviar",
                    pageTitle: "Enviar preço",
                    stationId: telemetryContextRef.current.stationId,
                    fuelType: telemetryContextRef.current.fuelType,
                    scopeType: "submission",
                    scopeId: telemetryContextRef.current.stationId,
                    payload: {
                      retryAttempt: retryAttemptRef.current,
                      reason: state.errorCode,
                      lastStep: currentStepRef.current,
                      compactMode: telemetryContextRef.current.compactMode,
                      lockedStation: telemetryContextRef.current.lockedStation,
                      hasPhoto: Boolean(selectedFileRef.current),
                      photoMissing: draftPhotoMissing
                    }
                  });
                  formRef.current?.requestSubmit();
                }}
              >
                Tentar novamente
              </Button>
              <Button type="button" variant="ghost" onClick={() => openCameraPicker()}>
                Reabrir câmera
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={cn("space-y-3", guidedStage !== "photo" && "hidden")} id="photo">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setEvidenceMode("placa_faixa");
              setValidationErrors((prev) => ({ ...prev, photo: undefined, priceSource: undefined }));
            }}
            className={cn(
              "rounded-[18px] border px-4 py-3 text-left transition",
              evidenceMode === "placa_faixa" ? "border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent)]/10" : "border-white/10 bg-black/20"
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/42">Tem placa ou faixa</p>
            <p className="mt-1 text-sm font-semibold text-white">Usar foto documental</p>
            <p className="mt-1 text-xs text-white/56">Melhor caminho quando a prova visual está clara.</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setEvidenceMode("sem_placa_faixa");
              setValidationErrors((prev) => ({ ...prev, photo: undefined, priceSource: undefined }));
            }}
            className={cn(
              "rounded-[18px] border px-4 py-3 text-left transition",
              evidenceMode === "sem_placa_faixa" ? "border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent)]/10" : "border-white/10 bg-black/20"
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/42">Sem placa ou sem faixa</p>
            <p className="mt-1 text-sm font-semibold text-white">Preço manual com contexto</p>
            <p className="mt-1 text-xs text-white/56">Para bomba, recibo, painel interno ou informação local.</p>
          </button>
        </div>

        {evidenceMode === "placa_faixa" ? (
          <>
            <label className="text-sm font-medium text-white" htmlFor="photo-input">
              Foto da placa, faixa ou bomba
            </label>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              tabIndex={-1}
              aria-hidden="true"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              id="photo-input"
              name="photo"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                setValidationErrors((prev) => ({ ...prev, photo: undefined }));
                handleFileChange(e);
              }}
              className="hidden"
            />
            <div
              className={cn(
                "space-y-3 rounded-[20px] border border-dashed px-4 py-4 transition-all",
                validationErrors.photo ? "border-red-500/50 bg-red-500/5" : "border-white/14 bg-black/30"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{selectedFileRef.current ? "Foto pronta para análise" : "Envie a foto que mostra os preços"}</p>
                  <p className="mt-1 truncate text-xs text-white/56">
                    {selectedFileRef.current?.name ?? "Pode tirar agora ou escolher da galeria do aparelho."}
                  </p>
                </div>
                {previewUrl ? <Badge variant="accent" className="shrink-0">Foto pronta</Badge> : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" className="h-11 flex-1 justify-center gap-2" onClick={() => { handleFieldFocus("photo"); openCameraPicker(); }}>
                  <Camera className="h-4 w-4" />
                  Tirar foto
                </Button>
                <Button type="button" variant="secondary" className="h-11 flex-1 justify-center" onClick={() => { handleFieldFocus("photo"); openGalleryPicker(); }}>
                  Escolher arquivo
                </Button>
              </div>
              <p className="text-xs text-white/48">Se a placa ou a faixa mostrar vários preços, uma foto só já resolve.</p>
            </div>
          </>
        ) : (
          <div className="space-y-3 rounded-[20px] border border-white/10 bg-black/20 p-4">
            <div>
              <p className="text-sm font-medium text-white">De onde veio esse preço?</p>
              <p className="mt-1 text-xs text-white/56">Esse modo entra em revisão mais conservadora.</p>
            </div>
            <p className="text-xs text-white/56">Sem foto também pode seguir. Se quiser, anexe contexto opcional.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["bomba", "recibo", "painel_interno", "informacao_local"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setPriceSource(option);
                    setValidationErrors((prev) => ({ ...prev, photo: undefined, priceSource: undefined }));
                    markStarted("photo", { evidenceMode: "sem_placa_faixa", priceSource: option });
                  }}
                  className={cn(
                    "rounded-[16px] border px-3 py-3 text-left text-sm transition",
                    priceSource === option ? "border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent)]/10 text-white" : "border-white/10 bg-black/20 text-white/72"
                  )}
                >
                  {manualPriceSourceLabels[option]}
                </button>
              ))}
            </div>
            {validationErrors.priceSource ? <p className="px-1 text-[10px] font-bold uppercase text-red-400 tracking-wider animate-in fade-in slide-in-from-top-1">{validationErrors.priceSource}</p> : null}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white" htmlFor="photo-input">Foto opcional de contexto</label>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                tabIndex={-1}
                aria-hidden="true"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                id="photo-input"
                name="photo"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  setValidationErrors((prev) => ({ ...prev, photo: undefined }));
                  handleFileChange(e);
                }}
                className="hidden"
              />
              <div
                className={cn(
                  "space-y-3 rounded-[18px] border border-dashed px-4 py-4 transition-all",
                  validationErrors.photo ? "border-red-500/50 bg-red-500/5" : "border-white/14 bg-black/30"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{selectedFileRef.current ? "Foto opcional pronta" : "Anexar contexto visual"}</p>
                    <p className="mt-1 truncate text-xs text-white/56">
                      {selectedFileRef.current?.name ?? "Recibo, visor ou ambiente do posto ajudam na revisão."}
                    </p>
                  </div>
                  {previewUrl ? <Badge variant="outline" className="shrink-0">Com foto</Badge> : null}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" className="h-11 flex-1 justify-center gap-2" onClick={() => { handleFieldFocus("photo"); openCameraPicker(); }}>
                    <Camera className="h-4 w-4" />
                    Usar câmera
                  </Button>
                  <Button type="button" variant="secondary" className="h-11 flex-1 justify-center" onClick={() => { handleFieldFocus("photo"); openGalleryPicker(); }}>
                    Escolher arquivo
                  </Button>
                </div>
                <p className="text-xs text-white/48">Sem foto também pode seguir.</p>
              </div>
            </div>
            </div>
        )}
        {validationErrors.photo && <p className="mt-1.5 px-1 text-[10px] font-bold uppercase text-red-300 tracking-wider animate-in fade-in slide-in-from-top-1">{validationErrors.photo}</p>}
      </div>

      {isProcessingPhoto && (
        <div className="flex h-32 items-center justify-center rounded-[22px] border border-dashed border-white/20 bg-black/20">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-[color:var(--color-accent)]" />
            <p className="text-xs font-medium text-white/50 uppercase tracking-widest">Otimizando evidência...</p>
          </div>
        </div>
      )}

      {previewUrl && !isProcessingPhoto && guidedStage === "photo" ? (
        <div className="group relative overflow-hidden rounded-[22px] border border-white/12 bg-black/40 shadow-2xl transition-all hover:border-[color:var(--color-accent)]/30">
          <img src={previewUrl} alt="Pré-visualização da foto enviada" className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          
          {/* Overlay de Qualidade */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {qualityResult?.isGood ? (
                  <Badge variant="accent" className="gap-1.5 py-1 pr-3">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    FOTO NÍTIDA
                  </Badge>
                ) : qualityResult ? (
                   <Badge variant="warning" className="gap-1.5 py-1 pr-3 bg-orange-500/20 text-orange-400 border-orange-500/30">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    ATENÇÃO À QUALIDADE
                  </Badge>
                ) : (
                  <Badge variant="outline" className="animate-pulse">ANALISANDO...</Badge>
                )}
              </div>
              {qualityResult && !qualityResult.isGood && (
                 <div className="flex flex-wrap gap-1">
                    {qualityResult.warnings.map(w => (
                      <span key={w} className="rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold text-white/80 uppercase tracking-wider backdrop-blur-sm">
                        {w.replace('_', ' ')}
                      </span>
                    ))}
                 </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isTestMode && (
                <Badge variant="outline" className="h-8 border-indigo-500/50 bg-indigo-500/10 text-indigo-400 font-black italic">
                  BETA TEST
                </Badge>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => openCameraPicker()}
                className="h-8 rounded-full border-white/10 bg-white/10 px-3 text-[10px] font-bold text-white backdrop-blur-md hover:bg-white/20"
              >
                REFAZER FOTO
              </Button>
            </div>
          </div>

          {!qualityResult?.isGood && qualityResult && (
             <div className="absolute inset-x-0 bottom-0 bg-orange-500/90 p-3 backdrop-blur-md">
                <div className="flex items-center gap-3">
                   <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                      <Sparkles className="h-4 w-4 text-white" />
                   </div>
                   <p className="text-[11px] font-bold leading-tight text-white uppercase tracking-tight">
                      {qualityResult.warnings.includes('MUITO_ESCURA') ? 'ESSA FOTO ESTÁ MEIO ESCURA. TALVEZ SEJA MELHOR TIRAR OUTRA COM MAIS LUZ.' : 'A FOTO PARECE MEIO RUIM. SE POSSÍVEL, TENTE UMA MAIS NÍTIDA PARA FACILITAR A MODERAÇÃO.'}
                   </p>
                </div>
             </div>
          )}
        </div>
      ) : null}


      {guidedStage !== "photo" && previewUrl && !isProcessingPhoto ? (
        <div className="rounded-[22px] border border-white/10 bg-black/25 p-3">
          <div className="flex items-center gap-3">
            <img src={previewUrl} alt="Foto pronta para envio" className="h-16 w-16 rounded-[16px] object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/42">Foto</p>
              <p className="truncate text-sm font-semibold text-white">Foto pronta</p>
              <p className="mt-1 text-xs text-white/52">A próxima etapa é o posto.</p>
            </div>
            <Button type="button" variant="secondary" className="shrink-0" onClick={() => openGalleryPicker()}>
              Trocar
            </Button>
          </div>
        </div>
      ) : null}

      {guidedStage !== "station" && selectedStation ? (
        <div className="rounded-[18px] border border-[color:var(--color-accent)]/18 bg-[color:var(--color-accent)]/8 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]/72">{lockedStation ? "Posto travado" : "Posto sugerido"}</p>
              <p className="truncate text-sm font-semibold text-white">{getStationPublicName(selectedStation)}</p>
              <p className="mt-1 text-xs text-white/62">{selectedStation.neighborhood} · {shortAddress(selectedStation.address) || selectedStation.city}</p>
            </div>
            {!lockedStation ? (
              <Button type="button" variant="secondary" className="shrink-0" onClick={() => { setStationConfirmed(false); setShowStationPicker(true); stationSearchInputRef.current?.focus(); }}>
                Trocar
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className={cn("space-y-3 rounded-[22px] border border-white/8 bg-black/30 p-4", guidedStage !== "station" && "hidden") }>
        <input type="hidden" name="stationId" value={stationId} />
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-white" htmlFor="station-search">
            Posto
          </label>
          {compactMode ? <Badge variant="outline">Preenchido pelo contexto</Badge> : <Badge variant="outline">Proximidade e contexto</Badge>}
        </div>
        {lockedStation ? (
          <div className={cn(
            "rounded-[18px] border bg-white/5 px-4 py-3 text-sm text-white/72 transition-all",
            validationErrors.stationId ? "border-red-500/50 bg-red-500/5" : "border-white/8"
          )}>
            <p className="font-medium text-white">{selectedStation ? getStationPublicName(selectedStation) : "Posto"}</p>
            <p className="mt-1 text-white/54">{selectedStation?.neighborhood}, {selectedStation?.city}</p>
            <p className="mt-2 text-[11px] text-[color:var(--color-accent)]/82">
              {lockedStationMeta?.source === "route" ? "Posto travado pela aproximacao da rota." : "Posto travado pelo contexto de chegada."}
            </p>
            {selectedStation?.address && !isStreetMode ? <p className="mt-1 text-xs text-white/42">{shortAddress(selectedStation.address)}</p> : null}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/34" />
                <input
                  id="station-search"
                  value={stationSearch}
                  onFocus={() => handleFieldFocus("stationId")}
                  onChange={(event) => {
                    setStationSearch(event.target.value);
                    setValidationErrors((prev) => ({ ...prev, stationId: undefined }));
                  }}
                  placeholder="Buscar por nome, bairro, endereco, cidade ou bandeira"
                  className={cn(
                    "h-12 w-full rounded-[18px] border bg-black/30 pl-11 pr-4 text-sm text-white outline-none transition focus:border-[color:var(--color-accent)]/60 focus:ring-2 focus:ring-[color:var(--color-accent)]/20",
                    validationErrors.stationId ? "border-red-500/50 ring-1 ring-red-500/20" : "border-white/10"
                  )}
                />
              </div>
              {!canTrustProximity ? (
                <Button type="button" variant="secondary" className="h-12 px-4 text-xs uppercase tracking-[0.18em]" onClick={() => refresh()}>
                  {coords ? "Reforçar GPS" : "Ver mais proximos"}
                </Button>
              ) : null}
            </div>

            {showStationProposalFlow ? (
              <div className="rounded-[18px] border border-[color:var(--color-accent)]/22 bg-[color:var(--color-accent)]/8 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-accent)]/72">Posto ausente na lista</p>
                    <p className="mt-1 text-sm font-semibold text-white">Proposta leve para revisão</p>
                    <p className="mt-1 text-xs text-white/58">Informe o básico. O time valida antes de abrir isso para o público.</p>
                  </div>
                  <Badge variant="warning">Revisão</Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">Nome ou apelido do posto</span>
                    <input
                      ref={stationProposalNameInputRef}
                      value={stationProposalName}
                      onChange={(event) => { setStationProposalName(event.target.value); setStationProposalConfirmed(false); }}
                      placeholder="Ex.: Posto da subida"
                      className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[color:var(--color-accent)]/60 focus:ring-2 focus:ring-[color:var(--color-accent)]/20"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">Bairro</span>
                    <input
                      value={stationProposalNeighborhood}
                      onChange={(event) => { setStationProposalNeighborhood(event.target.value); setStationProposalConfirmed(false); }}
                      placeholder="Ex.: Aterrado"
                      className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[color:var(--color-accent)]/60 focus:ring-2 focus:ring-[color:var(--color-accent)]/20"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">Cidade</span>
                    <input
                      value={stationProposalCity}
                      onChange={(event) => { setStationProposalCity(event.target.value); setStationProposalConfirmed(false); }}
                      placeholder="Ex.: Volta Redonda"
                      className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[color:var(--color-accent)]/60 focus:ring-2 focus:ring-[color:var(--color-accent)]/20"
                    />
                  </label>
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">Endereco ou referencia</span>
                    <input
                      ref={stationProposalStreetInputRef}
                      value={stationProposalStreet}
                      onChange={(event) => { setStationProposalStreet(event.target.value); setStationProposalConfirmed(false); }}
                      placeholder="Rua, numero, esquina ou referencia. Se o GPS estiver ligado, pode deixar em branco."
                      className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[color:var(--color-accent)]/60 focus:ring-2 focus:ring-[color:var(--color-accent)]/20"
                    />
                  </label>
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">Bandeira</span>
                    <input
                      value={stationProposalBrand}
                      onChange={(event) => { setStationProposalBrand(event.target.value); setStationProposalConfirmed(false); }}
                      placeholder="Opcional"
                      className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[color:var(--color-accent)]/60 focus:ring-2 focus:ring-[color:var(--color-accent)]/20"
                    />
                  </label>
                </div>
                <div className={cn("mt-3 rounded-[16px] border px-3 py-2.5 text-xs", coords ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-50" : "border-orange-400/20 bg-orange-400/10 text-orange-50")}>
                  {coords ? "Seu GPS vai junto para ajudar a posicionar esse posto novo." : "Sem GPS agora. Ainda dá para propor com bairro, cidade e referência."}
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/42">Parecidos antes de criar</p>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/28">Até 3</span>
                  </div>
                  <div className="space-y-2">
                    {proposalDuplicateCandidates.length > 0 ? proposalDuplicateCandidates.map((candidate) => renderStationOption(candidate, "search")) : (
                      <div className="rounded-[16px] border border-white/8 bg-black/20 px-3 py-2 text-xs text-white/54">Digite o nome ou a referência para checar se ele já existe na base.</div>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button type="button" className="w-full justify-center sm:flex-1" disabled={!proposalReady} onClick={() => handleConfirmStationProposal()}>
                    Confirmar proposta
                  </Button>
                  <Button type="button" variant="secondary" className="w-full justify-center sm:flex-1" onClick={() => handleRejectStationProposal()}>
                    Voltar para lista
                  </Button>
                </div>
              </div>
            ) : null}

            {selectedStation && (!showStationPicker || lockedStation) ? (
              <div className="rounded-[18px] border border-[color:var(--color-accent)]/22 bg-[color:var(--color-accent)]/8 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white">{getStationPublicName(selectedStation)}</p>
                      <Badge variant="default">Escolhido</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/72">
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">{selectedStation.distributorName?.trim() || selectedStation.brand?.trim() || "Sem bandeira"}</span>
                      <span className="truncate">{shortAddress(selectedStation.address) || selectedStation.neighborhood || selectedStation.city}</span>
                      {canTrustProximity && coords && isValidStationCoordinate(selectedStation.lat, selectedStation.lng) ? <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">{formatDistanceFromYou(calculateDistance(coords.lat, coords.lng, selectedStation.lat, selectedStation.lng))}</span> : null}
                    </div>
                    {getSelectedStationReport(selectedStation, fuelType) ? (
                      <p className="text-[11px] text-emerald-100/80">Preço {formatCurrencyBRL(getSelectedStationReport(selectedStation, fuelType)!.price)} · {formatRecencyLabel(getSelectedStationReport(selectedStation, fuelType)!.reportedAt)}</p>
                    ) : (
                      <p className="text-[11px] text-white/52">Sem preço.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {selectedStation && !lockedStation && isAmbiguous ? (
              <div className="rounded-[18px] border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-50">
                <p className="font-semibold">Tem parecido?</p>
                <p className="mt-1 text-xs text-yellow-50/80">Se for o certo, siga. Se houver outro igual, troque antes de enviar.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button type="button" className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-white px-4 text-[11px] font-black uppercase tracking-[0.18em] text-black" onClick={() => setShowStationPicker(false)}>
                    Seguir com este
                  </button>
                  <button type="button" className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white/82" onClick={() => { setStationConfirmed(false); setShowStationPicker(true); stationSearchInputRef.current?.focus(); }}>
                    Trocar por parecido
                  </button>
                </div>
              </div>
            ) : null}

            {!normalizedStationSearch ? (
              <div className="space-y-4">
                {canTrustProximity ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Mais proximos de voce</p>
                      <span className="text-[11px] text-white/38">Raio inicial {nearbyRadiusMeters >= 5000 ? "5 km" : "2 km"}</span>
                    </div>
                    <div className="space-y-2">{(showMoreNearby ? nearbyPickerItems : nearbyPickerItems.slice(0, 3)).map((candidate) => renderStationOption(candidate, "nearby"))}</div>
                    {nearbyPickerItems.length > 3 ? (
                      <button type="button" className="text-[11px] font-semibold text-[color:var(--color-accent)]" onClick={() => setShowMoreNearby((value) => !value)}>
                        {showMoreNearby ? "Mostrar menos" : "Ver mais"}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {recentPickerItems.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Recentes e por onde voce passou</p>
                      <span className="text-[11px] text-white/38">Memoria curta do aparelho</span>
                    </div>
                    <div className="space-y-2">{(showMoreRecent ? recentPickerItems : recentPickerItems.slice(0, 2)).map((candidate) => renderStationOption(candidate, "recent"))}</div>
                    {recentPickerItems.length > 2 ? (
                      <button type="button" className="text-[11px] font-semibold text-[color:var(--color-accent)]" onClick={() => setShowMoreRecent((value) => !value)}>
                        {showMoreRecent ? "Mostrar menos" : "Ver mais"}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Outros postos bem ranqueados</p>
                    <span className="text-[11px] text-white/38">Geo melhor e menos ambiguidade</span>
                  </div>
                  <div className="space-y-2">{(showMoreFallback ? fallbackPickerItems : fallbackPickerItems.slice(0, 2)).map((candidate) => renderStationOption(candidate, "fallback"))}</div>
                  {fallbackPickerItems.length > 2 ? (
                    <button type="button" className="text-[11px] font-semibold text-[color:var(--color-accent)]" onClick={() => setShowMoreFallback((value) => !value)}>
                      {showMoreFallback ? "Mostrar menos" : "Ver mais"}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Resultados da busca</p>
                  <span className="text-[11px] text-white/38">{searchPickerItems.length} encontrados</span>
                </div>
                {searchPickerItems.length > 0 ? (
                  <>
                    <div className="space-y-2">{(showMoreSearch ? searchPickerItems : searchPickerItems.slice(0, 3)).map((candidate) => renderStationOption(candidate, "search"))}</div>
                    {searchPickerItems.length > 3 ? (
                      <button type="button" className="text-[11px] font-semibold text-[color:var(--color-accent)]" onClick={() => setShowMoreSearch((value) => !value)}>
                        {showMoreSearch ? "Mostrar menos" : "Ver mais"}
                      </button>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/58">
                    Nenhum posto bateu com a busca. Tente nome, bairro, endereco, cidade ou bandeira.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {validationErrors.stationId && <p className="mt-1.5 px-1 text-[10px] font-bold uppercase text-red-400 tracking-wider transition-all animate-in fade-in slide-in-from-top-1">{validationErrors.stationId}</p>}
      </div>

      <input type="hidden" name="fuelType" value={fuelType} />
      <input type="hidden" name="price" value={price} />
      <input type="hidden" name="priceEntriesJson" value={JSON.stringify(filledFuelEntries)} />

      <div className="space-y-3 rounded-[22px] border border-white/8 bg-black/30 p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/42">Precos por combustivel</p>
              <p className="mt-1 text-sm font-semibold text-white">Preencha so os precos que aparecem na foto.</p>
            </div>
            <Badge variant="outline">Pode enviar 1 ou varios</Badge>
          </div>
          <p className="text-xs text-white/56">Cada linha e opcional. Se um preco nao aparece, deixe em branco.</p>
        </div>

        <div className="space-y-2">
          {fuelOptions.map((option) => {
            const stationReport = selectedStation ? getSelectedStationReport(selectedStation, option) : null;
            const fieldError = validationErrors.priceByFuel?.[option];
            const value = fuelPrices[option] ?? "";

            return (
              <label key={option} className={cn(
                "flex items-center gap-3 rounded-[18px] border px-3 py-3 transition",
                value ? "border-[color:var(--color-accent)]/24 bg-[color:var(--color-accent)]/8" : "border-white/8 bg-black/20",
                fieldError && "border-red-500/50 bg-red-500/5"
              )}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{fuelLabels[option]}</span>
                    {value ? <Badge variant="accent">Preenchido</Badge> : <Badge variant="outline">Opcional</Badge>}
                  </div>
                  <p className="mt-1 text-[11px] text-white/52">
                    {stationReport ? `Ultimo no posto: ${formatCurrencyBRL(stationReport.price)} · ${formatRecencyLabel(stationReport.reportedAt)}` : "Sem preco recente neste posto."}
                  </p>
                  {fieldError ? <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-red-400">{fieldError}</p> : null}
                </div>
                <input
                  ref={(node) => { priceInputRefs.current[option] = node; }}
                  inputMode="numeric"
                  value={value}
                  onFocus={() => handlePriceFieldFocus(option)}
                  onChange={(event) => {
                    handleFuelPriceChange(option, event.target.value);
                    markStarted("price", {
                      fuelType: option,
                      filledCount: countFilledFuelPrices({ ...fuelPrices, [option]: formatPrice(event.target.value) })
                    });
                  }}
                  placeholder="0,000"
                  className="w-28 shrink-0 rounded-[16px] border border-white/10 bg-black/30 px-3 py-2 text-right text-base font-bold text-[color:var(--color-accent)] outline-none placeholder:text-white/18 transition focus:border-[color:var(--color-accent)]/60 focus:ring-2 focus:ring-[color:var(--color-accent)]/20"
                />
              </label>
            );
          })}
        </div>

        {validationErrors.fuelPrices ? <p className="px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-red-400">{validationErrors.fuelPrices}</p> : null}
      </div>

      {!isStreetMode && (
        <details className="rounded-[22px] border border-white/8 bg-black/30 p-4 text-sm text-white/58">
          <summary className="cursor-pointer list-none font-medium text-white/76">Apelido opcional</summary>
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium text-white" htmlFor="nickname">
              Como quer aparecer, se quiser
            </label>
            <input
              id="nickname"
              name="nickname"
              value={nickname}
              onChange={(event) => {
                setNickname(event.target.value);
                markStarted("submit", { field: "nickname", hasValue: event.target.value.trim().length > 0 });
              }}
              onBlur={(event) => {
                persistProgressiveIdentityNickname(event.target.value, "manual");
              }}
              placeholder="Ex.: Morador VR"
              className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-[color:var(--color-accent)]/60 focus:ring-2 focus:ring-[color:var(--color-accent)]/20"
            />
          </div>
        </details>
      )}

      {guidedStage === "submit" ? (
        <div className="rounded-[22px] border border-[color:var(--color-accent)]/18 bg-[color:var(--color-accent)]/8 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-accent)]/72">Revisão final</p>
          <p className="mt-2 text-sm font-semibold text-white">Confirme a foto, o posto e os preços preenchidos.</p>
          <div className="mt-4 space-y-2 text-sm text-white/72">
            <div className="flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
              <span className="text-white/48">Posto</span>
              <span className="truncate text-right font-medium text-white">{showStationProposalFlow ? (stationProposalName || "Posto novo proposto") : selectedStation ? getStationPublicName(selectedStation) : "Posto"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
              <span className="text-white/48">Evidência</span>
              <span className="truncate text-right font-medium text-white">{hasPhoto ? "Anexada" : evidenceMode === "sem_placa_faixa" ? "Sem foto" : "Pendente"}</span>
            </div>
          </div>
          <div className="mt-3 rounded-[18px] border border-white/8 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">Preços do pacote</p>
              <Badge variant="accent">{filledFuelEntries.length} preenchido{filledFuelEntries.length > 1 ? "s" : ""}</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {filledFuelEntries.map((entry) => (
                <div key={entry.fuelType} className="flex items-center justify-between gap-3 rounded-[14px] border border-white/8 bg-white/[0.03] px-3 py-2">
                  <span className="text-white/58">{fuelLabels[entry.fuelType]}</span>
                  <span className="font-medium text-white">{entry.price}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-white/58">Quando você tocar em enviar, o pacote entra em revisão com foto e contexto compartilhados.</p>
        </div>
      ) : null}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[1090] px-4 py-3 lg:bottom-4 xl:left-1/2 xl:right-auto xl:w-[min(1120px,calc(100vw-2rem))] xl:-translate-x-1/2 xl:px-0">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 rounded-[24px] border border-white/10 bg-black/92 px-4 py-3 backdrop-blur-md md:backdrop-blur-xl">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/36">Etapa {stageLabel}</p>
            <p className="truncate text-sm text-white/66">{state.error ? state.error : guidedStage === "submit" ? "Confira o pacote e envie." : guidedStage === "price" ? "Preencha um ou varios precos." : "Uma acao por vez."}</p>
          </div>
          <Button type={guidedStage === "submit" ? "submit" : "button"} className="h-14 min-w-[11rem] rounded-full text-sm font-bold" disabled={pending || (guidedStage === "submit" && !canSubmit)} onClick={guidedStage === "submit" ? undefined : handlePrimaryAction}>
            {pending ? "Enviando..." : submitButtonLabel}
          </Button>
        </div>
      </div>
      </form>

      {showFeedback && (
        <ContextualFeedback 
          title="O que aconteceu no envio?"
          onSelect={async (message, tags) => {
            setShowFeedback(false);
            await submitContextualFeedbackAction({
              message,
              tags,
              page_path: window.location.pathname,
              station_id: stationId,
              city: selectedStation?.city || null,
              context_type: 'generic'
            });
          }}
          onCancel={() => setShowFeedback(false)}
        />
      )}

      <div className="fixed bottom-24 right-4 z-40">
        <button
          onClick={() => setShowFeedback(true)}
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 border border-white/10 text-white/40 hover:text-[color:var(--color-accent)] hover:border-[color:var(--color-accent)]/30 transition-all shadow-xl backdrop-blur-md"
          title="Relatar problema ou dúvida"
        >
          <MessageCircleQuestion className="h-5 w-5" />
        </button>
      </div>
    </>
  );
}

export function PriceSubmitForm(props: PriceSubmitFormProps) {
  const [formVersion, setFormVersion] = useState(0);

  return <PriceSubmitFormBody key={`${props.initialStationId ?? "default"}-${formVersion}`} {...props} onResetRequest={() => setFormVersion((value) => value + 1)} />;
}

