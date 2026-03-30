"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";

import { recordOperationalEvent } from "@/lib/ops/logs";
import { checkSubmissionRateLimit, getSubmissionClientIp, hashSubmissionIp } from "@/lib/ops/rate-limit";
import { recordPriceReportAuditEvent } from "@/lib/audit/events";
import { buildReportPhotoPath, validateReportPhoto, REPORT_PHOTO_BUCKET } from "@/lib/upload/report-photo";
import { NETWORK_SIM_COOKIE, getNetworkSimulationDelayMs, normalizeNetworkSimulationMode } from "@/lib/dev/network-sim";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { logRuntimeIssue } from "@/lib/observability/runtime-issues";
import { BETA_ACCESS_COOKIE_NAME } from "@/lib/beta/gate";
import { getReportPriorityScore } from "@/lib/ops/moderation-priority";
import type { FuelType } from "@/lib/types";

export interface SubmitState {
  error: string | null;
  errorCode: string | null;
  retryable: boolean;
  success: boolean;
  reportId?: string;
  noticeTitle?: string | null;
  noticeBody?: string | null;
  noticeTone?: "info" | "warning" | "success" | null;
  noticeCode?: string | null;
}

const fuelTypes: FuelType[] = ["gasolina_comum", "gasolina_aditivada", "etanol", "diesel_s10", "diesel_comum", "gnv"];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function failure(error: string, errorCode: string, retryable = false): SubmitState {
  return { error, errorCode, retryable, success: false, noticeTitle: null, noticeBody: null, noticeTone: null, noticeCode: null };
}

function success(reportId?: string, notice?: Pick<SubmitState, "noticeTitle" | "noticeBody" | "noticeTone" | "noticeCode">): SubmitState {
  return {
    error: null,
    errorCode: null,
    retryable: false,
    success: true,
    reportId,
    noticeTitle: notice?.noticeTitle ?? null,
    noticeBody: notice?.noticeBody ?? null,
    noticeTone: notice?.noticeTone ?? null,
    noticeCode: notice?.noticeCode ?? null
  };
}


function buildSubmissionNotice(input: {
  duplicateLikely: boolean;
  alreadyRecentPrice: boolean;
  priceConflict: boolean;
  priceDiscrepancy: boolean;
}) {
  if (input.duplicateLikely) {
    return {
      title: "Duplicado provável",
      body: "O envio entrou em revisão porque a foto ou o preço parecem repetir um registro recente.",
      tone: "warning" as const,
      code: "duplicate_likely"
    };
  }

  if (input.priceConflict || input.priceDiscrepancy) {
    return {
      title: "Entrou em revisão",
      body: "O envio foi aceito, mas vai passar por checagem porque há conflito com leituras recentes.",
      tone: "warning" as const,
      code: input.priceConflict ? "price_conflict" : "price_discrepancy"
    };
  }

  if (input.alreadyRecentPrice) {
    return {
      title: "Já existe preço recente",
      body: "Seu envio foi aceito e fica em continuidade com uma leitura recente desse posto.",
      tone: "info" as const,
      code: "recent_price"
    };
  }

  return null;
}

function getString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

async function getSubmissionContext(formData: FormData) {
  const currentHeaders = await headers();
  const ip = getSubmissionClientIp(currentHeaders as Headers);
  const cookieStore = await cookies();
  const simulationMode = normalizeNetworkSimulationMode(cookieStore.get(NETWORK_SIM_COOKIE)?.value ?? null);
  return {
    ip,
    ipHash: hashSubmissionIp(ip),
    userAgent: currentHeaders.get("user-agent") ?? null,
    simulationMode,
    betaToken: cookieStore.get(BETA_ACCESS_COOKIE_NAME)?.value ?? null,
    deviceId: getString(formData, "deviceId") || null,
    sessionId: getString(formData, "sessionId") || null,
    surfaceType: getString(formData, "surfaceType") || null,
    surfaceId: getString(formData, "surfaceId") || null
  };
}

export async function submitPriceReportAction(_prevState: SubmitState, formData: FormData): Promise<SubmitState> {
  try {
  const stationId = getString(formData, "stationId");
  const fuelType = getString(formData, "fuelType") as FuelType;
  const priceRaw = getString(formData, "price");
  const nickname = getString(formData, "nickname");
  const honeypot = getString(formData, "website");
  const photo = formData.get("photo");
  const context = await getSubmissionContext(formData);

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
    return failure("Não foi possível enviar agora.", "submission_blocked", false);
  }

  if (!stationId) {
    return failure("Selecione um posto.", "validation", false);
  }

  if (!fuelTypes.includes(fuelType)) {
    return failure("Selecione um combustível válido.", "validation", false);
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
    return failure("Informe um preço válido.", "validation", false);
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
    return {
      ...failure("A foto não foi anexada ou se perdeu. Tire outra antes de enviar.", "photo_missing", false),
      noticeTitle: "Precisa refazer a foto",
      noticeBody: "Tire outra foto. O restante do envio pode continuar salvo neste aparelho.",
      noticeTone: "warning",
      noticeCode: "photo_missing"
    };
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
    return failure(validationError, "validation", false);
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
    return failure("Escolha um posto ativo.", "submission_blocked", false);
  }

  if (context.simulationMode === "offline") {
    await delay(getNetworkSimulationDelayMs(context.simulationMode));
    await recordOperationalEvent({
      eventType: "submission_failed",
      severity: "error",
      scopeType: "submission",
      stationId,
      fuelType,
      ipHash: context.ipHash,
      city: station.city,
      reason: "network_offline",
      payload: { simulationMode: context.simulationMode }
    });
    return failure("Sem conexão agora. O envio ficou na tela; tente novamente quando a rede voltar.", "network_offline", true);
  }

  if (context.simulationMode === "timeout") {
    await delay(getNetworkSimulationDelayMs(context.simulationMode));
    await recordOperationalEvent({
      eventType: "submission_failed",
      severity: "error",
      scopeType: "submission",
      stationId,
      fuelType,
      ipHash: context.ipHash,
      city: station.city,
      reason: "network_timeout",
      payload: { simulationMode: context.simulationMode }
    });
    return failure("A conexão demorou demais para responder. Tente novamente sem refazer o formulário.", "network_timeout", true);
  }

  if (context.simulationMode === "slow") {
    await delay(getNetworkSimulationDelayMs(context.simulationMode));
  }

  const limitCheck = await checkSubmissionRateLimit({
    ipHash: context.ipHash,
    stationId,
    fuelType
  });

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

    return failure(rateLimitMessage, "rate_limited", false);
  }

  const extension = photo.name.split(".").pop()?.toLowerCase() || "jpg";
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const filePath = buildReportPhotoPath(stationId, suffix);
  const fileBuffer = Buffer.from(await photo.arrayBuffer());
  const photoHash = createHash("sha256").update(fileBuffer).digest("hex");

  if (context.simulationMode === "upload_fail") {
    await delay(getNetworkSimulationDelayMs(context.simulationMode));
    await recordOperationalEvent({
      eventType: "upload_failed",
      severity: "error",
      scopeType: "submission",
      stationId,
      fuelType,
      ipHash: context.ipHash,
      city: station.city,
      reason: "simulated_upload_failure",
      payload: { simulationMode: context.simulationMode, filePath }
    });
    return failure("A foto não subiu neste teste. O resto do formulário ficou salvo na tela. Tente novamente.", "upload_failed", true);
  }

  const { error: uploadError } = await supabase.storage.from(REPORT_PHOTO_BUCKET).upload(filePath, fileBuffer, {
    contentType: photo.type,
    upsert: false
  });

  if (uploadError) {
    const uploadInterrupted = /abort|interrupt|network|fetch/i.test(uploadError.message);
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
    return failure(uploadInterrupted ? "O envio da foto foi interrompido no meio do caminho. Tente reenviar sem recomeçar." : "Não foi possível enviar a foto agora. A parte preenchida ficou aqui; tente novamente sem recomeçar.", uploadInterrupted ? "upload_interrupted" : "upload_failed", true);
  }

  const { data: publicUrl } = supabase.storage.from(REPORT_PHOTO_BUCKET).getPublicUrl(filePath);
  const timestamp = new Date().toISOString();

  // Hardening: Geographic Validation
  const distanceRaw = getString(formData, "locationDistance");
  const distance = distanceRaw ? Number(distanceRaw) : null;
  const locationConfidence = (getString(formData, "locationConfidence") as any) || "none";

  // Hardening: Photo Duplication Detection
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: duplicatePhotoReports } = await supabase
    .from("price_reports")
    .select("id")
    .eq("photo_hash", photoHash)
    .gt("created_at", fortyEightHoursAgo)
    .limit(1);

  const potentialPhotoReuse = Boolean(duplicatePhotoReports?.[0]?.id);

  // Hardening: Reconciliation Logic
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data: existingReports } = await supabase
    .from("price_reports")
    .select("reconciliation_id")
    .eq("station_id", stationId)
    .eq("fuel_type", fuelType)
    .eq("price", price)
    .eq("status", "pending")
    .gt("created_at", sixHoursAgo)
    .limit(1);

  const reconciliationId = existingReports?.[0]?.reconciliation_id || 
    `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  
  // A report is a confirmation ONLY if it's a new photo of the same price
  const isConfirmation = Boolean(existingReports?.[0]?.reconciliation_id) && !potentialPhotoReuse;
  
  // A report is a duplicate if it's the same photo AND same price
  const isDuplicate = Boolean(existingReports?.[0]?.reconciliation_id) && potentialPhotoReuse;

  // Hardening: Price Conflict Detection (Recent different price)
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const { data: conflictingReports } = await supabase
    .from("price_reports")
    .select("id, price")
    .eq("station_id", stationId)
    .eq("fuel_type", fuelType)
    .neq("price", price)
    .neq("status", "rejected")
    .gt("reported_at", twelveHoursAgo)
    .limit(1);

  const isPriceConflict = Boolean(conflictingReports?.[0]);

  // Hardening: Price Discrepancy Detection (vs historical approved)
  const { data: lastApproved } = await supabase
    .from("price_reports")
    .select("price")
    .eq("station_id", stationId)
    .eq("fuel_type", fuelType)
    .eq("status", "approved")
    .order("reported_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let priceDiscrepancy = false;
  if (lastApproved) {
    const diff = Math.abs(price - lastApproved.price) / lastApproved.price;
    if (diff > 0.2) {
      priceDiscrepancy = true;
    }
  }

  const priorityScore = getReportPriorityScore(
    { fuelType, price, sourceKind: "community", locationConfidence },
    station as any,
    { betaInviteCode: context.betaToken }
  );

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentReports } = await supabase
    .from("price_reports")
    .select("id,price,status,reported_at,photo_hash")
    .eq("station_id", stationId)
    .eq("fuel_type", fuelType)
    .neq("status", "rejected")
    .gt("reported_at", twentyFourHoursAgo)
    .order("reported_at", { ascending: false })
    .limit(6);

  const hasRecentPrice = Boolean(recentReports?.[0]);
  const sameRecentPrice = Boolean(recentReports?.some((reportRow) => Number(reportRow.price) === price));
  const alreadyRecentPrice = hasRecentPrice && !sameRecentPrice;
  const duplicateLikely = potentialPhotoReuse || isDuplicate || sameRecentPrice;
  const needsReview = duplicateLikely || isPriceConflict || priceDiscrepancy;
  const submissionNotice = buildSubmissionNotice({
    duplicateLikely,
    alreadyRecentPrice,
    priceConflict: isPriceConflict,
    priceDiscrepancy
  });

  const { data: report, error: insertError } = await supabase
    .from("price_reports")
    .insert({
      station_id: stationId,
      fuel_type: fuelType,
      price,
      photo_url: publicUrl.publicUrl,
      photo_taken_at: timestamp,
      reported_at: timestamp,
      reporter_nickname: nickname || null,
      ip_hash: context.ipHash,
      status: needsReview ? "flagged" : "pending",
      source_kind: "community",
      photo_hash: photoHash,
      location_distance: distance,
      location_confidence: locationConfidence,
      reconciliation_id: reconciliationId,
      is_confirmation: isConfirmation,
      moderation_reason: submissionNotice?.code ?? null,
      moderation_note: submissionNotice?.body ?? null,
      metadata: {
        price_discrepancy: priceDiscrepancy,
        potential_photo_reuse: potentialPhotoReuse,
        is_price_conflict: isPriceConflict,
        is_duplicate: isDuplicate,
        duplicate_likely: duplicateLikely,
        already_recent_price: alreadyRecentPrice,
        review_reason: submissionNotice?.code ?? null
      },
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
    return failure("Não foi possível salvar o envio agora. Tente novamente sem refazer o formulário.", "submission_failed", true);
  }

  await recordPriceReportAuditEvent({
    reportId: report.id,
    eventType: "created",
    payload: {
      stationId,
      fuelType,
      sourceKind: "community",
      photoHash,
      reportedAt: timestamp,
      priorityScore,
      betaToken: context.betaToken,
      locationConfidence,
      locationDistance: distance,
      reconciliationId,
      isConfirmation,
      priceDiscrepancy,
      potentialPhotoReuse,
      isPriceConflict,
      isDuplicate,
      duplicateLikely,
      alreadyRecentPrice,
      reviewReason: submissionNotice?.code ?? null
    }
  });

  await recordOperationalEvent({
    eventType: "submission_accepted",
    severity: needsReview ? "warning" : "info",
    scopeType: "submission",
    stationId,
    fuelType,
    ipHash: context.ipHash,
    city: station.city,
    payload: {
      reportId: report.id,
      stationName: station.name,
      nickname: nickname || null,
      windowCount: limitCheck.attemptCount,
      locationConfidence,
      priceDiscrepancy,
      potentialPhotoReuse,
      isPriceConflict,
      isDuplicate,
      duplicateLikely,
      alreadyRecentPrice,
      reviewReason: submissionNotice?.code ?? null
    }
  });

  if (needsReview) {
    await recordOperationalEvent({
      eventType: "submission_reviewed",
      severity: "warning",
      scopeType: "submission",
      stationId,
      fuelType,
      ipHash: context.ipHash,
      city: station.city,
      reason: submissionNotice?.code ?? "review_required",
      payload: {
        reportId: report.id,
        duplicateLikely,
        alreadyRecentPrice,
        priceConflict: isPriceConflict,
        priceDiscrepancy,
        stationName: station.name,
        noticeTitle: submissionNotice?.title ?? null
      }
    });
  }

  revalidatePath("/");
  revalidatePath("/atualizacoes");
  revalidatePath(`/postos/${stationId}`);
  revalidatePath("/admin");
  revalidatePath("/auditoria");

  return success(
    report.id,
    submissionNotice
      ? {
          noticeTitle: submissionNotice.title,
          noticeBody: submissionNotice.body,
          noticeTone: submissionNotice.tone,
          noticeCode: submissionNotice.code
        }
      : undefined
  );
  } catch (error) {
    logRuntimeIssue("Unexpected failure in submitPriceReportAction", error, { scope: "public", surface: "actions/enviar.submitPriceReportAction", fallback: "return-retryable-error", optional: true });
    return failure("Houve um erro temporario ao enviar a foto. Tente novamente sem refazer o restante.", "submission_unexpected", true);
  }
}






