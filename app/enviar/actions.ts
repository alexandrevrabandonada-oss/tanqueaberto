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
import { getStationProposalReviewSignal } from "@/lib/quality/stations";
import type { FuelType } from "@/lib/types";

export interface SubmitState {
  error: string | null;
  errorCode: string | null;
  retryable: boolean;
  success: boolean;
  reportId?: string;
  stationId?: string;
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

function success(reportId?: string, notice?: Pick<SubmitState, "noticeTitle" | "noticeBody" | "noticeTone" | "noticeCode">, stationId?: string): SubmitState {
  return {
    error: null,
    errorCode: null,
    retryable: false,
    success: true,
    reportId,
    stationId,
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
      body: "O envio entrou em revisão porque parece repetido.",
      tone: "warning" as const,
      code: "duplicate_likely"
    };
  }

  if (input.priceConflict || input.priceDiscrepancy) {
    return {
      title: "Entrou em revisão",
      body: "O envio foi salvo e vai passar por revisão.",
      tone: "warning" as const,
      code: input.priceConflict ? "price_conflict" : "price_discrepancy"
    };
  }

  if (input.alreadyRecentPrice) {
    return {
      title: "Já existe preço recente",
      body: "Seu envio segue junto de uma leitura recente.",
      tone: "info" as const,
      code: "recent_price"
    };
  }

  return null;
}

function getString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}
function normalizeStationProposalText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function buildStationProposalStreet(name: string, street: string, neighborhood: string) {
  return [street, neighborhood, name]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" · ")
    .trim();
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
  let stationId = getString(formData, "stationId");
  const fuelType = getString(formData, "fuelType") as FuelType;
  const priceRaw = getString(formData, "price");
  const nickname = getString(formData, "nickname");
  const honeypot = getString(formData, "website");
  const photo = formData.get("photo");
  const context = await getSubmissionContext(formData);
  const stationProposalMode = getString(formData, "stationProposalMode") === "1";
  const stationProposalConfirmed = getString(formData, "stationProposalConfirmed") === "1";
  const stationProposalName = getString(formData, "stationProposalName");
  const stationProposalStreet = getString(formData, "stationProposalStreet");
  const stationProposalNeighborhood = getString(formData, "stationProposalNeighborhood");
  const stationProposalBrand = getString(formData, "stationProposalBrand");
  const stationProposalCity = getString(formData, "stationProposalCity");
  const stationProposalLatRaw = getString(formData, "stationProposalLat");
  const stationProposalLngRaw = getString(formData, "stationProposalLng");
  const stationProposalLat = stationProposalLatRaw ? Number(stationProposalLatRaw) : null;
  const stationProposalLng = stationProposalLngRaw ? Number(stationProposalLngRaw) : null;

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

  if (!stationId && !stationProposalMode) {
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
      noticeBody: "Tire outra foto e siga o envio.",
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

  let station: { id: string; is_active: boolean; name: string; city: string } | null = null;
  let stationError: { message: string } | null = null;

  if (!stationId && stationProposalMode) {
    await recordOperationalEvent({
      eventType: "station_proposal_flow_opened",
      severity: "info",
      scopeType: "submission",
      stationId: null,
      fuelType,
      ipHash: context.ipHash,
      reason: "proposal_mode",
      payload: {
        hasGeo: stationProposalLat !== null && stationProposalLng !== null && !Number.isNaN(stationProposalLat) && !Number.isNaN(stationProposalLng),
        hasName: Boolean(stationProposalName),
        hasStreet: Boolean(stationProposalStreet),
        hasNeighborhood: Boolean(stationProposalNeighborhood),
        hasBrand: Boolean(stationProposalBrand)
      }
    });

    if (!stationProposalConfirmed) {
      return failure("Confirme o posto novo ou escolha um posto da lista.", "station_proposal_unconfirmed", false);
    }

    if (!stationProposalName || !stationProposalStreet || !stationProposalCity) {
      return failure("Preencha nome, rua e cidade antes de criar um posto novo.", "validation", false);
    }

    const proposalName = stationProposalName.trim();
    const proposalStreet = stationProposalStreet.trim();
    const proposalNeighborhood = stationProposalNeighborhood.trim();
    const proposalBrand = stationProposalBrand.trim();
    const proposalCity = stationProposalCity.trim();
    const proposalAddress = buildStationProposalStreet(proposalName, proposalStreet, proposalNeighborhood || proposalCity);
    const hasProposalCoords =
      stationProposalLat !== null &&
      stationProposalLng !== null &&
      !Number.isNaN(stationProposalLat) &&
      !Number.isNaN(stationProposalLng);

    const proposalReview = getStationProposalReviewSignal({
      name: proposalName,
      brand: proposalBrand || "",
      namePublic: proposalName,
      nameOfficial: proposalName,
      address: proposalAddress,
      city: proposalCity,
      neighborhood: proposalNeighborhood || proposalCity,
      lat: hasProposalCoords ? stationProposalLat : null,
      lng: hasProposalCoords ? stationProposalLng : null,
      geoReviewStatus: hasProposalCoords ? "pending" : "manual_review",
      geoConfidence: "low"
    });

    const { data: createdStation, error: createStationError } = await supabase
      .from("stations")
      .insert({
        name: proposalName,
        brand: proposalBrand || "Sem bandeira",
        address: proposalAddress,
        city: proposalCity,
        neighborhood: proposalNeighborhood || proposalCity,
        lat: hasProposalCoords ? stationProposalLat : null,
        lng: hasProposalCoords ? stationProposalLng : null,
        is_active: true,
        source: "community",
        official_status: "unknown",
        sigaf_status: null,
        products: [],
        distributor_name: proposalBrand || null,
        geo_source: hasProposalCoords ? (context.simulationMode === "offline" ? "manual" : "user_proposed") : "manual",
        geo_confidence: "low",
        geo_review_status: hasProposalCoords ? "pending" : "manual_review",
        visibility_status: "review",
        curation_note: `${proposalReview.label}: ${proposalReview.reason} | ${proposalAddress}`,
        updated_at: new Date().toISOString()
      })
      .select("id,is_active,name,city")
      .single();

    if (createStationError || !createdStation) {
      await recordOperationalEvent({
        eventType: "submission_blocked",
        severity: "error",
        scopeType: "submission",
        stationId: null,
        fuelType,
        ipHash: context.ipHash,
        reason: createStationError?.message ?? "failed_to_create_station"
      });
      return failure("Não foi possível registrar o posto novo agora. Escolha um posto parecido ou tente de novo.", "station_create_failed", false);
    }

    await recordOperationalEvent({
      eventType: "station_proposal_created",
      severity: "info",
      scopeType: "submission",
      stationId: createdStation.id,
      city: proposalCity,
      fuelType,
      ipHash: context.ipHash,
      reason: proposalReview.label,
      payload: {
        proposalReviewState: proposalReview.state,
        proposalReviewLabel: proposalReview.label,
        proposalReviewReason: proposalReview.reason,
        hasGeo: hasProposalCoords,
        geoReviewStatus: hasProposalCoords ? "pending" : "manual_review",
        geoConfidence: "low",
        proposalCity,
        proposalNeighborhood,
        proposalBrand,
        proposalStreet
      }
    });

    await recordOperationalEvent({
      eventType: hasProposalCoords ? "station_proposal_submitted_with_geo" : "station_proposal_submitted_without_geo",
      severity: "info",
      scopeType: "submission",
      stationId: createdStation.id,
      city: proposalCity,
      fuelType,
      ipHash: context.ipHash,
      reason: hasProposalCoords ? "geo_attached" : "geo_missing",
      payload: {
        proposalReviewState: proposalReview.state,
        hasGeo: hasProposalCoords,
        geoReviewStatus: hasProposalCoords ? "pending" : "manual_review",
        proposalCity,
        proposalNeighborhood,
        proposalBrand,
        proposalStreet
      }
    });

    stationId = createdStation.id;
    station = createdStation;
  } else {
    const { data: fetchedStation, error: fetchedStationError } = await supabase
      .from("stations")
      .select("id,is_active,name,city")
      .eq("id", stationId)
      .maybeSingle();

    station = fetchedStation;
    stationError = fetchedStationError as { message: string } | null;
  }

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
  const contentType = photo.type || (extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg");
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
    contentType,
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
    .select("id,price,status,reported_at")
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

  const { data: report, error: insertError } = await (async () => {
    const fullPayload = {
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
    };

    const full = await supabase
      .from("price_reports")
      .insert(fullPayload)
      .select("id")
      .single();

    if (!full.error || !full.error.message?.includes("does not exist")) {
      return full;
    }

    // Legacy fallback — only core columns
    return supabase
      .from("price_reports")
      .insert({
        station_id: stationId,
        fuel_type: fuelType,
        price,
        photo_url: publicUrl.publicUrl,
        photo_taken_at: timestamp,
        reported_at: timestamp,
        reporter_nickname: nickname || null,
        status: needsReview ? "flagged" : "pending",
        moderation_note: submissionNotice?.body ?? null
      })
      .select("id")
      .single();
  })();

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
      : undefined,
    stationId
  );
  } catch (error) {
    logRuntimeIssue("Unexpected failure in submitPriceReportAction", error, { scope: "public", surface: "actions/enviar.submitPriceReportAction", fallback: "return-retryable-error", optional: true });
    return failure("Houve um erro temporario ao enviar a foto. Tente novamente sem refazer o restante.", "submission_unexpected", true);
  }
}











