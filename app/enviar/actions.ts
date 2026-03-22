"use server";

import { revalidatePath } from "next/cache";

import { buildReportPhotoPath, validateReportPhoto, REPORT_PHOTO_BUCKET } from "@/lib/upload/report-photo";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { FuelType } from "@/lib/types";

interface SubmitState {
  error: string | null;
  success: boolean;
}

const fuelTypes: FuelType[] = ["gasolina_comum", "gasolina_aditivada", "etanol", "diesel_s10", "diesel_comum", "gnv"];

function getString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function submitPriceReportAction(_prevState: SubmitState, formData: FormData): Promise<SubmitState> {
  const stationId = getString(formData, "stationId");
  const fuelType = getString(formData, "fuelType") as FuelType;
  const priceRaw = getString(formData, "price");
  const nickname = getString(formData, "nickname");
  const honeypot = getString(formData, "website");
  const photo = formData.get("photo");

  if (honeypot) {
    return { error: "Não foi possível enviar agora.", success: false };
  }

  if (!stationId) {
    return { error: "Selecione um posto.", success: false };
  }

  if (!fuelTypes.includes(fuelType)) {
    return { error: "Selecione um combustível válido.", success: false };
  }

  const price = Number(priceRaw.replace(",", "."));
  if (!priceRaw || Number.isNaN(price) || price <= 0) {
    return { error: "Informe um preço válido.", success: false };
  }

  if (!photo || !(photo instanceof File)) {
    return { error: "Anexe uma foto do painel ou da bomba.", success: false };
  }

  const validationError = validateReportPhoto(photo);
  if (validationError) {
    return { error: validationError, success: false };
  }

  const supabase = createSupabaseServiceClient();

  const { data: station, error: stationError } = await supabase
    .from("stations")
    .select("id,is_active")
    .eq("id", stationId)
    .maybeSingle();

  if (stationError || !station?.is_active) {
    return { error: "Escolha um posto ativo.", success: false };
  }

  const extension = photo.name.split(".").pop()?.toLowerCase() || "jpg";
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const filePath = buildReportPhotoPath(stationId, suffix);

  const { error: uploadError } = await supabase.storage.from(REPORT_PHOTO_BUCKET).upload(filePath, photo, {
    contentType: photo.type,
    upsert: false
  });

  if (uploadError) {
    return { error: "Não foi possível enviar a foto agora.", success: false };
  }

  const { data: publicUrl } = supabase.storage.from(REPORT_PHOTO_BUCKET).getPublicUrl(filePath);
  const timestamp = new Date().toISOString();

  const { error: insertError } = await supabase.from("price_reports").insert({
    station_id: stationId,
    fuel_type: fuelType,
    price,
    photo_url: publicUrl.publicUrl,
    photo_taken_at: timestamp,
    reported_at: timestamp,
    reporter_nickname: nickname || null,
    status: "pending"
  });

  if (insertError) {
    return { error: "Não foi possível salvar o envio agora.", success: false };
  }

  revalidatePath("/");
  revalidatePath("/atualizacoes");
  revalidatePath(`/postos/${stationId}`);
  revalidatePath("/admin");

  return { error: null, success: true };
}
