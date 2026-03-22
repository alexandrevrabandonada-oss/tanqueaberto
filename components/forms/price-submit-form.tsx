/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { FuelType, Station } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fuelLabels } from "@/lib/format/labels";

const fuelOptions: FuelType[] = ["gasolina_comum", "gasolina_aditivada", "etanol", "diesel_s10", "diesel_comum", "gnv"];

interface PriceSubmitFormProps {
  stations: Station[];
}

export function PriceSubmitForm({ stations }: PriceSubmitFormProps) {
  const router = useRouter();
  const [stationId, setStationId] = useState(stations[0]?.id ?? "");
  const [fuelType, setFuelType] = useState<FuelType>("gasolina_comum");
  const [price, setPrice] = useState("");
  const [nickname, setNickname] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setError(null);
    setSuccess(null);

    if (!nextFile) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      setError("Envie uma imagem válida.");
      return;
    }

    if (nextFile.size > 5 * 1024 * 1024) {
      setError("A foto precisa ter no máximo 5 MB.");
      return;
    }

    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const normalizedPrice = Number(price.replace(",", "."));

    if (!stationId) {
      setError("Selecione um posto.");
      return;
    }

    if (!price || Number.isNaN(normalizedPrice) || normalizedPrice <= 0) {
      setError("Informe um preço válido.");
      return;
    }

    if (!file) {
      setError("Anexe uma foto do painel ou bomba.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `reports/${stationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

      const { error: uploadError } = await supabase.storage.from("price-report-photos").upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrl } = supabase.storage.from("price-report-photos").getPublicUrl(filePath);
      const timestamp = new Date().toISOString();

      const { error: insertError } = await supabase.from("price_reports").insert({
        station_id: stationId,
        fuel_type: fuelType,
        price: normalizedPrice,
        photo_url: publicUrl.publicUrl,
        photo_taken_at: timestamp,
        reported_at: timestamp,
        reporter_nickname: nickname.trim() || null,
        status: "pending"
      });

      if (insertError) {
        throw insertError;
      }

      setSuccess("Preço enviado com sucesso e aguardando moderação.");
      setPrice("");
      setNickname("");
      setFile(null);
      setPreviewUrl(null);
      if (stations[0]) {
        setStationId(stations[0].id);
      }
      router.refresh();
    } catch (submitError) {
      console.error(submitError);
      setError("Não foi possível enviar agora. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-white" htmlFor="stationId">
          Posto
        </label>
        <select
          id="stationId"
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
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="w-full rounded-[18px] border border-dashed border-white/14 bg-black/30 px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--color-accent)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black"
        />
        <p className="text-xs text-white/46">Tamanho máximo de 5 MB. Fotos melhores ajudam na validação.</p>
      </div>

      {previewUrl ? (
        <div className="overflow-hidden rounded-[22px] border border-white/8 bg-black/30">
          <img src={previewUrl} alt="Pré-visualização da foto enviada" className="h-52 w-full object-cover" />
        </div>
      ) : null}

      {error ? <div className="rounded-[18px] border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/10 px-4 py-3 text-sm text-[color:var(--color-danger)]">{error}</div> : null}
      {success ? <div className="rounded-[18px] border border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/10 px-4 py-3 text-sm text-white">{success}</div> : null}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Enviando..." : "Enviar preço"}
      </Button>
    </form>
  );
}
