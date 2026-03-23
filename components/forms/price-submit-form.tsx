/* eslint-disable @next/next/no-img-element */
"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FuelType, StationWithReports } from "@/lib/types";
import { fuelLabels } from "@/lib/format/labels";
import { submitPriceReportAction } from "@/app/enviar/actions";
import { RouteAssistant } from "@/components/routes/route-assistant";
import { completeStationInRoute, readRouteContext } from "@/lib/navigation/route-context";
import { trackProductEvent } from "@/lib/telemetry/client";
import { clearSubmissionDraft, loadSubmissionDraft, saveSubmissionDraft, type SubmissionDraftSnapshot, type SubmissionDraftStep, type SubmissionDraftStatus } from "@/lib/drafts/submission-draft";
import { SubmissionQueuePanel } from "@/components/forms/submission-queue-panel";
import { buildSubmissionQueueHref, clearSubmissionQueueForDraftKey, loadSubmissionQueue, removeSubmissionQueueEntry, upsertSubmissionQueueEntry, type SubmissionQueueEntry } from "@/lib/queue/submission-queue";

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
  const [submittedStationId, setSubmittedStationId] = useState<string | null>(null);
  const [queueItems, setQueueItems] = useState<SubmissionQueueEntry[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const priceInputRef = useRef<HTMLInputElement | null>(null);
  const selectedFileRef = useRef<File | null>(null);
  const hasStartedRef = useRef(false);
  const completedRef = useRef(false);
  const abandonmentSentRef = useRef(false);
  const currentStepRef = useRef<SubmissionDraftStep | null>(null);
  const telemetryContextRef = useRef({ stationId: stationId || null, fuelType, compactMode, lockedStation });
  const formRef = useRef<HTMLFormElement | null>(null);
  const restoredDraftTrackedRef = useRef(false);
  const lastFailureKeyRef = useRef<string | null>(null);
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
    state.retryable
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

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    const isRestored = draftRestored || draftPhotoMissing;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    selectedFileRef.current = nextFile;

    if (!nextFile) {
      setPreviewUrl(null);
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }

    markStarted("photo", { fileType: nextFile.type, fileSize: nextFile.size });
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
          fileType: nextFile.type,
          fileSize: nextFile.size,
          compactMode,
          lockedStation
        }
      });
    }
    setDraftPhotoMissing(false);
    setPreviewUrl(URL.createObjectURL(nextFile));
    if (priceInputRef.current) {
      priceInputRef.current.focus();
    }
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

  function handleReviewQueueItem(item: SubmissionQueueEntry) {
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
    <form ref={formRef} action={formAction} className="space-y-4" onSubmitCapture={() => markStarted("submit")}>
      <input type="hidden" name="website" value="" />

      <div className="rounded-[24px] border border-[color:var(--color-accent)]/18 bg-[color:var(--color-accent)]/8 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Modo rua</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Foto primeiro, resto rápido.</h3>
            <p className="mt-2 text-sm text-white/62">Abra a câmera, tire a prova e complete o envio com o mínimo de toque possível.</p>
          </div>
          <Badge variant={state.success ? "default" : "warning"}>{state.success ? "Enviado" : compactMode ? "Compacto" : "Rápido"}</Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/52">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">1. Foto</span>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">2. Posto</span>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">3. Combustível</span>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">4. Preço</span>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">5. Enviar</span>
          {draftRestored ? <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Rascunho recuperado</span> : null}
          {draftPhotoMissing ? <span className="rounded-full border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/12 px-3 py-1 text-[color:var(--color-danger)]">Foto precisa ser refeita</span> : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
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
                  hasPhoto: Boolean(selectedFileRef.current)
                }
              });
              fileInputRef.current?.click();
            }}
            className="w-full sm:w-auto"
          >
            Tirar foto agora
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
        <p className="mt-3 text-xs leading-relaxed text-white/52">Se a conexão cair, os campos continuam na tela. Se a foto falhar, tente de novo sem refazer tudo.</p>
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

      {currentQueueItem ? (
        <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/58">
          Seu envio anterior ficou guardado neste aparelho. Você pode reenviar agora ou revisar antes.
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-[22px] border border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/12 p-4 text-sm text-white">
          <p className="text-base font-semibold">Preço enviado. Agora está em moderação.</p>
          <p className="mt-1 text-white/70">Você pode repetir no mesmo posto, voltar ao mapa ou abrir outro posto na rua.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void trackProductEvent({
                  eventType: "submission_series_continued",
                  pagePath: "/enviar",
                  pageTitle: "Enviar preço",
                  stationId: submittedStationId,
                  fuelType,
                  scopeType: "submission",
                  scopeId: submittedStationId,
                  payload: {
                    mode: "same_station",
                    compactMode,
                    lockedStation,
                    hadPhoto: Boolean(selectedFileRef.current)
                  }
                });
                void resetForAnotherSubmission();
              }}
            >
              Enviar outro preço no mesmo posto
            </Button>
            {submittedStationId ? (
              <Button type="button" variant="secondary" onClick={() => router.push((`/postos/${submittedStationId}` as Route))}>
                Voltar ao posto
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => router.push((safeReturnToHref ?? "/") as Route)}>
              Voltar ao mapa
            </Button>
          </div>

          <div className="mt-6 border-t border-white/10 pt-4">
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
          onChange={handleFileChange}
          className="w-full rounded-[18px] border border-dashed border-white/14 bg-black/30 px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--color-accent)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black"
        />
        <p className="text-xs text-white/46">JPG, PNG ou WEBP. Até 5 MB.</p>
      </div>

      {previewUrl ? (
        <div className="overflow-hidden rounded-[22px] border border-white/8 bg-black/30">
          <img src={previewUrl} alt="Pré-visualização da foto enviada" className="h-52 w-full object-cover" />
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
            <div className="rounded-[18px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/72">
              <p className="font-medium text-white">{selectedStation?.name}</p>
              <p className="mt-1 text-white/54">{selectedStation?.neighborhood}, {selectedStation?.city}</p>
              {selectedStation?.address ? <p className="mt-1 text-xs text-white/42">{selectedStation.address}</p> : null}
            </div>
          </>
        ) : (
          <select
            id="stationId"
            name="stationId"
            value={stationId}
            required
            onChange={(event) => {
              setStationId(event.target.value);
              markStarted("station", { changed: true });
            }}
            className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0"
          >
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name} - {station.neighborhood}, {station.city}
              </option>
            ))}
          </select>
        )}
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
            required
            onChange={(event) => {
              setFuelType(event.target.value as FuelType);
              markStarted("fuel", { fuelType: event.target.value });
            }}
            className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0"
          >
            {fuelOptions.map((option) => (
              <option key={option} value={option}>
                {fuelLabels[option]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 rounded-[22px] border border-white/8 bg-black/30 p-4">
          <label className="text-sm font-medium text-white" htmlFor="price">
            Preço
          </label>
          <input
            id="price"
            name="price"
            ref={priceInputRef}
            inputMode="decimal"
            value={price}
            required
            onChange={(event) => {
              setPrice(event.target.value);
              markStarted("price", { hasValue: event.target.value.trim().length > 0 });
            }}
            placeholder="Ex.: 6,29"
            className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0"
          />
        </div>
      </div>

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

      <div className="rounded-[18px] border border-white/8 bg-white/5 px-4 py-3 text-xs leading-relaxed text-white/56">
        Se a conexão cair, os campos continuam na tela. Se a foto falhar, use o botão de tentar novamente sem recomeçar.
      </div>

      <Button type="submit" className="w-full" disabled={pending || !canSubmit}>
        {pending ? "Enviando..." : `Enviar preço ${statusLabel === "foto pronta" ? "com foto pronta" : "agora"}`}
      </Button>
    </form>
  );
}

export function PriceSubmitForm(props: PriceSubmitFormProps) {
  const [formVersion, setFormVersion] = useState(0);

  return <PriceSubmitFormBody key={`${props.initialStationId ?? "default"}-${formVersion}`} {...props} onResetRequest={() => setFormVersion((value) => value + 1)} />;
}




















