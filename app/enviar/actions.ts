"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { recordOperationalEvent } from "@/lib/ops/logs";
import { checkSubmissionRateLimit, getSubmissionClientIp, hashSubmissionIp } from "@/lib/ops/rate-limit";
import { recordPriceReportAuditEvent } from "@/lib/audit/events";
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

async function getSubmissionContext() {
  const currentHeaders = await headers();
  const ip = getSubmissionClientIp(currentHeaders as Headers);
  return {
    ip,
    ipHash: hashSubmissionIp(ip),
    userAgent: currentHeaders.get("user-agent") ?? null
  };
}

export async function submitPriceReportAction(_prevState: SubmitState, formData: FormData): Promise<SubmitState> {
  const stationId = getString(formData, "stationId");
  const fuelType = getString(formData, "fuelType") as FuelType;
  const priceRaw = getString(formData, "price");
  const nickname = getString(formData, "nickname");
  const honeypot = getString(formData, "website");
  const photo = formData.get("photo");
  const context = await getSubmissionContext();

  if (honeypot) {
    await recordOperationalEvent({
      eventType: "submission_blocked",
      severity: "warning",
      scopeType: "submission",
      stationId: stationId || null,
      fuelType: fuelType || null,
      ipHash: context.ipHash,
      reason: "honeypot"
    });
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
    await recordOperationalEvent({
      eventType: "submission_blocked",
      severity: "warning",
      scopeType: "submission",
      stationId,
      fuelType,
      ipHash: context.ipHash,
      reason: "invalid_price"
    });
    return { error: "Informe um preço válido.", success: false };
  }

  if (!photo || !(photo instanceof File)) {
    await recordOperationalEvent({
      eventType: "upload_rejected_missing",
      severity: "warning",
      scopeType: "submission",
      stationId,
      fuelType,
      ipHash: context.ipHash,
      reason: "missing_photo"
    });
    return { error: "Anexe uma foto do painel ou da bomba.", success: false };
  }

  const validationError = validateReportPhoto(photo);
  if (validationError) {
    await recordOperationalEvent({
      eventType: validationError.includes("5 MB") ? "upload_rejected_size" : "upload_rejected_type",
      severity: "warning",
      scopeType: "submission",
      stationId,
      fuelType,
      ipHash: context.ipHash,
      reason: validationError
    });
    return { error: validationError, success: false };
  }

  const supabase = createSupabaseServiceClient();

  const { data: station, error: stationError } = await supabase
    .from("stations")
    .select("id,is_active,name,city")
    .eq("id", stationId)
    .maybeSingle();

  if (stationError || !station?.is_active) {
    await recordOperationalEvent({
      eventType: "submission_blocked",
      severity: "warning",
      scopeType: "submission",
      stationId,
      fuelType,
      ipHash: context.ipHash,
      reason: stationError ? stationError.message : "inactive_station"
    });
    return { error: "Escolha um posto ativo.", success: false };
  }

  const limitCheck = await checkSubmissionRateLimit({ ipHash: context.ipHash, stationId, fuelType });

  if (!limitCheck.allowed) {
    const rateLimitMessage =
      limitCheck.reason === "proteção temporariamente indisponível"
        ? "A proteção do envio está temporariamente indisponível. Tente novamente em instantes."
        : `Você já enviou muitas vezes em pouco tempo. Tente novamente em ${Math.max(
            1,
            Math.ceil((new Date(limitCheck.blockedUntil ?? new Date().toISOString()).getTime() - Date.now()) / 60000)
          )} min.`;

    await recordOperationalEvent({
      eventType: "submission_blocked",
      severity: "warning",
      scopeType: "submission",
      stationId,
      fuelType,
      ipHash: context.ipHash,
      city: station.city,
      reason: limitCheck.reason ?? "limit_exceeded",
      payload: {
        attemptCount: limitCheck.attemptCount,
        blockedUntil: limitCheck.blockedUntil,
        windowStart: limitCheck.windowStart
      }
    });

    return { error: rateLimitMessage, success: false };
  }

  const extension = photo.name.split(".").pop()?.toLowerCase() || "jpg";
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const filePath = buildReportPhotoPath(stationId, suffix);
  const fileBuffer = Buffer.from(await photo.arrayBuffer());
  const photoHash = createHash("sha256").update(fileBuffer).digest("hex");

  const { error: uploadError } = await supabase.storage.from(REPORT_PHOTO_BUCKET).upload(filePath, fileBuffer, {
    contentType: photo.type,
    upsert: false
  });

  if (uploadError) {
    await recordOperationalEvent({
      eventType: "upload_failed",
      severity: "error",
      scopeType: "submission",
      stationId,
      fuelType,
      ipHash: context.ipHash,
      city: station.city,
      reason: uploadError.message,
      payload: {
        bucket: REPORT_PHOTO_BUCKET,
        filePath
      }
    });
    return { error: "Não foi possível enviar a foto agora.", success: false };
  }

  const { data: publicUrl } = supabase.storage.from(REPORT_PHOTO_BUCKET).getPublicUrl(filePath);
  const timestamp = new Date().toISOString();

  const { data: report, error: insertError } = await supabase
    .from("price_reports")
    .insert({
      station_id: stationId,
      fuel_type: fuelType,
      price,
      photo_url: publicUrl.publicUrl,
      photo_taken_at: timestamp,
      observed_at: timestamp,
      submitted_at: timestamp,
      reported_at: timestamp,
      reporter_nickname: nickname || null,
      status: "pending",
      source_kind: "community",
      photo_hash: photoHash,
      version: 1
    })
    .select("id")
    .single();

  if (insertError || !report) {
    await recordOperationalEvent({
      eventType: "submission_failed",
      severity: "error",
      scopeType: "submission",
      stationId,
      fuelType,
      ipHash: context.ipHash,
      city: station.city,
      reason: insertError?.message ?? "failed_to_save_report",
      payload: {
        stationName: station.name,
        photoHash
      }
    });
    return { error: "Não foi possível salvar o envio agora.", success: false };
  }

  await recordPriceReportAuditEvent({
    reportId: report.id,
    eventType: "created",
    payload: {
      stationId,
      fuelType,
      sourceKind: "community",
      photoHash,
      reportedAt: timestamp
    }
  });

  await recordOperationalEvent({
    eventType: "submission_accepted",
    severity: "info",
    scopeType: "submission",
    stationId,
    fuelType,
    ipHash: context.ipHash,
    city: station.city,
    payload: {
      reportId: report.id,
      stationName: station.name,
      nickname: nickname || null,
      windowCount: limitCheck.attemptCount
    }
  });

  revalidatePath("/");
  revalidatePath("/atualizacoes");
  revalidatePath(`/postos/${stationId}`);
  revalidatePath("/admin");
  revalidatePath("/auditoria");

  return { error: null, success: true };
}



