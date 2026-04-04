/* eslint-disable @next/next/no-img-element */
"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ChangeEvent } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Camera, ShieldCheck, ArrowRight, Clock3, Trophy, Target, Zap, Search, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FuelType, StationWithReports } from "@/lib/types";
import { fuelLabels } from "@/lib/format/labels";
import { submitPriceReportAction, type SubmitState } from "@/app/enviar/actions";
import { completeStationInRoute, readRouteContext } from "@/lib/navigation/route-context";
import { useGeolocation } from "@/hooks/use-geolocation";
import { calculateDistance, formatDistance } from "@/lib/geo/distance";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel } from "@/lib/format/time";
import { trackProductEvent } from "@/lib/telemetry/client";
import { clearSubmissionDraft, loadSubmissionDraft, saveSubmissionDraft, type SubmissionDraftSnapshot, type SubmissionDraftStep, type SubmissionDraftStatus } from "@/lib/drafts/submission-draft";
import { buildSubmissionQueueHref, clearSubmissionQueueForDraftKey, loadSubmissionQueue, removeSubmissionQueueEntry, upsertSubmissionQueueEntry, type SubmissionQueueEntry } from "@/lib/queue/submission-queue";
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
import { persistProgressiveIdentityNickname } from "@/lib/identity/progressive";
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
const fuelOptions: FuelType[] = ["gasolina_comum", "gasolina_aditivada", "etanol", "diesel_s10", "diesel_comum", "gnv"];
const allowedFuelSet = new Set<FuelType>(fuelOptions);
const initialState: SubmitState = { error: null, errorCode: null, retryable: false, success: false, noticeTitle: null, noticeBody: null, noticeTone: null, noticeCode: null };

interface PriceSubmitFormProps {
  stations: StationWithReports[];
  initialStationId?: string;
  initialFuelType?: FuelType;
  returnToHref?: string;
}

function safeRoute(value?: string): Route | null {
  return value && value.startsWith("/") ? (value as Route) : null;
}

function createDraftKey(initialStationId?: string) {
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
  const normalized = normalizeContextValue(query);
  if (!normalized) return 0;

  const tokens = normalized.split(/\s+/g).filter(Boolean);
  if (tokens.length === 0) return 0;

  const searchable = candidate.searchText;
  if (!tokens.every((token) => searchable.includes(token))) {
    return 0;
  }

  let score = 0;
  if (normalizeContextValue(candidate.publicName).startsWith(normalized)) score += 120;
  if (searchable.includes(normalized)) score += 60;
  if (normalizeContextValue(candidate.neighborhoodLabel).includes(normalized)) score += 24;
  if (normalizeContextValue(candidate.addressShort).includes(normalized)) score += 18;
  if (candidate.brandLabel && normalizeContextValue(candidate.brandLabel).includes(normalized)) score += 16;
  score += Math.max(0, 24 - candidate.recentIndex * 3);
  score += candidate.visibilityRank * 8;
  score += candidate.geoRank * 6;
  if (candidate.distance !== null) {
    score += Math.max(0, 30 - Math.round(candidate.distance / 200));
  }

  return score;
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
  const draftKey = useMemo(() => createDraftKey(initialStationId), [initialStationId]);

  const initialStation = useMemo(() => stations.find((station) => station.id === initialStationId) ?? null, [initialStationId, stations]);
  const lockedStation = Boolean(initialStation);
  const compactMode = lockedStation;
  const defaultStationId = useMemo(() => initialStation?.id ?? stations[0]?.id ?? "", [initialStation, stations]);
  const defaultFuelType: FuelType = initialFuelType && allowedFuelSet.has(initialFuelType) ? initialFuelType : "gasolina_comum";

  const [stationId, setStationId] = useState(defaultStationId);
  const [fuelType, setFuelType] = useState<FuelType>(defaultFuelType);
  const [price, setPrice] = useState("");
  const [nickname, setNickname] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stationSearch, setStationSearch] = useState("");
  const [homeContextSnapshot, setHomeContextSnapshot] = useState<ReturnType<typeof readHomeContext>>({});
  const [lastStationSnapshot, setLastStationSnapshot] = useState<ReturnType<typeof readLastStationContext>>(() => null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftPhotoMissing, setDraftPhotoMissing] = useState(false);
  const [isSuggested, setIsSuggested] = useState(false);
  const [stationConfirmed, setStationConfirmed] = useState(Boolean(lockedStation));
  const [fuelConfirmed, setFuelConfirmed] = useState(false);
  const [priceReviewed, setPriceReviewed] = useState(false);
  const [submittedStationId, setSubmittedStationId] = useState<string | null>(null);
  const [queueItems, setQueueItems] = useState<SubmissionQueueEntry[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [showStationPicker, setShowStationPicker] = useState(true);
  const [showFuelPicker, setShowFuelPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const priceInputRef = useRef<HTMLInputElement | null>(null);

  // Record history on success
  useEffect(() => {
    if (state.success && state.reportId) {
      const station = stations.find(s => s.id === stationId);
      if (station) {
        addSubmission({
          reportId: state.reportId,
          stationId: station.id,
          stationName: getStationPublicName(station),
          fuelType,
          price: String(Number(price.replace(",", ".")) || 0),
          status: "pending",
          submittedAt: new Date().toISOString(),
          reporterNickname: nickname || null
        });

        // Activation Milestone (Iniciante -> Ativo)
        if (submissions.length === 0) {
          void trackProductEvent({
            eventType: "first_submission_milestone" as any,
            pagePath: "/enviar",
            pageTitle: "Enviar preço",
            stationId: station.id,
            fuelType,
            payload: { source: "activation_funnel" }
          });
        }

        // Hub Conversion Tracking
        if (consumeHubAttribution()) {
          void trackProductEvent({
            eventType: "hub_conversion_success",
            pagePath: "/enviar",
            pageTitle: "Enviar preço",
            stationId: station.id,
            fuelType,
            payload: { 
              reportId: state.reportId,
              source: "hub"
            }
          });
        }

        // Sessão de Rua: Concluir envio
        recordActivity('complete', station.id);

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
              reviewReason: state.noticeCode
            }
          });
        }
      }
    }
  }, [state.success, state.reportId, state.noticeCode, state.noticeTitle, state.noticeTone, addSubmission, stations, stationId, fuelType, price, nickname, recordActivity, submissions.length]);
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
  const fuelSuggestionTrackedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const completedRef = useRef(false);
  const abandonmentSentRef = useRef(false);
  const currentStepRef = useRef<SubmissionDraftStep | null>(null);
  const telemetryContextRef = useRef({ stationId: stationId || null, fuelType, compactMode, lockedStation });
  const formRef = useRef<HTMLFormElement | null>(null);
  const stationSearchInputRef = useRef<HTMLInputElement | null>(null);
  const fuelSelectRef = useRef<HTMLSelectElement | null>(null);
  const restoredDraftTrackedRef = useRef(false);
  const lastFailureKeyRef = useRef<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [qualityResult, setQualityResult] = useState<PhotoQualityResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    stationId?: string;
    fuelType?: string;
    price?: string;
    photo?: string;
  }>({});
  const lastFieldRef = useRef<string | null>(null);
  const retryAttemptRef = useRef(0);
  const lastQueuedFailureSignatureRef = useRef<string | null>(null);
  const lastQueuedAbandonmentSignatureRef = useRef<string | null>(null);

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
    let active = true;

    void (async () => {
      try {
        const draft = await loadSubmissionDraft(draftKey);
        if (!active || !draft) {
          setDraftLoaded(true);
          return;
        }


      if (draft.stationId && stations.some((station) => station.id === draft.stationId)) {
        setStationId(draft.stationId);
        setStationConfirmed(true);
      }
      if (draft.fuelType && allowedFuelSet.has(draft.fuelType)) {
        setFuelType(draft.fuelType);
        setFuelConfirmed(true);
      }
      if (typeof draft.price === "string") {
        setPrice(draft.price);
        setPriceReviewed(draft.lastStep === "submit");
      }
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
        const objectUrl = URL.createObjectURL(restoredFile);
        setPreviewUrl(objectUrl);
        setDraftPhotoMissing(false);
      } else if (isPhotoMetadataPresent(draft)) {
        setDraftPhotoMissing(true);
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
            lockedStation
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
    if (initialStation) {
      setStationId(initialStation.id);
      setStationConfirmed(true);
      return;
    }

    if (!stationId && stations[0]) {
      setStationId(stations[0].id);
    }
  }, [initialStation, stationId, stations]);

  const { coords, getLocation } = useGeolocation();
  const [geoRequested, setGeoRequested] = useState(false);

  useEffect(() => {
    if (!coords || lockedStation || initialStation || draftRestored || geoRequested) return;

    // Limit to 500m radius for suggestions
    const MAX_SUGGESTION_DISTANCE_METERS = 500;
    
    let nearest: { id: string, distance: number } | null = null;

    for (const s of stations) {
      const dist = calculateDistance(coords.lat, coords.lng, s.lat, s.lng);
      if (dist <= MAX_SUGGESTION_DISTANCE_METERS) {
        if (!nearest || dist < nearest.distance) {
          nearest = { id: s.id, distance: dist };
        }
      }
    }

    if (nearest) {
      setStationId(nearest.id);
      setIsSuggested(true);
      setGeoRequested(true);
    }
  }, [coords, lockedStation, initialStation, draftRestored, stations, geoRequested]);


  useEffect(() => {
    if (!draftLoaded || completedRef.current) {
      return;
    }

    const status: SubmissionDraftStatus = pending ? "submitting" : state.error ? "failed" : "in_progress";
    const snapshot = buildDraftSnapshot({
      key: draftKey,
      stationId,
      fuelType,
      price,
      nickname,
      lastStep: currentStepRef.current ?? "photo",
      status,
      photo: selectedFileRef.current
    });

    void saveSubmissionDraft(snapshot).catch(() => undefined);
  }, [draftKey, draftLoaded, fuelType, nickname, pending, price, stationId, state.error]);

  const currentQueueItem = queueItems.find((item) => item.draftKey === draftKey) ?? null;
  const selectedStation = stations.find((station) => station.id === stationId) ?? stations[0] ?? null;

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
    setFuelType(nextFuel);
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
    if (!coords || !selectedStation) return { currentDistance: null, locationConfidence: "none", isAmbiguous: false, closestStationId: null };
    
    let closestId: string | null = null;
    let minDistance = Infinity;
    let nearbyInCluster = 0;

    for (const s of stations) {
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
    const confidence = dist <= 200 ? "high" : "low" as "none" | "high" | "low";
    
    // Ambiguidade se houver outro posto muito perto do selecionado e o usuário estiver na área
    const ambiguous = nearbyInCluster > 0 && (closestId !== selectedStation.id || minDistance > 30);

    return { 
      currentDistance: dist, 
      locationConfidence: confidence, 
      isAmbiguous: ambiguous,
      closestStationId: closestId
    };
  }, [coords, selectedStation, stations]);

  const nearbyStationsList = useMemo(() => {
    if (!coords) return [];
    return stations
      .map(s => ({ ...s, distance: calculateDistance(coords.lat, coords.lng, s.lat, s.lng) }))
      .filter(s => (s.distance || 0) <= 2000)
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [coords, stations]);

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
      const neighborhoodLabel = station.neighborhood?.trim() || "Bairro nao informado";
      const brandLabel = station.distributorName?.trim() || station.brand?.trim() || null;
      const hasReliableCoordinate = isValidStationCoordinate(station.lat, station.lng);
      const distance = coords && hasReliableCoordinate ? calculateDistance(coords.lat, coords.lng, station.lat, station.lng) : null;
      const ambiguityCount = publicNameCounts.get(getStationAmbiguityKey(station, publicName)) ?? 1;
      const recentIndex = recentStationIds.indexOf(station.id);

      return {
        station,
        publicName,
        neighborhoodLabel,
        addressShort,
        brandLabel,
        searchText: normalizeContextValue([publicName, neighborhoodLabel, addressShort, station.city, station.brand, station.distributorName].filter(Boolean).join(" ")),
        distance,
        recentIndex: recentIndex >= 0 ? recentIndex : 999,
        visibilityRank: getStationVisibilityRank(station),
        geoRank: getStationGeoRank(station),
        ambiguityCount,
        cityContextMatch: Boolean(cityContext) && normalizeContextValue(station.city).includes(cityContext),
        hasReliableCoordinate
      };
    }).sort(compareStationCandidates);
  }, [coords, homeContextSnapshot.city, recentStationIds, stations]);

  useEffect(() => {
    if (lockedStation || draftRestored || stationSuggestionTrackedRef.current || stationCandidates.length === 0) {
      return;
    }

    const suggestedStation = stationCandidates[0];
    if (!suggestedStation || suggestedStation.station.id === stationId) {
      return;
    }

    const suggestionSource = suggestedStation.distance !== null && suggestedStation.geoRank >= 2
      ? "nearby"
      : suggestedStation.recentIndex < 999
        ? "recent"
        : "fallback";
    const suggestionKey = [draftKey, suggestedStation.station.id, suggestionSource, suggestedStation.distance !== null ? "geo" : "no-geo"].join(":");

    stationSuggestionTrackedRef.current = true;
    submissionAutoDecisionCountRef.current += 1;
    suggestedStationIdRef.current = suggestedStation.station.id;
    setStationId(suggestedStation.station.id);
    setIsSuggested(Boolean(suggestedStation.distance !== null));
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
        source: suggestionSource === "nearby" ? "geo_recent_rank" : suggestionSource,
        distance: suggestedStation.distance,
        geoReviewStatus: suggestedStation.station.geoReviewStatus ?? null,
        visibilityRank: suggestedStation.visibilityRank,
        decisionsSkipped: submissionAutoDecisionCountRef.current
      }
    });
  }, [coords, draftKey, draftRestored, fuelType, lockedStation, stationCandidates, stationId]);

  const normalizedStationSearch = useMemo(() => normalizeContextValue(stationSearch), [stationSearch]);

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
    if (isAmbiguous && !lockedStation && coords && ambiguityTrackedRef.current !== stationId) {
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
  }, [isAmbiguous, lockedStation, coords, stationId, selectedStation, fuelType, currentDistance, closestStationId, compactMode]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    completedRef.current = true;
    setSubmittedStationId(stationId);
    setPrice("");
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
  }, [currentQueueItem, draftKey, router, state.success, stationId]);

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

      const queuedSignature = [draftKey, "abandonment", hasPhoto ? "photo" : "no-photo", price.trim(), fuelType, stationId || ""].join(":");
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
  }, [draftKey, draftPhotoMissing, fuelType, nickname, price, safeReturnToHref, selectedStation, stationConfirmed, locationConfidence, stationId, stations]);

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
    if (!state.error || !draftLoaded) {
      return;
    }

    const shouldQueue = state.retryable || state.errorCode === "photo_missing" || state.errorCode === "network_offline" || state.errorCode === "network_timeout" || state.errorCode === "upload_failed" || state.errorCode === "upload_interrupted";
    if (!shouldQueue) {
      return;
    }

    const queuedSignature = [draftKey, state.errorCode ?? "error", state.retryable ? "retryable" : "final", Boolean(selectedFileRef.current) ? "photo" : "no-photo", price.trim(), fuelType, stationId || ""].join(":");
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
    setValidationErrors((prev) => ({ ...prev, photo: undefined }));

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
      
      if (priceInputRef.current) {
        priceInputRef.current.focus();
      }
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
    
    // Suporte a 3 casas decimais (padrão posto: 5.699)
    const num = parseInt(digits, 10);
    const formatted = (num / 1000).toLocaleString("pt-BR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
    return formatted;
  }

  function handlePriceChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const formatted = formatPrice(raw);
    setPrice(formatted);
    setPriceReviewed(false);

    // Clear error on change
    if (validationErrors.price) {
      setValidationErrors(prev => ({ ...prev, price: undefined }));
    }
  }
  function handleFieldFocus(fieldName: string) {
    lastFieldRef.current = fieldName;
  }

  function validateForm() {
    const errors: typeof validationErrors = {};
    if (!stationId) errors.stationId = "Selecione um posto.";
    if (!fuelType) errors.fuelType = "Selecione o combustível.";
    
    // Validação de preço: deve ter pelo menos 5 chars (ex: 5,699)
    if (!price || price.length < 5) {
      errors.price = "Informe um preço válido (ex: 5,699).";
    }
    
    if (!selectedFileRef.current) {
      errors.photo = "A foto é obrigatória para o envio de rua.";
    }
    
    setValidationErrors(errors);
    
    // Telemetry for validation errors
    Object.entries(errors).forEach(([field, message]) => {
      void trackProductEvent({
        eventType: "submission_validation_error" as any,
        pagePath: "/enviar",
        payload: { field, message, price, fuelType }
      });
    });
    
    return Object.keys(errors).length === 0;
  }

  const canSubmit = Boolean(selectedStation && selectedFileRef.current && price.trim() && fuelType);
  const hasPhoto = Boolean(previewUrl);
  const retryableError = state.error && state.retryable;
  const guidedStage: SubmissionDraftStep = !hasPhoto ? "photo" : !stationConfirmed ? "station" : !fuelConfirmed ? "fuel" : !price.trim() ? "price" : !priceReviewed ? "price" : "submit";
  const stageLabel = {
    photo: "Foto",
    station: "Posto",
    fuel: "Combustível",
    price: "Preço",
    submit: "Revisão"
  }[guidedStage];
  const submitButtonLabel =
    guidedStage === "photo"
      ? "Abrir câmera"
      : guidedStage === "station"
        ? "Confirmar posto"
        : guidedStage === "fuel"
          ? "Confirmar combustível"
          : guidedStage === "price"
            ? "Ver revisão"
            : "Enviar preço";

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
      setPrice("");
      setNickname("");
      setPreviewUrl(null);
      selectedFileRef.current = null;
      setDraftRestored(false);
      setDraftPhotoMissing(false);
      setStationConfirmed(false);
      setFuelConfirmed(false);
      setPriceReviewed(false);
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

    setStationId(candidate.station.id);
    setStationSearch("");
    setValidationErrors((prev) => ({ ...prev, stationId: undefined }));
    setIsSuggested(source === "nearby" && candidate.distance !== null);
    setStationConfirmed(true);
    setFuelConfirmed(false);
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
              <p className="truncate text-sm font-semibold text-white">{candidate.publicName}</p>
              {isSelected ? <Badge variant="default">Escolhido</Badge> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/66">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/78">{brandLabel}</span>
              <span className="truncate">{streetLabel}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/54">
              <Badge variant={sourceBadge.variant}>{sourceBadge.label}</Badge>
              {candidate.distance !== null ? <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 font-semibold text-white/72">{formatDistance(candidate.distance)}</span> : null}
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

    if (guidedStage === "fuel") {
      setFuelConfirmed(true);
      markStarted("fuel", {
        confirmed: true,
        source: "guided_footer"
      });
      return;
    }

    if (guidedStage === "price") {
      if (!price.trim()) {
        priceInputRef.current?.focus();
        return;
      }

      setPriceReviewed(true);
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
            {!coords && !lockedStation && (
              <Button 
                type="button" 
                variant="ghost" 
                className="h-6 px-2 text-[10px]"
                onClick={() => getLocation()}
              >
                Ativar GPS
              </Button>
            )}
            {locationConfidence === "low" && (
              <div className={cn("mt-2 rounded-lg border border-orange-400/20 bg-orange-400/10 px-3 py-2 text-[11px] text-orange-200", isStreetMode && "mt-1")}>
                ⚠️ <strong>Posto distante:</strong> Você está a {formatDistance(currentDistance!)} daqui.
              </div>
            )}
            {isAmbiguous && !lockedStation && (
              <div className={cn("mt-2 rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-[11px] text-yellow-200", isStreetMode && "mt-1")}>
                ✨ <strong>Confirme o posto:</strong> Há outros postos muito próximos aqui. Verifique se escolheu o correto.
              </div>
            )}
            {!isStreetMode && (
              <>
                <h3 className="mt-2 text-xl font-semibold text-white">{isFirstSendFlow ? "Foto primeiro. O resto é guiado." : "Foto primeiro, resto rápido."}</h3>
                <p className="mt-1 text-sm text-white/62">{isFirstSendFlow ? "Tire a foto. O posto e o combustível entram sozinhos quando der." : "Abra a câmera, tire a prova e complete o envio com o mínimo de toque possível."}</p>
              </>
            )}
          </div>
          <Badge variant={state.success ? "accent" : "warning"}>{state.success ? "Enviado" : isStreetMode ? "Compacto" : "Rápido"}</Badge>
        </div>
        {!isStreetMode && (
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/52">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">1. Foto</span>
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
        <div className={`rounded-[18px] border px-4 py-3 text-sm ${retryableError ? "border-[color:var(--color-accent)]/24 bg-[color:var(--color-accent)]/10 text-white" : "border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)]"}`}>
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

      <div className={cn("space-y-2", guidedStage !== "photo" && "hidden")} id="photo">
        <label className="text-sm font-medium text-white" htmlFor="photo-input">
          Foto
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
          onFocus={() => handleFieldFocus("photo")}
          onChange={(e) => {
            setValidationErrors(prev => ({ ...prev, photo: undefined }));
            handleFileChange(e);
          }}
          className={cn(
            "w-full rounded-[18px] border border-dashed px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--color-accent)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black transition-all",
            validationErrors.photo ? "border-red-500/50 bg-red-500/5" : "border-white/14 bg-black/30"
          )}
        />
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
              <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]/72">Posto sugerido</p>
              <p className="truncate text-sm font-semibold text-white">{getStationPublicName(selectedStation)}</p>
              <p className="mt-1 text-xs text-white/62">{selectedStation.neighborhood} · {shortAddress(selectedStation.address) || selectedStation.city}</p>
            </div>
            <Button type="button" variant="secondary" className="shrink-0" onClick={() => { setStationConfirmed(false); setShowStationPicker(true); }}>

              Trocar

            </Button>
          </div>
        </div>
      ) : null}
      <div className={cn("space-y-3 rounded-[22px] border border-white/8 bg-black/30 p-4", guidedStage !== "station" && "hidden") }>
        <input type="hidden" name="stationId" value={stationId} />
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-white" htmlFor="station-search">
            Posto
          </label>
          {compactMode ? <Badge variant="outline">Travado pelo contexto</Badge> : <Badge variant="outline">Proximidade e contexto</Badge>}
        </div>
        {lockedStation ? (
          <div className={cn(
            "rounded-[18px] border bg-white/5 px-4 py-3 text-sm text-white/72 transition-all",
            validationErrors.stationId ? "border-red-500/50 bg-red-500/5" : "border-white/8"
          )}>
            <p className="font-medium text-white">{selectedStation ? getStationPublicName(selectedStation) : "Posto"}</p>
            <p className="mt-1 text-white/54">{selectedStation?.neighborhood}, {selectedStation?.city}</p>
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
                    "h-12 w-full rounded-[18px] border bg-black/30 pl-11 pr-4 text-sm text-white outline-none transition",
                    validationErrors.stationId ? "border-red-500/50 ring-1 ring-red-500/20" : "border-white/10"
                  )}
                />
              </div>
              {!coords ? (
                <Button type="button" variant="secondary" className="h-12 px-4 text-xs uppercase tracking-[0.18em]" onClick={() => getLocation()}>
                  Ver mais proximos
                </Button>
              ) : null}
            </div>

            {selectedStation ? (
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
                      {coords && isValidStationCoordinate(selectedStation.lat, selectedStation.lng) ? <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">{formatDistance(calculateDistance(coords.lat, coords.lng, selectedStation.lat, selectedStation.lng))}</span> : null}
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
                  <button type="button" className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white/82" onClick={() => { setStationConfirmed(false); setShowStationPicker(true); }}>
                    Trocar por parecido
                  </button>
                </div>
              </div>
            ) : null}

            {!normalizedStationSearch ? (
              <div className="space-y-4">
                {coords ? (
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

      <div className="grid gap-3 sm:grid-cols-2">
        {guidedStage !== "fuel" ? (
          <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/42">Combustível sugerido</p>
                <p className="mt-1 truncate text-sm font-semibold text-white">{fuelLabels[fuelType]}</p>
              </div>
              <Button type="button" variant="secondary" className="shrink-0" onClick={() => { setShowFuelPicker(true); setFuelConfirmed(false); }} >

                Trocar

              </Button>
            </div>
          </div>
        ) : null}
        <div className={cn("space-y-2 rounded-[22px] border border-white/8 bg-black/30 p-4", guidedStage !== "fuel" && "hidden")}>
          <label className="text-sm font-medium text-white" htmlFor="fuelType">
            Combustível
          </label>
          <select
            id="fuelType"
            name="fuelType"
            value={fuelType}
            onFocus={() => handleFieldFocus("fuelType")}
            onChange={(event) => {
              setFuelType(event.target.value as FuelType);
              setValidationErrors(prev => ({ ...prev, fuelType: undefined }));
              markStarted("fuel", { fuelType: event.target.value });
            }}
            className={cn(
               "w-full rounded-[18px] border bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0 transition-all",
               validationErrors.fuelType ? "border-red-500/50 ring-1 ring-red-500/20" : "border-white/10"
            )}
          >
            {fuelOptions.map((option) => (
              <option key={option} value={option}>
                {fuelLabels[option]}
              </option>
            ))}
          </select>
          {validationErrors.fuelType && <p className="mt-1.5 px-1 text-[10px] font-bold uppercase text-red-400 tracking-wider animate-in fade-in slide-in-from-top-1">{validationErrors.fuelType}</p>}
        </div>


      {guidedStage !== "price" && price ? (
        <div className="rounded-[22px] border border-white/10 bg-black/25 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/42">Preço</p>
              <p className="text-sm font-semibold text-white">{price}</p>
              <p className="mt-1 text-xs text-white/52">Falta só revisar antes de enviar.</p>
            </div>
            <Button type="button" variant="secondary" className="shrink-0" onClick={() => { setPriceReviewed(false); priceInputRef.current?.focus(); }}>
              Editar
            </Button>
          </div>
        </div>
      ) : null}        <div className={cn("space-y-2 rounded-[22px] border border-white/8 bg-black/30 p-4", guidedStage !== "price" && "hidden")}>
          <label className="text-sm font-medium text-white" htmlFor="price">
            Preço
          </label>
          <input
            id="price"
            name="price"
            ref={priceInputRef}
            type="text"
            inputMode="numeric"
            value={price}
            onFocus={() => handleFieldFocus("price")}
            onChange={handlePriceChange}
            placeholder="0,000"
            className={cn(
              "w-full rounded-[18px] border bg-black/30 px-4 py-3 text-lg font-bold text-[color:var(--color-accent)] outline-none ring-0 transition-all placeholder:text-white/10",
              validationErrors.price ? "border-red-500/50 ring-1 ring-red-500/20" : "border-white/10"
            )}
          />
          {validationErrors.price && <p className="mt-1 px-1 text-[10px] font-bold uppercase text-red-400 tracking-wider animate-in fade-in slide-in-from-top-1">{validationErrors.price}</p>}
        </div>
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
                markStarted("nickname", { hasValue: event.target.value.trim().length > 0 });
              }}
              placeholder="Ex.: Morador VR"
              className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0"
            />
          </div>
        </details>
      )}

      {guidedStage === "submit" ? (
        <div className="rounded-[22px] border border-[color:var(--color-accent)]/18 bg-[color:var(--color-accent)]/8 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-accent)]/72">Revisão final</p>
          <p className="mt-2 text-sm font-semibold text-white">Confirme antes de enviar.</p>
          <div className="mt-4 space-y-2 text-sm text-white/72">
            <div className="flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
              <span className="text-white/48">Posto</span>
              <span className="truncate text-right font-medium text-white">{selectedStation ? getStationPublicName(selectedStation) : "Posto"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
              <span className="text-white/48">Combustível</span>
              <span className="truncate text-right font-medium text-white">{fuelLabels[fuelType]}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
              <span className="text-white/48">Preço</span>
              <span className="truncate text-right font-medium text-white">{price}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/58">Quando você tocar em enviar, o preço entra em revisão.</p>
        </div>
      ) : null}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[1090] px-4 py-3 lg:bottom-4 xl:left-1/2 xl:right-auto xl:w-[min(1120px,calc(100vw-2rem))] xl:-translate-x-1/2 xl:px-0">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 rounded-[24px] border border-white/10 bg-black/92 px-4 py-3 backdrop-blur-md md:backdrop-blur-xl">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/36">Etapa {stageLabel}</p>
            <p className="truncate text-sm text-white/66">{guidedStage === "submit" ? "Confira e envie." : "Uma ação por vez."}</p>
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







































