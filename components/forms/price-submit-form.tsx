/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { FuelType, Station } from "@/lib/types";
import { fuelLabels } from "@/lib/format/labels";
import { submitPriceReportAction } from "@/app/enviar/actions";

const fuelOptions: FuelType[] = ["gasolina_comum", "gasolina_aditivada", "etanol", "diesel_s10", "diesel_comum", "gnv"];

const initialState = { error: null, success: false };

interface PriceSubmitFormProps {
  stations: Station[];
}

export function PriceSubmitForm({ stations }: PriceSubmitFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(submitPriceReportAction, initialState);
  const [stationId, setStationId] = useState(stations[0]?.id ?? "");
  const [fuelType, setFuelType] = useState<FuelType>("gasolina_comum");
  const [price, setPrice] = useState("");
  const [nickname, setNickname] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (state.success) {
      setPrice("");
      setNickname("");
      setPreviewUrl(null);
      if (stations[0]) {
        setStationId(stations[0].id);
      }
      router.refresh();
    }
  }, [router, stations, state.success]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="website" value="" />

      <div className="space-y-2">
        <label className="text-sm font-medium text-white" htmlFor="stationId">
          Posto
        </label>
        <select
          id="stationId"
          name="stationId"
          value={stationId}
          onChange={(event) => setStationId(event.target.value)}
          className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0"
        >
          {stations.map((station) => (
            <option key={station.id} value={station.id}>
              {station.name} - {station.neighborhood}, {station.city}
            </option>
          ))}
        </select>
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
            onChange={(event) => setFuelType(event.target.value as FuelType)}
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
            onChange={(event) => setPrice(event.target.value)}
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
          onChange={(event) => setNickname(event.target.value)}
          placeholder="Ex.: Morador VR"
          className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-white" htmlFor="photo">
          Foto
        </label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleFileChange}
          className="w-full rounded-[18px] border border-dashed border-white/14 bg-black/30 px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--color-accent)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black"
        />
        <p className="text-xs text-white/46">JPG, PNG ou WEBP. Tamanho máximo de 5 MB.</p>
      </div>

      {previewUrl ? (
        <div className="overflow-hidden rounded-[22px] border border-white/8 bg-black/30">
          <img src={previewUrl} alt="Pré-visualização da foto enviada" className="h-52 w-full object-cover" />
        </div>
      ) : null}

      {state.error ? <div className="rounded-[18px] border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/10 px-4 py-3 text-sm text-[color:var(--color-danger)]">{state.error}</div> : null}
      {state.success ? <div className="rounded-[18px] border border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/10 px-4 py-3 text-sm text-white">Preço enviado com sucesso e aguardando moderação.</div> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar preço"}
      </Button>
    </form>
  );
}
