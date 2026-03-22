/* eslint-disable @next/next/no-img-element */
"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FuelType, Station } from "@/lib/types";
import { fuelLabels } from "@/lib/format/labels";
import { submitPriceReportAction } from "@/app/enviar/actions";
import { trackProductEvent } from "@/lib/telemetry/client";

const fuelOptions: FuelType[] = ["gasolina_comum", "gasolina_aditivada", "etanol", "diesel_s10", "diesel_comum", "gnv"];

const initialState = { error: null, success: false };

interface PriceSubmitFormProps {
  stations: Station[];
  initialStationId?: string;
  returnToHref?: string;
}

function safeRoute(value?: string): Route | null {
  return value && value.startsWith("/") ? (value as Route) : null;
}

export function PriceSubmitForm({ stations, initialStationId, returnToHref }: PriceSubmitFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(submitPriceReportAction, initialState);
  const safeReturnToHref = useMemo(() => safeRoute(returnToHref), [returnToHref]);
  const defaultStationId = useMemo(() => {
    const candidate = stations.find((station) => station.id === initialStationId);
    return candidate?.id ?? stations[0]?.id ?? "";
  }, [initialStationId, stations]);

  const [stationId, setStationId] = useState(defaultStationId);
  const [fuelType, setFuelType] = useState<FuelType>("gasolina_comum");
  const [price, setPrice] = useState("");
  const [nickname, setNickname] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submittedStationId, setSubmittedStationId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (initialStationId && stations.some((station) => station.id === initialStationId)) {
      setStationId(initialStationId);
      return;
    }

    if (!stationId && stations[0]) {
      setStationId(stations[0].id);
    }
  }, [initialStationId, stations, stationId]);

  useEffect(() => {
    if (state.success) {
      setSubmittedStationId(stationId);
      setPrice("");
      setNickname("");
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      router.refresh();
    }
  }, [router, state.success, stationId]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function markStarted(reason: string) {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    void trackProductEvent({
      eventType: "submission_started",
      pagePath: "/enviar",
      pageTitle: "Enviar preço",
      stationId: stationId || null,
      fuelType,
      scopeType: "submission",
      scopeId: stationId || null,
      payload: { reason }
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!nextFile) {
      setPreviewUrl(null);
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }

    markStarted("photo");
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  const selectedStation = stations.find((station) => station.id === stationId) ?? stations[0] ?? null;
  const stepTone = previewUrl ? "foto pronta" : stationId ? "posto escolhido" : "comece pela foto";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="website" value="" />

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/52">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{previewUrl ? "1. Foto" : "1. Foto cedo"}</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">2. Posto</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">3. Combustível</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">4. Preço</span>
        <Badge variant={state.success ? "default" : "outline"}>{state.success ? "Enviado" : stepTone}</Badge>
      </div>

      {state.success ? (
        <div className="rounded-[22px] border border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/12 p-4 text-sm text-white">
          <p className="text-base font-semibold">Enviado e agora em moderação.</p>
          <p className="mt-1 text-white/70">Seu preço entrou na fila e vai aparecer quando for aprovado.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setPrice("")}>Enviar outro preço</Button>
            {submittedStationId ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push(safeReturnToHref ?? (`/postos/${submittedStationId}` as Route))}
              >
                Voltar ao mapa
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {state.error ? <div className="rounded-[18px] border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/10 px-4 py-3 text-sm text-[color:var(--color-danger)]">{state.error}</div> : null}

      <div className="space-y-2" id="photo">
        <label className="text-sm font-medium text-white" htmlFor="photo-input">
          Foto
        </label>
        <input
          id="photo-input"
          name="photo"
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
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

      <div className="space-y-2">
        <label className="text-sm font-medium text-white" htmlFor="stationId">
          Posto
        </label>
        <select
          id="stationId"
          name="stationId"
          value={stationId}
          onChange={(event) => {
            setStationId(event.target.value);
            markStarted("station");
          }}
          className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0"
        >
          {stations.map((station) => (
            <option key={station.id} value={station.id}>
              {station.name} - {station.neighborhood}, {station.city}
            </option>
          ))}
        </select>
        {selectedStation ? <p className="text-xs text-white/46">{selectedStation.address}</p> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white" htmlFor="fuelType">
            Combustível
          </label>
          <select
            id="fuelType"
            name="fuelType"
            value={fuelType}
            onChange={(event) => {
              setFuelType(event.target.value as FuelType);
              markStarted("fuel");
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

        <div className="space-y-2">
          <label className="text-sm font-medium text-white" htmlFor="price">
            Preço
          </label>
          <input
            id="price"
            name="price"
            inputMode="decimal"
            value={price}
            onChange={(event) => {
              setPrice(event.target.value);
              markStarted("price");
            }}
            placeholder="Ex.: 6,29"
            className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-white" htmlFor="nickname">
          Apelido opcional
        </label>
        <input
          id="nickname"
          name="nickname"
          value={nickname}
          onChange={(event) => {
            setNickname(event.target.value);
            markStarted("nickname");
          }}
          placeholder="Ex.: Morador VR"
          className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0"
        />
      </div>

      <div className="rounded-[18px] border border-white/8 bg-white/5 px-4 py-3 text-xs leading-relaxed text-white/56">
        Se a conexão cair, basta voltar e reenviar. Os campos ficam prontos para completar de novo, sem perder a lógica do fluxo.
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar preço"}
      </Button>
    </form>
  );
}
