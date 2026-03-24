/* eslint-disable @next/next/no-img-element */
"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Camera, ShieldCheck, ArrowRight, Clock3, Trophy, Target, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FuelType, StationWithReports } from "@/lib/types";
import { fuelLabels } from "@/lib/format/labels";
import { submitPriceReportAction } from "@/app/enviar/actions";
import { RouteAssistant } from "@/components/routes/route-assistant";
import { completeStationInRoute, readRouteContext } from "@/lib/navigation/route-context";
import { useGeolocation } from "@/hooks/use-geolocation";
import { calculateDistance, formatDistance } from "@/lib/geo/distance";
import { trackProductEvent } from "@/lib/telemetry/client";
import { clearSubmissionDraft, loadSubmissionDraft, saveSubmissionDraft, type SubmissionDraftSnapshot, type SubmissionDraftStep, type SubmissionDraftStatus } from "@/lib/drafts/submission-draft";
import { SubmissionQueuePanel } from "@/components/forms/submission-queue-panel";
import { buildSubmissionQueueHref, clearSubmissionQueueForDraftKey, loadSubmissionQueue, removeSubmissionQueueEntry, upsertSubmissionQueueEntry, type SubmissionQueueEntry } from "@/lib/queue/submission-queue";
import { useStreetMode } from "@/hooks/use-street-mode";
import { useMissionContext } from "@/components/mission/mission-context";
import { cn } from "@/lib/utils";
import { getStationPublicName } from "@/lib/quality/stations";
import { useSubmissionHistory } from "@/components/history/submission-history-context";
import { analyzePhotoQuality, type PhotoQualityResult } from "@/lib/camera/quality-analyzer";
import { processImageForUpload } from "@/lib/camera/image-processor";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles, MessageCircleQuestion } from "lucide-react";
import { ContextualFeedback } from "@/components/feedback/contextual-feedback";
import { submitContextualFeedbackAction } from "@/app/hub/feedback-actions";
import { consumeHubAttribution } from "@/lib/telemetry/attribution";
import { useMySubmissions } from "@/hooks/use-my-submissions";

const fuelOptions: FuelType[] = ["gasolina_comum", "gasolina_aditivada", "etanol", "diesel_s10", "diesel_comum", "gnv"];
const allowedFuelSet = new Set<FuelType>(fuelOptions);
const initialState = { error: null, errorCode: null, retryable: false, success: false };

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
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftPhotoMissing, setDraftPhotoMissing] = useState(false);
  const [isSuggested, setIsSuggested] = useState(false);
  const [submittedStationId, setSubmittedStationId] = useState<string | null>(null);
  const [queueItems, setQueueItems] = useState<SubmissionQueueEntry[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
          price,
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
      }
    }
  }, [state.success, state.reportId, addSubmission, stations, stationId, fuelType, price, nickname]);
  const [showFeedback, setShowFeedback] = useState(false);
  const selectedFileRef = useRef<File | null>(null);
  const hasStartedRef = useRef(false);
  const completedRef = useRef(false);
  const abandonmentSentRef = useRef(false);
  const currentStepRef = useRef<SubmissionDraftStep | null>(null);
  const telemetryContextRef = useRef({ stationId: stationId || null, fuelType, compactMode, lockedStation });
  const formRef = useRef<HTMLFormElement | null>(null);
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
      }
      if (draft.fuelType && allowedFuelSet.has(draft.fuelType)) {
        setFuelType(draft.fuelType);
      }
      if (typeof draft.price === "string") {
        setPrice(draft.price);
      }
      if (typeof draft.nickname === "string") {
        setNickname(draft.nickname);
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
  const ambiguityTrackedRef = useRef<string | null>(null);
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
  }, [draftKey, draftPhotoMissing, fuelType, nickname, price, safeReturnToHref, selectedStation, stationId, stations]);

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
    completedRef.current = false;
    abandonmentSentRef.current = false;
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
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      selectedFileRef.current = null;
      setPreviewUrl(null);
      setQualityResult(null);
      return;
    }

    setIsProcessingPhoto(true);
    setQualityResult(null);

    try {
      // 1. Processar/Comprimir
      const processed = await processImageForUpload(nextFile);
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
  const retryableError = state.error && state.retryable;
  const statusLabel = previewUrl ? "foto pronta" : selectedStation ? "posto pronto" : "comece pela foto";

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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onResetRequest();
    }
    await refreshQueueItems();
  }

  return (
    <>
    <form
      ref={formRef}
      action={formAction}
      className={cn("space-y-4", state.success && "hidden")}
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
                <p className="text-[10px] font-medium text-[color:var(--color-accent)]">📍 Sugerido por proximidade</p>
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
                <h3 className="mt-2 text-xl font-semibold text-white">Foto primeiro, resto rápido.</h3>
                <p className="mt-1 text-sm text-white/62">Abra a câmera, tire a prova e complete o envio com o mínimo de toque possível.</p>
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
              fileInputRef.current?.click();
            }}
            className={cn("w-full sm:w-auto", isStreetMode && "h-16 text-lg font-bold shadow-2xl")}
          >
            {isStreetMode ? "ABRIR CÂMERA AGORA" : "Tirar foto agora"}
          </Button>
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
              fileInputRef.current?.click();
            }}
            className="w-full sm:w-auto"
          >
            Abrir câmera
          </Button>
        </div>
        {draftRestored ? (
          <div className="mt-3 rounded-[18px] border border-white/8 bg-black/30 p-3 text-sm text-white/66">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-white">Continuar envio salvo</p>
              <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                {draftPhotoMissing ? "Refazer foto" : "Continuar"}
              </Button>
            </div>
            <p className="mt-1 text-white/54">Os dados que já estavam preenchidos voltaram. Se a foto não veio junto, tire outra antes de enviar.</p>
          </div>
        ) : null}
        {!isStreetMode && <p className="mt-3 text-xs leading-relaxed text-white/52">Se a conexão cair, os campos continuam na tela. Se a foto falhar, tente de novo sem refazer tudo.</p>}
      </div>

      {queueItems.length > 0 ? (
        <SubmissionQueuePanel
          items={queueItems}
          online={isOnline}
          onRetry={handleRetryQueueItem}
          onReview={handleReviewQueueItem}
          onDiscard={handleDiscardQueueItem}
        />
      ) : null}

      {state.success ? (
        <div className={cn("rounded-[24px] border border-green-400/20 bg-green-400/10 p-5 text-sm text-white", isStreetMode && "p-4")}>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-green-500/20 p-2">
              <ShieldCheck className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-lg font-bold">Show! Preço enviado.</p>
              <p className="text-white/60">Já está na fila prioritária de moderação.</p>
            </div>
          </div>
          
          <div className="mt-6 space-y-3">
            {mission && mission.currentIndex + 1 < mission.stationIds.length ? (() => {
               const nextId = mission.stationIds[mission.currentIndex + 1];
               const nextS = stations.find(s => s.id === nextId);
               return (
                 <Button
                    type="button"
                    className="w-full h-16 text-lg font-black bg-yellow-400 text-black border-4 border-black/10 shadow-[0_10px_40px_rgba(255,212,0,0.3)]"
                    onClick={() => {
                      if (submittedStationId) {
                        nextStation(submittedStationId);
                      } else {
                        nextStation();
                      }
                      router.push((`/enviar?stationId=${nextId}#photo` as Route));
                    }}
                  >
                    IR PARA O PRÓXIMO ALVO: {nextS ? getStationPublicName(nextS).toUpperCase() : "PRÓXIMO"}
                  </Button>
               );
            })() : (
              <Button
                type="button"
                className="w-full h-16 text-lg font-bold shadow-lg"
                onClick={() => {
                  void trackProductEvent({
                    eventType: "submission_series_continued",
                    pagePath: "/enviar",
                    pageTitle: "Enviar preço",
                    stationId: submittedStationId,
                    fuelType,
                    scopeType: "submission",
                    scopeId: submittedStationId,
                    payload: { mode: "same_station", streetMode: isStreetMode }
                  });
                  void resetForAnotherSubmission();
                }}
              >
                ENVIAR OUTRO NESTE POSTO
              </Button>
            )}
            
            {(() => {
              const route = readRouteContext();
              const nextStationIdInRoute = route?.completedStationIds ? stations.find(s => !route.completedStationIds.includes(s.id) && s.id !== submittedStationId)?.id : null;

              if (nextStationIdInRoute && nextStationIdInRoute !== submittedStationId && !mission) {
                const ns = stations.find(s => s.id === nextStationIdInRoute);
                return (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full h-14 font-semibold"
                    onClick={() => {
                       if (submittedStationId) {
                         completeStationInRoute(submittedStationId);
                       }
                       router.push((`/enviar?stationId=${nextStationIdInRoute}#photo` as Route));
                    }}
                  >
                    IR PARA: {ns ? getStationPublicName(ns) : "PRÓXIMO POSTO"}
                  </Button>
                );
              }
              return null;
            })()}

            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="ghost" 
                className="flex-1 h-12"
                onClick={() => {
                  if (mission && submittedStationId) {
                    nextStation(submittedStationId);
                  } else if (mission) {
                    nextStation();
                  }
                  router.push((safeReturnToHref ?? "/") as Route);
                }}
              >
                Voltar ao mapa
              </Button>
              {submittedStationId && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="flex-1 h-12"
                  onClick={() => router.push((`/postos/${submittedStationId}` as Route))}
                >
                  Ver posto
                </Button>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="mb-3 text-[10px] uppercase tracking-widest text-white/40 text-center">Rota de Coleta</p>
            <RouteAssistant stations={stations} currentStationId={submittedStationId} />
          </div>
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
              <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                Reabrir câmera
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2" id="photo">
        <label className="text-sm font-medium text-white" htmlFor="photo-input">
          Foto
        </label>
        <input
          id="photo-input"
          name="photo"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
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

      {previewUrl && !isProcessingPhoto ? (
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
            
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 rounded-full border-white/10 bg-white/10 px-3 text-[10px] font-bold text-white backdrop-blur-md hover:bg-white/20"
            >
              REFAZER FOTO
            </Button>
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

      <div className="space-y-2 rounded-[22px] border border-white/8 bg-black/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-white" htmlFor="stationId">
            Posto
          </label>
          {compactMode ? <Badge variant="outline">Travado pelo contexto</Badge> : <Badge variant="outline">Escolha o posto</Badge>}
        </div>
        {lockedStation ? (
          <>
            <input type="hidden" name="stationId" value={stationId} />
            <div className={cn(
              "rounded-[18px] border bg-white/5 px-4 py-3 text-sm text-white/72 transition-all",
              validationErrors.stationId ? "border-red-500/50 bg-red-500/5" : "border-white/8"
            )}>
              <p className="font-medium text-white">{selectedStation?.name}</p>
              <p className="mt-1 text-white/54">{selectedStation?.neighborhood}, {selectedStation?.city}</p>
              {selectedStation?.address && !isStreetMode ? <p className="mt-1 text-xs text-white/42">{selectedStation.address}</p> : null}
            </div>
          </>
        ) : (
          <select
            id="stationId"
            name="stationId"
            value={stationId}
            onFocus={() => handleFieldFocus("stationId")}
            onChange={(event) => {
              setStationId(event.target.value);
              setValidationErrors(prev => ({ ...prev, stationId: undefined }));
              markStarted("station", { changed: true });
            }}
            className={cn(
              "w-full rounded-[18px] border bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0 transition-all",
              validationErrors.stationId ? "border-red-500/50 ring-1 ring-red-500/20" : "border-white/10"
            )}
          >
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name} - {station.neighborhood}, {station.city}
              </option>
            ))}
          </select>
        )}
        {validationErrors.stationId && <p className="mt-1.5 px-1 text-[10px] font-bold uppercase text-red-400 tracking-wider transition-all animate-in fade-in slide-in-from-top-1">{validationErrors.stationId}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 rounded-[22px] border border-white/8 bg-black/30 p-4">
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

        <div className="space-y-2 rounded-[22px] border border-white/8 bg-black/30 p-4">
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

      <Button type="submit" className={cn("w-full h-16 text-lg font-bold shadow-2xl", !canSubmit && "opacity-50")} disabled={pending || !canSubmit}>
        {pending ? "Enviando..." : `Enviar preço ${statusLabel === "foto pronta" ? "com foto pronta" : "agora"}`}
      </Button>
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
