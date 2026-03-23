/* eslint-disable @next/next/no-img-element */
"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FuelType, Station } from "@/lib/types";
import { fuelLabels } from "@/lib/format/labels";
import { submitPriceReportAction } from "@/app/enviar/actions";
import { trackProductEvent } from "@/lib/telemetry/client";

const fuelOptions: FuelType[] = ["gasolina_comum", "gasolina_aditivada", "etanol", "diesel_s10", "diesel_comum", "gnv"];
const allowedFuelSet = new Set<FuelType>(fuelOptions);

const initialState = { error: null, errorCode: null, retryable: false, success: false };

type SubmissionStep = "photo" | "station" | "fuel" | "price" | "nickname" | "submit";

interface PriceSubmitFormProps {
  stations: Station[];
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

function buildSubmitStepPayload(step: SubmissionStep, compactMode: boolean, lockedStation: boolean, hasPhoto: boolean, selectedStationId: string | null) {
  return {
    step,
    compactMode,
    lockedStation,
    hasPhoto,
    selectedStationId
  };
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
  const [draftRestored, setDraftRestored] = useState(false);
  const [submittedStationId, setSubmittedStationId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const priceInputRef = useRef<HTMLInputElement | null>(null);
  const selectedFileRef = useRef<File | null>(null);
  const hasStartedRef = useRef(false);
  const completedRef = useRef(false);
  const abandonmentSentRef = useRef(false);
  const currentStepRef = useRef<SubmissionStep | null>(null);
  const telemetryContextRef = useRef({ stationId: stationId || null, fuelType, compactMode, lockedStation });
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    telemetryContextRef.current = { stationId: stationId || null, fuelType, compactMode, lockedStation };
  }, [compactMode, fuelType, lockedStation, stationId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const rawDraft = window.sessionStorage.getItem(draftKey);
    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as Partial<{ stationId: string; fuelType: FuelType; price: string; nickname: string }>;
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
      setDraftRestored(true);
    } catch {
      window.sessionStorage.removeItem(draftKey);
    }
  }, [draftKey, stations]);

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
    if (typeof window === "undefined") {
      return;
    }

    const draft = { stationId, fuelType, price, nickname };
    window.sessionStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draftKey, fuelType, nickname, price, stationId]);

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
    window.sessionStorage.removeItem(draftKey);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    router.refresh();
  }, [draftKey, router, state.success, stationId]);

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
      void trackProductEvent({
        eventType: "submission_abandoned",
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
          hasPhoto: Boolean(selectedFileRef.current)
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
  }, []);

  function markStarted(step: SubmissionStep, extra?: Record<string, unknown>) {
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
        ...buildSubmitStepPayload(step, compactMode, lockedStation, Boolean(selectedFileRef.current), stationId || null),
        ...extra
      }
    });
  }

  function resetForAnotherSubmission() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    window.sessionStorage.removeItem(draftKey);
    completedRef.current = false;
    abandonmentSentRef.current = false;
    onResetRequest();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;

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
    setPreviewUrl(URL.createObjectURL(nextFile));
    if (priceInputRef.current) {
      priceInputRef.current.focus();
    }
  }

  const selectedStation = stations.find((station) => station.id === stationId) ?? stations[0] ?? null;
  const canSubmit = Boolean(selectedStation && selectedFileRef.current && price.trim() && fuelType);
  const retryableError = state.error && state.retryable;
  const statusLabel = previewUrl ? "foto pronta" : selectedStation ? "posto pronto" : "comece pela foto";

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
          {draftRestored ? <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Rascunho restaurado</span> : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
            Tirar foto agora
          </Button>
          <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
            Enviar foto da câmera
          </Button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-white/52">Se a conexão cair, os campos ficam na tela. Se a foto falhar, tente de novo sem refazer tudo.</p>
      </div>

      {state.success ? (
        <div className="rounded-[22px] border border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/12 p-4 text-sm text-white">
          <p className="text-base font-semibold">Preço enviado. Agora está em moderação.</p>
          <p className="mt-1 text-white/70">Você pode voltar ao posto, seguir para o mapa ou mandar outro preço se ainda estiver no local.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={resetForAnotherSubmission}>
              Enviar outro preço
            </Button>
            {submittedStationId ? (
              <Button type="button" variant="secondary" onClick={() => router.push(safeReturnToHref ?? (`/postos/${submittedStationId}` as Route))}>
                Voltar ao posto
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {state.error ? (
        <div className={`rounded-[18px] border px-4 py-3 text-sm ${retryableError ? "border-[color:var(--color-accent)]/24 bg-[color:var(--color-accent)]/10 text-white" : "border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)]"}`}>
          <p className="font-medium text-white">{state.errorCode === "network_offline" ? "Sem conexão agora." : state.errorCode === "upload_failed" ? "Falha no upload." : state.errorCode === "network_timeout" ? "A conexão demorou demais." : state.errorCode === "rate_limited" ? "Muitas tentativas em pouco tempo." : "Não foi possível concluir."}</p>
          <p className="mt-1 text-white/78">{state.error}</p>
          {retryableError ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => formRef.current?.requestSubmit()}>
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

      <details className={`rounded-[22px] border border-white/8 bg-black/30 p-4 text-sm text-white/58 ${compactMode ? "" : ""}`}>
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
        Se a conexão cair, os campos continuam na tela. Se a foto falhar, use o botão de tentar novamente sem reescrever tudo.
      </div>

      <Button type="submit" className="w-full" disabled={pending || !canSubmit}>
        {pending ? "Enviando..." : `Enviar preço ${statusLabel === "foto pronta" ? "com foto pronta" : "agora"}`}
      </Button>
    </form>
  );
}

export function PriceSubmitForm(props: PriceSubmitFormProps) {
  const [formVersion, setFormVersion] = useState(0);
  return <PriceSubmitFormBody key={formVersion} {...props} onResetRequest={() => setFormVersion((value) => value + 1)} />;
}
