"use server";

import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";

import { recordPriceReportAuditEvent } from "@/lib/audit/events";
import { BETA_ACCESS_COOKIE_NAME } from "@/lib/beta/gate";
import { NETWORK_SIM_COOKIE, getNetworkSimulationDelayMs, normalizeNetworkSimulationMode } from "@/lib/dev/network-sim";
import { logRuntimeIssue } from "@/lib/observability/runtime-issues";
import { getReportPriorityScore } from "@/lib/ops/moderation-priority";
import { recordOperationalEvent } from "@/lib/ops/logs";
import {
  buildContributorTrustProfile,
  decideSubmissionRouting,
  evaluateSubmissionRisk,
  getProgressiveTrustRollout,
  shouldMarkSubmissionFlagged,
  type SubmissionRiskProfile,
  type SubmissionRoutingDecision
} from "@/lib/ops/progressive-trust";
import { checkSubmissionRateLimit, getSubmissionClientIp, hashSubmissionIp } from "@/lib/ops/rate-limit";
import { getStationProposalReviewSignal } from "@/lib/quality/stations";
import { parseSerializedFuelPriceEntries } from "@/lib/submissions/fuel-prices";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { FuelType } from "@/lib/types";
import { buildReportPhotoPath, REPORT_PHOTO_BUCKET, validateReportPhoto } from "@/lib/upload/report-photo";

export interface SubmittedReportSummary {
  reportId: string;
  fuelType: FuelType;
  price: string;
}

export interface SubmitState {
  error: string | null;
  errorCode: string | null;
  retryable: boolean;
  success: boolean;
  reportId?: string;
  reportIds?: string[];
  submittedReports?: SubmittedReportSummary[];
  packageId?: string;
  stationId?: string;
  noticeTitle?: string | null;
  noticeBody?: string | null;
  noticeTone?: "info" | "warning" | "success" | null;
  noticeCode?: string | null;
}

interface SubmissionEntry {
  fuelType: FuelType;
  price: number;
  priceLabel: string;
}

interface SubmissionNotice {
  title: string;
  body: string;
  tone: "info" | "warning" | "success";
  code: string;
}

interface SubmissionPackageResult {
  reportId: string;
  fuelType: FuelType;
  priceLabel: string;
  notice: SubmissionNotice | null;
  routing: SubmissionRoutingDecision;
  risk: SubmissionRiskProfile;
}

interface SubmissionRequestContext {
  ip: string | null;
  ipHash: string | null;
  userAgent: string | null;
  simulationMode: string;
  betaToken: string | null;
  deviceId: string | null;
  sessionId: string | null;
  surfaceType: string | null;
  surfaceId: string | null;
}

interface ResolvedStation {
  id: string;
  is_active: boolean;
  name: string;
  city: string;
  visibility_status?: string | null;
  geo_review_status?: string | null;
}

const fuelTypes: FuelType[] = ["gasolina_comum", "gasolina_aditivada", "etanol", "diesel_s10", "diesel_comum", "gnv"];

type EvidenceMode = "placa_faixa" | "sem_placa_faixa";
type ManualPriceSource = "" | "bomba" | "recibo" | "painel_interno" | "informacao_local";

const isColumnError = (message?: string) => {
  const value = (message ?? "").toLowerCase();
  return value.includes("does not exist") || value.includes("could not find") || value.includes("schema cache");
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const failure = (error: string, errorCode: string, retryable = false): SubmitState => ({
  error,
  errorCode,
  retryable,
  success: false,
  reportIds: [],
  submittedReports: [],
  packageId: undefined,
  noticeTitle: null,
  noticeBody: null,
  noticeTone: null,
  noticeCode: null
});

const success = (input: {
  reportId: string;
  reportIds: string[];
  submittedReports: SubmittedReportSummary[];
  packageId: string;
  stationId: string;
  notice?: SubmissionNotice | null;
}): SubmitState => ({
  error: null,
  errorCode: null,
  retryable: false,
  success: true,
  reportId: input.reportId,
  reportIds: input.reportIds,
  submittedReports: input.submittedReports,
  packageId: input.packageId,
  stationId: input.stationId,
  noticeTitle: input.notice?.title ?? null,
  noticeBody: input.notice?.body ?? null,
  noticeTone: input.notice?.tone ?? null,
  noticeCode: input.notice?.code ?? null
});

function buildSubmissionNotice(input: {
  duplicateLikely: boolean;
  alreadyRecentPrice: boolean;
  priceConflict: boolean;
  priceDiscrepancy: boolean;
}): SubmissionNotice | null {
  if (input.duplicateLikely) {
    return {
      title: "Duplicado provável",
      body: "O envio entrou em revisão porque parece repetido.",
      tone: "warning",
      code: "duplicate_likely"
    };
  }

  if (input.priceConflict || input.priceDiscrepancy) {
    return {
      title: "Entrou em revisão",
      body: "O envio foi salvo e vai passar por revisão.",
      tone: "warning",
      code: input.priceConflict ? "price_conflict" : "price_discrepancy"
    };
  }

  if (input.alreadyRecentPrice) {
    return {
      title: "Já existe preço recente",
      body: "Seu envio segue junto de uma leitura recente.",
      tone: "info",
      code: "recent_price"
    };
  }

  return null;
}

function buildPackageSubmissionNotice(results: SubmissionPackageResult[]): SubmissionNotice | null {
  if (results.length === 0) {
    return null;
  }

  if (results.length === 1) {
    return results[0]?.notice ?? null;
  }

  if (results.some((result) => result.notice?.tone === "warning" || result.risk.level === "high")) {
    return {
      title: "Pacote salvo para revisão",
      body: `Recebemos ${results.length} preços do mesmo posto. Combustíveis com divergência forte ficam destacados na moderação.`,
      tone: "warning",
      code: "package_review"
    };
  }

  if (results.every((result) => result.routing.autoApproved)) {
    return {
      title: "Pacote publicado",
      body: `Publicamos ${results.length} preços do mesmo posto com a mesma evidência.`,
      tone: "success",
      code: "package_auto_approved"
    };
  }

  if (results.some((result) => result.routing.fastLane)) {
    return {
      title: "Pacote em revisão rápida",
      body: `Recebemos ${results.length} preços e encaminhamos o pacote para uma revisão mais curta.`,
      tone: "info",
      code: "package_fast_lane"
    };
  }

  return {
    title: "Pacote salvo",
    body: `Recebemos ${results.length} preços com a mesma foto e o mesmo posto.`,
    tone: "info",
    code: "package_saved"
  };
}

const getString = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

const buildStationProposalStreet = (name: string, street: string, neighborhood: string) => [street, neighborhood, name]
  .map((value) => value.trim())
  .filter(Boolean)
  .join(" · ")
  .trim();

function parseSubmissionEntries(formData: FormData): SubmissionEntry[] {
  const serializedEntries = parseSerializedFuelPriceEntries(getString(formData, "priceEntriesJson"));
  const legacyFuelType = getString(formData, "fuelType") as FuelType;
  const legacyPrice = getString(formData, "price");
  const rawEntries = serializedEntries.length > 0
    ? serializedEntries
    : fuelTypes.includes(legacyFuelType) && legacyPrice
      ? [{ fuelType: legacyFuelType, price: legacyPrice }]
      : [];

  const seen = new Set<FuelType>();
  const entries: SubmissionEntry[] = [];

  rawEntries.forEach((entry) => {
    if (!fuelTypes.includes(entry.fuelType) || seen.has(entry.fuelType)) {
      return;
    }

    const normalizedPrice = entry.price.trim();
    const numericPrice = Number(normalizedPrice.replace(",", "."));
    if (!normalizedPrice || Number.isNaN(numericPrice) || numericPrice <= 0) {
      return;
    }

    seen.add(entry.fuelType);
    entries.push({
      fuelType: entry.fuelType,
      price: numericPrice,
      priceLabel: normalizedPrice
    });
  });

  return entries;
}
async function getSubmissionContext(formData: FormData): Promise<SubmissionRequestContext> {
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
    const nickname = getString(formData, "nickname");
    const honeypot = getString(formData, "website");
    const photo = formData.get("photo");
    const priceEntries = parseSubmissionEntries(formData);
    const primaryEntry = priceEntries[0];
    const primaryFuelType = primaryEntry?.fuelType ?? "gasolina_comum";
    const primaryPriceLabel = primaryEntry?.priceLabel ?? "";
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
    const evidenceMode: EvidenceMode = getString(formData, "evidenceMode") === "sem_placa_faixa" ? "sem_placa_faixa" : "placa_faixa";
    const rawPriceSource = getString(formData, "priceSource");
    const priceSource: ManualPriceSource = rawPriceSource === "bomba"
      || rawPriceSource === "recibo"
      || rawPriceSource === "painel_interno"
      || rawPriceSource === "informacao_local"
      ? rawPriceSource
      : "";
    const requiresStrictPhoto = evidenceMode === "placa_faixa";
    const attachedPhoto = photo instanceof File && photo.size > 0 ? photo : null;

    if (honeypot) {
      await recordOperationalEvent({
        eventType: "submission_blocked",
        severity: "warning",
        scopeType: "submission",
        stationId: stationId || null,
        fuelType: primaryFuelType,
        ipHash: context.ipHash,
        reason: "honeypot"
      });
      return failure("Não foi possível enviar agora.", "submission_blocked", false);
    }

    if (!stationId && !stationProposalMode) {
      return failure("Selecione um posto.", "validation", false);
    }

    if (priceEntries.length === 0) {
      await recordOperationalEvent({
        eventType: "submission_blocked",
        severity: "warning",
        scopeType: "submission",
        stationId: stationId || null,
        fuelType: primaryFuelType,
        ipHash: context.ipHash,
        reason: "invalid_price_entries"
      });
      return failure("Preencha pelo menos um preço válido.", "validation", false);
    }

    if (requiresStrictPhoto && !attachedPhoto) {
      await recordOperationalEvent({
        eventType: "upload_rejected_missing",
        severity: "warning",
        scopeType: "submission",
        stationId: stationId || null,
        fuelType: primaryFuelType,
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

    if (!requiresStrictPhoto && !priceSource) {
      return failure("Escolha de onde veio o preço quando não houver placa ou faixa.", "validation", false);
    }

    if (attachedPhoto) {
      const validationError = validateReportPhoto(attachedPhoto);
      if (validationError) {
        await recordOperationalEvent({
          eventType: validationError.includes("5 MB") ? "upload_rejected_size" : "upload_rejected_type",
          severity: "warning",
          scopeType: "submission",
          stationId: stationId || null,
          fuelType: primaryFuelType,
          ipHash: context.ipHash,
          reason: validationError
        });
        return failure(validationError, "validation", false);
      }
    }

    const supabase = createSupabaseServiceClient();
    let station: ResolvedStation | null = null;
    let stationError: { message: string } | null = null;
    const hasProposalCoords = stationProposalLat !== null
      && stationProposalLng !== null
      && !Number.isNaN(stationProposalLat)
      && !Number.isNaN(stationProposalLng);

    if (!stationId && stationProposalMode) {
      await recordOperationalEvent({
        eventType: "station_proposal_flow_opened",
        severity: "info",
        scopeType: "submission",
        stationId: null,
        fuelType: primaryFuelType,
        ipHash: context.ipHash,
        reason: "proposal_mode",
        payload: {
          hasGeo: hasProposalCoords,
          hasName: Boolean(stationProposalName),
          hasStreet: Boolean(stationProposalStreet),
          hasNeighborhood: Boolean(stationProposalNeighborhood),
          hasBrand: Boolean(stationProposalBrand),
          packageSize: priceEntries.length
        }
      });

      if (!stationProposalConfirmed) {
        return failure("Confirme o posto novo ou escolha um posto da lista.", "station_proposal_unconfirmed", false);
      }

      if (!stationProposalName || !stationProposalCity || (!stationProposalStreet && !hasProposalCoords)) {
        return failure("Preencha nome e cidade. Endereço ou GPS ajudam a criar o posto novo.", "validation", false);
      }

      const proposalName = stationProposalName.trim();
      const proposalStreet = stationProposalStreet.trim();
      const proposalNeighborhood = stationProposalNeighborhood.trim();
      const proposalBrand = stationProposalBrand.trim();
      const proposalCity = stationProposalCity.trim();
      const proposalAddress = buildStationProposalStreet(proposalName, proposalStreet || "Sem endereço informado", proposalNeighborhood || proposalCity);
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
        .select("id,is_active,name,city,visibility_status,geo_review_status")
        .single();

      if (createStationError || !createdStation) {
        await recordOperationalEvent({
          eventType: "submission_blocked",
          severity: "error",
          scopeType: "submission",
          stationId: null,
          fuelType: primaryFuelType,
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
        fuelType: primaryFuelType,
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
          proposalStreet,
          packageSize: priceEntries.length
        }
      });

      stationId = createdStation.id;
      station = createdStation as ResolvedStation;
    } else {
      const { data: fetchedStation, error: fetchedStationError } = await supabase
        .from("stations")
        .select("id,is_active,name,city,visibility_status,geo_review_status")
        .eq("id", stationId)
        .maybeSingle();
      station = fetchedStation as ResolvedStation | null;
      stationError = fetchedStationError as { message: string } | null;
    }
    if (stationError || !station?.is_active) {
      await recordOperationalEvent({
        eventType: "submission_blocked",
        severity: "warning",
        scopeType: "submission",
        stationId,
        fuelType: primaryFuelType,
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
        fuelType: primaryFuelType,
        ipHash: context.ipHash,
        city: station.city,
        reason: "network_offline",
        payload: { simulationMode: context.simulationMode, packageSize: priceEntries.length }
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
        fuelType: primaryFuelType,
        ipHash: context.ipHash,
        city: station.city,
        reason: "network_timeout",
        payload: { simulationMode: context.simulationMode, packageSize: priceEntries.length }
      });
      return failure("A conexão demorou demais para responder. Tente novamente sem refazer o formulário.", "network_timeout", true);
    }

    if (context.simulationMode === "slow") {
      await delay(getNetworkSimulationDelayMs(context.simulationMode));
    }

    for (const entry of priceEntries) {
      const limitCheck = await checkSubmissionRateLimit({
        ipHash: context.ipHash ?? "ip-missing",
        stationId,
        fuelType: entry.fuelType,
        deviceId: context.deviceId,
        sessionId: context.sessionId,
        surfaceType: context.surfaceType,
        surfaceId: context.surfaceId
      });

      if (!limitCheck.allowed) {
        const rateLimitMessage = limitCheck.reason === "proteção temporariamente indisponível"
          ? "A proteção do envio está temporariamente indisponível. Tente novamente em instantes."
          : `Você já enviou muitas vezes em pouco tempo. Tente novamente em ${Math.max(1, Math.ceil((new Date(limitCheck.blockedUntil ?? new Date().toISOString()).getTime() - Date.now()) / 60000))} min.`;

        await recordOperationalEvent({
          eventType: "submission_blocked",
          severity: "warning",
          scopeType: "submission",
          stationId,
          fuelType: entry.fuelType,
          ipHash: context.ipHash,
          city: station.city,
          reason: limitCheck.reason ?? "limit_exceeded",
          payload: {
            attemptCount: limitCheck.attemptCount,
            blockedUntil: limitCheck.blockedUntil,
            windowStart: limitCheck.windowStart,
            packageSize: priceEntries.length
          }
        });

        return failure(rateLimitMessage, "rate_limited", false);
      }
    }

    let photoHash: string | null = null;
    let publicPhotoUrl = "";
    const timestamp = new Date().toISOString();
    const packageId = createHash("sha256")
      .update([
        stationId,
        timestamp,
        nickname || "anon",
        context.ipHash || "no-ip",
        priceEntries.map((entry) => `${entry.fuelType}:${entry.priceLabel}`).join("|")
      ].join("::"))
      .digest("hex")
      .slice(0, 24);

    if (attachedPhoto) {
      const extension = attachedPhoto.name.split(".").pop()?.toLowerCase() || "jpg";
      const contentType = attachedPhoto.type || (extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg");
      const suffix = `${packageId}-${Date.now()}.${extension}`;
      const filePath = buildReportPhotoPath(stationId, suffix);
      const fileBuffer = Buffer.from(await attachedPhoto.arrayBuffer());
      photoHash = createHash("sha256").update(fileBuffer).digest("hex");

      if (context.simulationMode === "upload_fail") {
        await delay(getNetworkSimulationDelayMs(context.simulationMode));
        await recordOperationalEvent({
          eventType: "upload_failed",
          severity: "error",
          scopeType: "submission",
          stationId,
          fuelType: primaryFuelType,
          ipHash: context.ipHash,
          city: station.city,
          reason: "simulated_upload_failure",
          payload: { simulationMode: context.simulationMode, filePath, packageId }
        });
        return failure("A foto não subiu neste teste. O resto do formulário ficou salvo na tela. Tente novamente.", "upload_failed", true);
      }

      const { error: uploadError } = await supabase.storage
        .from(REPORT_PHOTO_BUCKET)
        .upload(filePath, fileBuffer, { contentType, upsert: false });

      if (uploadError) {
        const uploadInterrupted = /abort|interrupt|network|fetch/i.test(uploadError.message);
        await recordOperationalEvent({
          eventType: "upload_failed",
          severity: "error",
          scopeType: "submission",
          stationId,
          fuelType: primaryFuelType,
          ipHash: context.ipHash,
          city: station.city,
          reason: uploadError.message,
          payload: {
            bucket: REPORT_PHOTO_BUCKET,
            filePath,
            packageId
          }
        });
        return failure(
          uploadInterrupted
            ? "O envio da foto foi interrompido no meio do caminho. Tente reenviar sem recomeçar."
            : "Não foi possível enviar a foto agora. A parte preenchida ficou aqui; tente novamente sem recomeçar.",
          uploadInterrupted ? "upload_interrupted" : "upload_failed",
          true
        );
      }

      const { data: publicUrl } = supabase.storage.from(REPORT_PHOTO_BUCKET).getPublicUrl(filePath);
      publicPhotoUrl = publicUrl.publicUrl;
    }

    const distanceRaw = getString(formData, "locationDistance");
    const distance = distanceRaw ? Number(distanceRaw) : null;
    const locationConfidence = (getString(formData, "locationConfidence") as "high" | "low" | "none") || "none";
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const duplicatePhotoReports = photoHash
      ? await supabase.from("price_reports").select("id").eq("photo_hash", photoHash).gt("created_at", fortyEightHoursAgo).limit(1)
      : { data: [] as Array<{ id: string }> };
    const potentialPhotoReuse = Boolean(duplicatePhotoReports.data?.[0]?.id);
    const contributorTrust = await buildContributorTrustProfile({
      nickname: nickname || null,
      ipHash: context.ipHash,
      deviceId: context.deviceId,
      sessionId: context.sessionId,
      stationId,
      stationCity: station.city
    });
    const progressiveRollout = await getProgressiveTrustRollout();
    const packagePriceMap = Object.fromEntries(priceEntries.map((entry) => [entry.fuelType, entry.priceLabel]));
    const packageFuelTypes = priceEntries.map((entry) => entry.fuelType);
    const submittedResults: SubmissionPackageResult[] = [];

    for (const entry of priceEntries) {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { data: existingReports } = await supabase
        .from("price_reports")
        .select("reconciliation_id")
        .eq("station_id", stationId)
        .eq("fuel_type", entry.fuelType)
        .eq("price", entry.price)
        .in("status", ["pending", "flagged", "approved"])
        .gt("created_at", sixHoursAgo)
        .limit(1);

      const reconciliationId = existingReports?.[0]?.reconciliation_id || `${packageId}:${entry.fuelType}`;
      const isConfirmation = Boolean(existingReports?.[0]?.reconciliation_id) && !potentialPhotoReuse;
      const isDuplicate = Boolean(existingReports?.[0]?.reconciliation_id) && potentialPhotoReuse;
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const { data: conflictingReports } = await supabase
        .from("price_reports")
        .select("id,price")
        .eq("station_id", stationId)
        .eq("fuel_type", entry.fuelType)
        .neq("price", entry.price)
        .neq("status", "rejected")
        .gt("reported_at", twelveHoursAgo)
        .limit(1);
      const isPriceConflict = Boolean(conflictingReports?.[0]);

      const { data: lastApproved } = await supabase
        .from("price_reports")
        .select("price")
        .eq("station_id", stationId)
        .eq("fuel_type", entry.fuelType)
        .eq("status", "approved")
        .order("reported_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let priceDiscrepancy = false;
      if (lastApproved?.price) {
        const diff = Math.abs(entry.price - Number(lastApproved.price)) / Number(lastApproved.price);
        if (diff > 0.2) {
          priceDiscrepancy = true;
        }
      }

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentReports } = await supabase
        .from("price_reports")
        .select("id,price,status,reported_at")
        .eq("station_id", stationId)
        .eq("fuel_type", entry.fuelType)
        .neq("status", "rejected")
        .gt("reported_at", twentyFourHoursAgo)
        .order("reported_at", { ascending: false })
        .limit(6);

      const hasRecentPrice = Boolean(recentReports?.[0]);
      const sameRecentPrice = Boolean(recentReports?.some((report) => Number(report.price) === entry.price));
      const alreadyRecentPrice = hasRecentPrice && !sameRecentPrice;
      const duplicateLikely = potentialPhotoReuse || isDuplicate || sameRecentPrice;
      const rawSubmissionRisk = evaluateSubmissionRisk({
        stationId,
        stationCity: station.city,
        stationVisibilityStatus: station.visibility_status ?? null,
        stationGeoReviewStatus: station.geo_review_status ?? null,
        stationProposalMode,
        locationConfidence,
        duplicateLikely,
        potentialPhotoReuse,
        isDuplicate,
        priceConflict: isPriceConflict,
        priceDiscrepancy,
        alreadyRecentPrice,
        deviceId: context.deviceId,
        sessionId: context.sessionId,
        nickname: nickname || null,
        contributorProfile: contributorTrust
      });
      const rawRoutingDecision = decideSubmissionRouting({
        rollout: progressiveRollout,
        trust: contributorTrust,
        risk: rawSubmissionRisk
      });
      const effectiveSubmissionRisk = evidenceMode === "sem_placa_faixa"
        ? {
            ...rawSubmissionRisk,
            level: "high" as const,
            reasons: [...rawSubmissionRisk.reasons, "Sem placa/faixa: exige revisão humana"],
            flags: [...rawSubmissionRisk.flags, "manual_proof_mode"]
          }
        : rawSubmissionRisk;
      const effectiveRoutingDecision = evidenceMode === "sem_placa_faixa"
        ? {
            outcome: "review_normal" as const,
            fastLane: false,
            autoApproved: false,
            phase: rawRoutingDecision.phase,
            shadowMode: rawRoutingDecision.shadowMode,
            reasons: [...rawRoutingDecision.reasons, "Modo sem placa/faixa bloqueia fast-lane e autoaprovação"]
          }
        : rawRoutingDecision;
      const baseNotice = buildSubmissionNotice({
        duplicateLikely,
        alreadyRecentPrice,
        priceConflict: isPriceConflict,
        priceDiscrepancy
      });
      const submissionNotice = evidenceMode === "sem_placa_faixa"
        ? {
            title: "Entrou em revisão reforçada",
            body: "Envio salvo sem placa/faixa. Ele vai para revisão humana antes de publicar.",
            tone: "warning" as const,
            code: "manual_proof_review"
          }
        : effectiveRoutingDecision.autoApproved
          ? {
              title: "Preço publicado",
              body: "Envio autoaprovado com confiança progressiva e risco baixo.",
              tone: "success" as const,
              code: "auto_approved_low_risk"
            }
          : effectiveRoutingDecision.fastLane
            ? {
                title: "Entrou em revisão rápida",
                body: "Envio foi para fast-lane por confiança boa e risco controlado.",
                tone: "info" as const,
                code: "fast_lane_review"
              }
            : baseNotice;
      const shouldFlagForReview = shouldMarkSubmissionFlagged({ potentialPhotoReuse, isDuplicate });
      const resolvedStatus = effectiveRoutingDecision.autoApproved ? "approved" : shouldFlagForReview ? "flagged" : "pending";
      const priorityScore = getReportPriorityScore({
        fuelType: entry.fuelType,
        price: entry.price,
        sourceKind: "community",
        locationConfidence,
        metadata: {
          submission_routing: effectiveRoutingDecision.outcome,
          contributor_trust_level: contributorTrust.level,
          submission_risk_level: effectiveSubmissionRisk.level,
          potential_photo_reuse: potentialPhotoReuse,
          price_discrepancy: priceDiscrepancy,
          evidence_mode: evidenceMode,
          package_id: packageId,
          package_size: priceEntries.length
        }
      }, station as never, {
        betaInviteCode: context.betaToken,
        reporterTrustScore: contributorTrust.operationalScore
      });

      const metadata: Record<string, unknown> = {
        package_id: packageId,
        package_size: priceEntries.length,
        package_primary_fuel_type: primaryFuelType,
        package_primary_price: primaryPriceLabel,
        package_fuel_types: packageFuelTypes,
        package_prices: packagePriceMap,
        package_photo_shared: Boolean(attachedPhoto),
        package_entry_fuel_type: entry.fuelType,
        package_entry_price: entry.priceLabel,
        price_discrepancy: priceDiscrepancy,
        potential_photo_reuse: potentialPhotoReuse,
        is_price_conflict: isPriceConflict,
        is_duplicate: isDuplicate,
        duplicate_likely: duplicateLikely,
        already_recent_price: alreadyRecentPrice,
        review_reason: submissionNotice?.code ?? null,
        submission_routing: effectiveRoutingDecision.outcome,
        submission_routing_reasons: effectiveRoutingDecision.reasons,
        submission_risk_level: effectiveSubmissionRisk.level,
        submission_risk_reasons: effectiveSubmissionRisk.reasons,
        submission_risk_flags: effectiveSubmissionRisk.flags,
        contributor_trust_level: contributorTrust.level,
        contributor_trust_score: contributorTrust.operationalScore,
        contributor_trust_reasons: contributorTrust.reasons,
        contributor_history_summary: contributorTrust.historySummary,
        progressive_trust_rollout_phase: progressiveRollout.phase,
        progressive_trust_rollout_label: progressiveRollout.label,
        device_id: context.deviceId,
        session_id: context.sessionId,
        station_city: station.city,
        location_confidence: locationConfidence,
        evidence_mode: evidenceMode,
        price_source: priceSource || null,
        has_context_photo: Boolean(attachedPhoto),
        proof_strength: evidenceMode === "placa_faixa" ? "strong" : attachedPhoto ? "medium" : "light"
      };

      const fullPayload = {
        station_id: stationId,
        fuel_type: entry.fuelType,
        price: entry.price,
        photo_url: publicPhotoUrl,
        photo_taken_at: attachedPhoto ? timestamp : null,
        reported_at: timestamp,
        approved_at: effectiveRoutingDecision.autoApproved ? timestamp : null,
        reporter_nickname: nickname || null,
        ip_hash: context.ipHash,
        status: resolvedStatus,
        source_kind: "community",
        moderated_by: effectiveRoutingDecision.autoApproved ? "system:progressive_trust" : null,
        photo_hash: photoHash,
        location_distance: distance,
        location_confidence: locationConfidence,
        reconciliation_id: reconciliationId,
        is_confirmation: isConfirmation,
        moderation_reason: submissionNotice?.code ?? null,
        moderation_note: submissionNotice?.body ?? null,
        metadata,
        version: 1
      };

      const { data: report, error: insertError } = await (async () => {
        const fullInsert = await supabase.from("price_reports").insert(fullPayload).select("id").single();
        if (!fullInsert.error || !isColumnError(fullInsert.error.message)) {
          return fullInsert;
        }

        return supabase
          .from("price_reports")
          .insert({
            station_id: stationId,
            fuel_type: entry.fuelType,
            price: entry.price,
            photo_url: publicPhotoUrl,
            photo_taken_at: attachedPhoto ? timestamp : null,
            reported_at: timestamp,
            reporter_nickname: nickname || null,
            status: resolvedStatus,
            moderation_note: submissionNotice?.body ?? null,
            reconciliation_id: reconciliationId,
            metadata,
            version: 1
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
          fuelType: entry.fuelType,
          ipHash: context.ipHash,
          city: station.city,
          reason: insertError?.message ?? "failed_to_save_report",
          payload: {
            stationName: station.name,
            photoHash,
            evidenceMode,
            priceSource: priceSource || null,
            packageId,
            packageSize: priceEntries.length
          }
        });
        return failure("Não foi possível salvar o envio agora. Tente novamente sem refazer o formulário.", "submission_failed", true);
      }

      await recordPriceReportAuditEvent({
        reportId: report.id,
        eventType: "created",
        payload: {
          stationId,
          fuelType: entry.fuelType,
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
          reviewReason: submissionNotice?.code ?? null,
          contributorTrustLevel: contributorTrust.level,
          contributorTrustScore: contributorTrust.operationalScore,
          submissionRiskLevel: effectiveSubmissionRisk.level,
          submissionRiskReasons: effectiveSubmissionRisk.reasons,
          submissionRouting: effectiveRoutingDecision.outcome,
          submissionRoutingReasons: effectiveRoutingDecision.reasons,
          rolloutPhase: progressiveRollout.phase,
          evidenceMode,
          priceSource: priceSource || null,
          hasContextPhoto: Boolean(attachedPhoto),
          packageId,
          packageSize: priceEntries.length,
          packageEntryPrice: entry.priceLabel
        }
      });

      if (effectiveRoutingDecision.autoApproved) {
        await recordPriceReportAuditEvent({
          reportId: report.id,
          eventType: "moderated",
          payload: {
            decision: "approved",
            moderationNote: submissionNotice?.body ?? null,
            automated: true,
            stationId,
            fuelType: entry.fuelType,
            price: entry.price,
            submissionRouting: effectiveRoutingDecision.outcome,
            contributorTrustLevel: contributorTrust.level,
            submissionRiskLevel: effectiveSubmissionRisk.level,
            packageId,
            packageSize: priceEntries.length
          }
        });
      }

      await recordOperationalEvent({
        eventType: "submission_accepted",
        severity: effectiveRoutingDecision.autoApproved || effectiveRoutingDecision.fastLane ? "info" : effectiveSubmissionRisk.level === "high" ? "warning" : "info",
        scopeType: "submission",
        stationId,
        reportId: report.id,
        city: station.city,
        fuelType: entry.fuelType,
        ipHash: context.ipHash,
        reason: effectiveRoutingDecision.outcome,
        payload: {
          stationName: station.name,
          nickname: nickname || null,
          locationConfidence,
          priceDiscrepancy,
          potentialPhotoReuse,
          isPriceConflict,
          isDuplicate,
          duplicateLikely,
          alreadyRecentPrice,
          reviewReason: submissionNotice?.code ?? null,
          contributorTrustLevel: contributorTrust.level,
          contributorTrustReasons: contributorTrust.reasons,
          contributorHistorySummary: contributorTrust.historySummary,
          submissionRiskLevel: effectiveSubmissionRisk.level,
          submissionRiskReasons: effectiveSubmissionRisk.reasons,
          submissionRouting: effectiveRoutingDecision.outcome,
          submissionRoutingReasons: effectiveRoutingDecision.reasons,
          rolloutPhase: progressiveRollout.phase,
          evidenceMode,
          priceSource: priceSource || null,
          hasContextPhoto: Boolean(attachedPhoto),
          packageId,
          packageSize: priceEntries.length,
          packageEntryPrice: entry.priceLabel
        }
      });

      submittedResults.push({
        reportId: report.id,
        fuelType: entry.fuelType,
        priceLabel: entry.priceLabel,
        notice: submissionNotice,
        routing: effectiveRoutingDecision,
        risk: effectiveSubmissionRisk
      });
    }

    await recordOperationalEvent({
      eventType: "submission_package_accepted",
      severity: submittedResults.some((result) => result.risk.level === "high") ? "warning" : "info",
      scopeType: "submission",
      scopeId: packageId,
      stationId,
      fuelType: primaryFuelType,
      ipHash: context.ipHash,
      city: station.city,
      reason: "package_saved",
      payload: {
        packageId,
        packageSize: priceEntries.length,
        reportIds: submittedResults.map((result) => result.reportId),
        fuelTypes: submittedResults.map((result) => result.fuelType),
        priceMap: packagePriceMap,
        evidenceMode,
        priceSource: priceSource || null
      }
    });

    const packageNotice = buildPackageSubmissionNotice(submittedResults);
    const submittedReports = submittedResults.map((result) => ({
      reportId: result.reportId,
      fuelType: result.fuelType,
      price: result.priceLabel
    }));

    revalidatePath("/");
    revalidatePath("/postos");
    revalidatePath("/postos/sem-atualizacao");
    revalidatePath("/atualizacoes");
    revalidatePath(`/postos/${stationId}`);
    revalidatePath("/admin");
    revalidatePath("/auditoria");

    return success({
      reportId: submittedResults[0]!.reportId,
      reportIds: submittedResults.map((result) => result.reportId),
      submittedReports,
      packageId,
      stationId,
      notice: packageNotice
    });
  } catch (error) {
    logRuntimeIssue("Unexpected failure in submitPriceReportAction", error, {
      scope: "public",
      surface: "actions/enviar.submitPriceReportAction",
      fallback: "return-retryable-error",
      optional: true
    });
    return failure("Houve um erro temporario ao enviar a foto. Tente novamente sem refazer o restante.", "submission_unexpected", true);
  }
}
