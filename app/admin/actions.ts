"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import type { FuelType } from "@/lib/types";

import { recordAdminActionLog, recordOperationalEvent } from "@/lib/ops/logs";
import { recordPriceReportAuditEvent } from "@/lib/audit/events";
import { requireAdminUser } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { updateCollectorScore } from "@/lib/ops/collector-trust";
import { mapStationRow } from "@/lib/data/mappers";
import { getActiveStations, getReportByIdAdmin, getStationByIdAdmin } from "@/lib/data/queries";
import { canPromoteStationToMap } from "@/lib/ops/territorial-curation";
import { grantStationEditorRole, revokeStationEditorRole } from "@/lib/ops/station-editors";
import { StationEditorInviteError, createStationEditorInvite, revokeStationEditorInvite } from "@/lib/ops/station-editor-invites";
import { getAuditCitySlug } from "@/lib/audit/cities";
import {
  territoryWorkflowBlockLabel,
  territoryWorkflowDueAtForKind,
  territoryWorkflowDueLabel,
  territoryWorkflowKey,
  type TerritoryWorkflowBlockKind,
  type TerritoryWorkflowDueKind,
  type TerritoryWorkflowResponsibleRole,
  type TerritoryWorkflowState
} from "@/lib/ops/territory-workflow";

export interface AdminLoginState {
  error: string | null;
  success: boolean;
  role: "admin" | "station_editor" | null;
}

const ADMIN_ROUTE = "/admin" as Route;
const STATION_EDITOR_ROUTE = "/postos/cadastrar" as Route;
const ADMIN_LOGIN_ROUTE = "/admin/login" as Route;

function resolveStationEditorInviteCreateFailure(error: unknown): {
  reason: string;
  schemaMissing: boolean;
  schemaPartial: boolean;
  serviceUnavailable: boolean;
  permissionDenied: boolean;
  errorCode: string | null;
} {
  const errorCode = error instanceof StationEditorInviteError ? (error.code ?? null) : null;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const isSchemaMissing = (
    errorCode === "42P01"
    || errorCode === "PGRST205"
    || message.includes("does not exist")
    || message.includes("schema cache")
    || message.includes("not found")
  );
  const isSchemaPartial = (
    errorCode === "42703"
    || errorCode === "PGRST204"
    || message.includes("could not find the '")
    || message.includes("column")
  );
  const isServiceUnavailable = message.includes("supabase_service_role_key") || message.includes("service_role");
  const isPermissionDenied = errorCode === "42501" || message.includes("permission denied");

  let reason = "invite_create_failed";
  if (isServiceUnavailable) reason = "invite_service_unavailable";
  else if (isPermissionDenied) reason = "invite_permission_denied";
  else if (isSchemaPartial) reason = "invite_schema_partial";
  else if (isSchemaMissing) reason = "invite_schema_missing";

  return {
    reason,
    schemaMissing: isSchemaMissing,
    schemaPartial: isSchemaPartial,
    serviceUnavailable: isServiceUnavailable,
    permissionDenied: isPermissionDenied,
    errorCode
  };
}

function normalizeNotice(action: "approved" | "rejected") {
  return action === "approved" ? "Aprovado no painel." : "Rejeitado no painel.";
}

function isLegacyPriceReportWriteError(message: string | undefined) {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("approved_at")
    || normalized.includes("rejected_at")
    || normalized.includes("moderated_by")
    || normalized.includes("version")
    || normalized.includes("does not exist")
    || normalized.includes("could not find")
    || normalized.includes("schema cache")
  );
}

function getOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function parseOptionalNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;

  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseStationIdList(formData: FormData, key = "stationIds") {
  return String(formData.get(key) ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function signInAdminAction(_prevState: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    await recordOperationalEvent({
      eventType: "auth_failed",
      severity: "warning",
      scopeType: "auth",
      actorEmail: email || null,
      reason: "missing_credentials"
    });
    return { error: "Informe e-mail e senha.", success: false, role: null };
  }

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    await recordOperationalEvent({
      eventType: "auth_failed",
      severity: "warning",
      scopeType: "auth",
      actorEmail: email,
      reason: signInError.message
    });
    return { error: "Não foi possível entrar com essas credenciais.", success: false, role: null };
  }

  const { data: adminRow, error: adminError } = await supabase.from("admin_users").select("email,role").eq("email", email).maybeSingle();

  if (adminError) {
    await recordOperationalEvent({
      eventType: "auth_failed",
      severity: "error",
      scopeType: "auth",
      actorEmail: email,
      reason: adminError.message
    });
    return { error: "Falha ao validar acesso restrito.", success: false, role: null };
  }

  if (!adminRow?.email) {
    await supabase.auth.signOut();
    await recordOperationalEvent({
      eventType: "auth_failed",
      severity: "warning",
      scopeType: "auth",
      actorEmail: email,
      reason: "email_not_allowlisted"
    });
    return { error: "Seu e-mail não está liberado para o acesso restrito.", success: false, role: null };
  }

  await recordOperationalEvent({
    eventType: "auth_success",
    severity: "info",
    scopeType: "auth",
    actorEmail: email,
    reason: "admin_login"
  });

  redirect(adminRow.role === "station_editor" ? STATION_EDITOR_ROUTE : ADMIN_ROUTE);
}

export async function signOutAdminAction() {
  const admin = await requireAdminUser();
  const supabase = await createSupabaseServerClient();

  await recordAdminActionLog({
    actionKind: "logout",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "session",
    note: "Admin saiu da sessão."
  });

  await recordOperationalEvent({
    eventType: "auth_logout",
    severity: "info",
    scopeType: "auth",
    actorId: admin.id,
    actorEmail: admin.email,
    reason: "admin_logout"
  });

  await supabase.auth.signOut();
  redirect(ADMIN_LOGIN_ROUTE);
}

async function moderateReports(reportIds: string[], decision: "approved" | "rejected", moderationNote?: string) {
  const admin = await requireAdminUser();
  const supabase = createSupabaseServiceClient();

  const { data: reports, error: reportError } = await supabase
    .from("price_reports")
    .select("id,station_id,fuel_type,price,reported_at,reporter_nickname,ip_hash,status,moderation_note,location_confidence,metadata")
    .in("id", reportIds) as {
      data: {
        id: string;
        station_id: string;
        fuel_type: string;
        price: number;
        reported_at: string;
        reporter_nickname: string | null;
        ip_hash: string | null;
        status: string;
        moderation_note: string | null;
        location_confidence: "high" | "low" | "none" | null;
        metadata: Record<string, unknown> | null;
      }[] | null;
      error: any;
    };

  if (reportError || !reports || reports.length === 0) {
    redirect(`${ADMIN_ROUTE}?error=report_not_found` as Route);
  }

  const report = reports[0];
  const now = new Date().toISOString();
  const note = moderationNote?.trim() || normalizeNotice(decision);
  const updatePayload = decision === "approved"
    ? {
        status: decision,
        moderation_note: note,
        moderated_by: admin.id,
        approved_at: now,
        rejected_at: null
      }
    : {
        status: decision,
        moderation_note: note,
        moderated_by: admin.id,
        rejected_at: now,
        approved_at: null
      };

  let { error } = await supabase
    .from("price_reports")
    .update(updatePayload)
    .in("id", reportIds);

  if (error && isLegacyPriceReportWriteError(error.message)) {
    const fallbackPayload = {
      status: decision,
      moderation_note: note
    };

    const retryResult = await supabase
      .from("price_reports")
      .update(fallbackPayload)
      .in("id", reportIds);

    error = retryResult.error;
  }

  if (error) {
    await recordOperationalEvent({
      eventType: "moderation_failed",
      severity: "error",
      scopeType: "report",
      scopeId: reportIds[0],
      actorId: admin.id,
      actorEmail: admin.email,
      stationId: report.station_id,
      fuelType: report.fuel_type,
      reason: error.message,
      payload: {
        decision,
        moderationNote: note,
        additionalReportIds: reportIds.slice(1)
      }
    });
    redirect(`${ADMIN_ROUTE}?error=moderation_failed` as Route);
  }

  try {
    const trustUpdates = reports.map((item) => {
      return updateCollectorScore(item.reporter_nickname, item.ip_hash, {
        action: decision === "approved" ? "approve" : "reject",
        reason: note,
        photoQuality: undefined,
        locationConfidence: item.location_confidence === "high" ? "high" : "low",
        isConsistencyBonus: false
      });
    });
    await Promise.all(trustUpdates);
  } catch (err) {
    console.error("Failed to update collector trust scores:", err);
  }

  await recordAdminActionLog({
    actionKind: decision === "approved" ? "moderation_approved" : "moderation_rejected",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "report",
    targetId: reportIds[0],
    note,
    payload: {
      stationId: report.station_id,
      fuelType: report.fuel_type,
      price: report.price,
      reportedAt: report.reported_at,
      groupedCount: reportIds.length
    }
  });

  await recordOperationalEvent({
    eventType: decision === "approved" ? "moderation_approved" : "moderation_rejected",
    severity: decision === "approved" ? "info" : "warning",
    scopeType: "report",
    scopeId: reportIds[0],
    actorId: admin.id,
    actorEmail: admin.email,
    stationId: report.station_id,
    fuelType: report.fuel_type,
    reason: note,
    payload: {
      decision,
      moderationNote: note,
      groupedCount: reportIds.length
    }
  });

  await recordPriceReportAuditEvent({
    reportId: reportIds[0],
    eventType: "moderated",
    actorId: admin.id,
    payload: {
      decision,
      moderationNote: note,
      stationId: report.station_id,
      fuelType: report.fuel_type,
      price: report.price,
      reportedAt: report.reported_at,
      groupedCount: reportIds.length,
      additionalReportIds: reportIds.slice(1)
    }
  });

  revalidatePath("/");
  revalidatePath("/atualizacoes");
  revalidatePath("/admin");
  revalidatePath(`/postos/${report.station_id}`);
  revalidatePath("/auditoria");
}
export async function moderateReportAction(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "");
  const confirmationIds = formData.getAll("confirmationIds").map(id => String(id));
  const decision = String(formData.get("decision") ?? "") as "approved" | "rejected";
  const moderationNote = String(formData.get("moderationNote") ?? "");

  const allIds = [reportId, ...confirmationIds].filter(Boolean);

  if (allIds.length === 0 || (decision !== "approved" && decision !== "rejected")) {
    redirect(`${ADMIN_ROUTE}?error=invalid_request` as Route);
  }

  await moderateReports(allIds, decision, moderationNote);

  redirect(`${ADMIN_ROUTE}?notice=${decision}` as Route);
}

export async function moderateReportQueueAction(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "");
  const confirmationIds = formData.getAll("confirmationIds").map(id => String(id));
  const decision = String(formData.get("decision") ?? "") as "approved" | "rejected";
  const moderationNote = String(formData.get("moderationNote") ?? "");

  const allIds = [reportId, ...confirmationIds].filter(Boolean);

  if (allIds.length === 0 || (decision !== "approved" && decision !== "rejected")) {
    return { ok: false as const, error: "invalid_request" };
  }

  await moderateReports(allIds, decision, moderationNote);

  return { ok: true as const };
}

export async function moderateReportsBatchAction(formData: FormData) {
  const reportIds = String(formData.get("reportIds") ?? "").split(",").filter(Boolean);
  const decision = String(formData.get("decision") ?? "") as "approved" | "rejected";
  const moderationNote = String(formData.get("moderationNote") ?? "");

  if (reportIds.length === 0 || (decision !== "approved" && decision !== "rejected")) {
    redirect(`${ADMIN_ROUTE}?error=invalid_request` as Route);
  }

  await moderateReports(reportIds, decision, moderationNote);

  redirect(`${ADMIN_ROUTE}?notice=${decision}` as Route);
}

const reportFuelTypes: FuelType[] = ["gasolina_comum", "gasolina_aditivada", "etanol", "diesel_s10", "diesel_comum", "gnv"];


function buildReportEditRedirect(reportId: string, params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && value.trim()) {
      query.set(key, value);
    }
  }

  const suffix = query.toString();
  return suffix ? (`/admin/reports/${reportId}?${suffix}` as Route) : (`/admin/reports/${reportId}` as Route);
}

function makeReportEditDiff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const diff: Record<string, { before: unknown; after: unknown }> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of keys) {
    const beforeValue = before[key];
    const afterValue = after[key];
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      diff[key] = { before: beforeValue, after: afterValue };
    }
  }

  return diff;
}

export async function updatePriceReportAction(formData: FormData) {
  const admin = await requireAdminUser();
  const reportId = String(formData.get("reportId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "save").trim();

  if (!reportId) {
    redirect(ADMIN_ROUTE);
  }

  const current = await getReportByIdAdmin(reportId);
  if (!current) {
    redirect(buildReportEditRedirect(reportId, { error: "report_not_found" }));
  }

  const price = parseOptionalNumber(formData, "price");
  if (price === null || price <= 0) {
    redirect(buildReportEditRedirect(reportId, { error: "invalid_price" }));
  }

  const fuelType = String(formData.get("fuelType") ?? "").trim() as FuelType;
  if (!reportFuelTypes.includes(fuelType)) {
    redirect(buildReportEditRedirect(reportId, { error: "invalid_fuel" }));
  }

  const reporterNickname = getOptionalText(formData, "reporterNickname");
  const moderationNote = getOptionalText(formData, "moderationNote");
  const now = new Date().toISOString();
  const nextStatus = decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : current.status;

  const beforeSnapshot = {
    price: current.price,
    fuelType: current.fuelType,
    reporterNickname: current.reporterNickname,
    moderationNote: current.moderationNote,
    status: current.status
  };

  const afterSnapshot = {
    price,
    fuelType,
    reporterNickname,
    moderationNote,
    status: nextStatus
  };

  const diff = makeReportEditDiff(beforeSnapshot, afterSnapshot);
  const shouldTouchModeration = decision === "approved" || decision === "rejected";
  const updatePayload: Record<string, unknown> = {
    price,
    fuel_type: fuelType,
    reporter_nickname: reporterNickname,
    moderation_note: moderationNote,
    version: (current.version ?? 1) + 1
  };

  if (shouldTouchModeration) {
    updatePayload.status = nextStatus;
    updatePayload.moderated_by = admin.id;
    if (nextStatus === "approved") {
      updatePayload.approved_at = now;
      updatePayload.rejected_at = null;
    } else if (nextStatus === "rejected") {
      updatePayload.rejected_at = now;
      updatePayload.approved_at = null;
    }
  }

  const supabase = createSupabaseServiceClient();
  let { error } = await supabase.from("price_reports").update(updatePayload).eq("id", reportId);

  if (error && isLegacyPriceReportWriteError(error.message)) {
    const fallbackPayload: Record<string, unknown> = {
      price,
      fuel_type: fuelType,
      reporter_nickname: reporterNickname,
      moderation_note: moderationNote
    };

    if (shouldTouchModeration) {
      fallbackPayload.status = nextStatus;
    }

    const retryResult = await supabase.from("price_reports").update(fallbackPayload).eq("id", reportId);
    error = retryResult.error;
  }

  if (error) {
    await recordOperationalEvent({
      eventType: "report_revision_failed",
      severity: "error",
      scopeType: "report",
      scopeId: reportId,
      actorId: admin.id,
      actorEmail: admin.email,
      stationId: current.stationId,
      fuelType: current.fuelType,
      reason: error.message,
      payload: {
        decision,
        diff
      }
    });
    redirect(buildReportEditRedirect(reportId, { error: "save_failed" }));
  }

  const wasAutoApproved = String(current.metadata?.submission_routing ?? "") === "auto_approved";
  const correctedAutoApproved = wasAutoApproved && (nextStatus === "rejected" || price !== current.price || fuelType !== current.fuelType);

  if (correctedAutoApproved) {
    await recordOperationalEvent({
      eventType: "progressive_trust_auto_approved_corrected",
      severity: "warning",
      scopeType: "report",
      scopeId: reportId,
      actorId: admin.id,
      actorEmail: admin.email,
      stationId: current.stationId,
      reportId,
      fuelType,
      reason: moderationNote ?? "auto approved report corrected later",
      payload: {
        previousStatus: current.status,
        nextStatus,
        diff,
        submissionRouting: current.metadata?.submission_routing ?? null,
        contributorTrustLevel: current.metadata?.contributor_trust_level ?? null
      }
    });
  }

  if (nextStatus === "rejected") {
    try {
      await updateCollectorScore(current.reporterNickname, current.ipHash, {
        action: "reject",
        reason: moderationNote ?? "report corrected after admin review",
        locationConfidence: current.locationConfidence === "high" ? "high" : "low",
        isConsistencyBonus: false
      });
    } catch (trustError) {
      console.error("Failed to update collector trust after admin revision:", trustError);
    }
  }

  await recordAdminActionLog({
    actionKind: shouldTouchModeration ? "report_moderation_edit" : "report_revision",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "report",
    targetId: reportId,
    note: moderationNote ?? `Report editado no admin (${decision}).`,
    payload: {
      stationId: current.stationId,
      fuelType,
      price,
      decision,
      diff
    }
  });

  await recordOperationalEvent({
    eventType: shouldTouchModeration ? "report_moderation_edit" : "report_revision",
    severity: shouldTouchModeration ? "warning" : "info",
    scopeType: "report",
    scopeId: reportId,
    actorId: admin.id,
    actorEmail: admin.email,
    stationId: current.stationId,
    fuelType,
    reason: moderationNote ?? "report edited in admin",
    payload: {
      decision,
      diff
    }
  });

  await recordPriceReportAuditEvent({
    reportId,
    eventType: "revised",
    actorId: admin.id,
    payload: {
      stationId: current.stationId,
      fuelType,
      price,
      decision,
      diff
    }
  });

  revalidatePath("/");
  revalidatePath("/atualizacoes");
  revalidatePath("/admin");
  revalidatePath(`/admin/reports/${reportId}`);
  revalidatePath(`/postos/${current.stationId}`);
  revalidatePath("/auditoria");

  redirect(buildReportEditRedirect(reportId, { notice: decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "saved" }));
}

export async function updateStationCurationAction(formData: FormData) {
  const admin = await requireAdminUser();

  const stationId = String(formData.get("stationId") ?? "");
  if (!stationId) {
    redirect(`${ADMIN_ROUTE}?error=invalid_request` as Route);
  }

  const supabase = await createSupabaseServerClient();
  const namePublic = getOptionalText(formData, "namePublic");
  const curationNote = getOptionalText(formData, "curationNote");
  const geoReviewStatus = getOptionalText(formData, "geoReviewStatus");
  const geoConfidence = getOptionalText(formData, "geoConfidence");
  const geoSource = getOptionalText(formData, "geoSource");
  const lat = parseOptionalNumber(formData, "lat");
  const lng = parseOptionalNumber(formData, "lng");

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    coordinate_reviewed_at: new Date().toISOString()
  };

  if (namePublic !== null) updatePayload.name_public = namePublic;
  if (curationNote !== null) updatePayload.curation_note = curationNote;
  if (geoReviewStatus !== null) updatePayload.geo_review_status = geoReviewStatus;
  if (geoConfidence !== null) updatePayload.geo_confidence = geoConfidence;
  if (geoSource !== null) updatePayload.geo_source = geoSource;
  if (lat !== null) updatePayload.lat = lat;
  if (lng !== null) updatePayload.lng = lng;

  if ((geoReviewStatus === "ok" || geoReviewStatus === "pending") && geoConfidence === null) {
    updatePayload.geo_confidence = lat !== null && lng !== null ? "medium" : "low";
  }

  if (geoReviewStatus === "ok") {
    updatePayload.visibility_status = "public";
  } else if (geoReviewStatus === "manual_review") {
    updatePayload.visibility_status = "review";
  } else if (geoReviewStatus === "pending") {
    updatePayload.visibility_status = "public";
  }

  const { error } = await supabase.from("stations").update(updatePayload).eq("id", stationId);

  if (error) {
    await recordOperationalEvent({
      eventType: "station_curation_failed",
      severity: "error",
      scopeType: "station",
      scopeId: stationId,
      actorId: admin.id,
      actorEmail: admin.email,
      reason: error.message,
      payload: updatePayload
    });
    redirect(`${ADMIN_ROUTE}?error=moderation_failed` as Route);
  }

  await recordAdminActionLog({
    actionKind: "station_curation_updated",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "station",
    targetId: stationId,
    note: curationNote,
    payload: {
      namePublic,
      geoReviewStatus,
      geoConfidence,
      geoSource,
      lat,
      lng
    }
  });

  await recordOperationalEvent({
    eventType: "station_curation_updated",
    severity: "info",
    scopeType: "station",
    scopeId: stationId,
    actorId: admin.id,
    actorEmail: admin.email,
    reason: "curadoria territorial salva",
    payload: {
      namePublic,
      geoReviewStatus,
      geoConfidence,
      geoSource,
      lat,
      lng,
      curationNote
    }
  });

  revalidatePath("/");
  revalidatePath("/atualizacoes");
  revalidatePath("/admin");
  revalidatePath(`/postos/${stationId}`);
  revalidatePath("/auditoria");
  redirect(`${ADMIN_ROUTE}?notice=station_saved` as Route);
}

export async function updateTerritorialCurationAction(formData: FormData) {
  const admin = await requireAdminUser();
  const stationId = getOptionalText(formData, "stationId");
  const stationIds = parseStationIdList(formData);
  const targetIds = stationIds.length > 0 ? stationIds : stationId ? [stationId] : [];

  if (targetIds.length === 0) {
    redirect(`${ADMIN_ROUTE}?error=invalid_request` as Route);
  }

  const decision = getOptionalText(formData, "decision") as "approve" | "review" | "reject" | "duplicate" | "adjust" | "hide" | null;
  const geoReviewStatus = getOptionalText(formData, "geoReviewStatus") as "ok" | "pending" | "manual_review" | null;
  const geoConfidence = getOptionalText(formData, "geoConfidence");
  const geoSource = getOptionalText(formData, "geoSource");
  const visibilityStatus = getOptionalText(formData, "visibilityStatus") as "public" | "review" | "hidden" | null;
  const curationNote = getOptionalText(formData, "curationNote") ?? getOptionalText(formData, "moderationNote");
  const duplicateOfStationId = getOptionalText(formData, "duplicateOfStationId");
  const lat = parseOptionalNumber(formData, "lat");
  const lng = parseOptionalNumber(formData, "lng");

  const supabase = await createSupabaseServerClient();
  const { data: stationRows, error: fetchError } = await supabase
    .from("stations")
    .select("id,name,name_official,name_public,brand,address,city,neighborhood,lat,lng,is_active,created_at,cnpj,source,source_id,official_status,sigaf_status,products,distributor_name,last_synced_at,import_notes,geo_source,geo_confidence,geo_review_status,priority_score,visibility_status,curation_note,coordinate_reviewed_at,updated_at")
    .in("id", targetIds);

  if (fetchError || !stationRows || stationRows.length === 0) {
    redirect(`${ADMIN_ROUTE}?error=station_not_found` as Route);
  }

  const stations = (stationRows as any[]).map(mapStationRow);
  const linkedStation = duplicateOfStationId ? stations.find((station) => station.id === duplicateOfStationId) ?? null : null;
  if (decision === "approve") {
    const blocked = stations.filter((station) => !canPromoteStationToMap(station));
    if (blocked.length > 0) {
      await recordOperationalEvent({
        eventType: "territorial_curation_blocked",
        severity: "warning",
        scopeType: "territorial_review",
        scopeId: targetIds.join(","),
        actorId: admin.id,
        actorEmail: admin.email,
        reason: "promotion_blocked_by_minimum_criteria",
        payload: {
          stationIds: targetIds,
          blocked: blocked.map((station) => station.id)
        }
      });
      redirect(`${ADMIN_ROUTE}?error=promotion_blocked` as Route);
    }
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    coordinate_reviewed_at: new Date().toISOString()
  };

  if (geoReviewStatus !== null) updatePayload.geo_review_status = geoReviewStatus;
  if (geoConfidence !== null) updatePayload.geo_confidence = geoConfidence;
  if (geoSource !== null) updatePayload.geo_source = geoSource;
  if (lat !== null) updatePayload.lat = lat;
  if (lng !== null) updatePayload.lng = lng;
  if (curationNote !== null) updatePayload.curation_note = curationNote;
  if (visibilityStatus !== null) updatePayload.visibility_status = visibilityStatus;

  if (decision === "approve") {
    updatePayload.geo_review_status = "ok";
    updatePayload.visibility_status = "public";
    if (geoConfidence === null) {
      updatePayload.geo_confidence = "medium";
    }
  } else if (decision === "review" || decision === "adjust") {
    updatePayload.geo_review_status = "manual_review";
    updatePayload.visibility_status = "review";
  } else if (decision === "reject" || decision === "hide") {
    updatePayload.geo_review_status = "manual_review";
    updatePayload.visibility_status = "hidden";
  } else if (decision === "duplicate") {
    updatePayload.geo_review_status = "manual_review";
    updatePayload.visibility_status = "hidden";
    updatePayload.duplicate_of_station_id = duplicateOfStationId || null;
    updatePayload.curation_note = [curationNote, linkedStation ? `Vinculado como duplicado de ${linkedStation.name}` : "Vinculado como duplicado"].filter(Boolean).join(" · ");
  }

  if ((updatePayload.geo_review_status === "ok" || updatePayload.geo_review_status === "pending") && updatePayload.geo_confidence === undefined && lat !== null && lng !== null) {
    updatePayload.geo_confidence = "medium";
  }

  const { error } = await supabase.from("stations").update(updatePayload).in("id", targetIds);

  if (error) {
    await recordOperationalEvent({
      eventType: "territorial_curation_failed",
      severity: "error",
      scopeType: "territorial_review",
      scopeId: targetIds.join(","),
      actorId: admin.id,
      actorEmail: admin.email,
      reason: error.message,
      payload: { stationIds: targetIds, updatePayload }
    });
    redirect(`${ADMIN_ROUTE}?error=moderation_failed` as Route);
  }

  await recordAdminActionLog({
    actionKind: targetIds.length > 1 ? "territorial_curation_batch_updated" : "territorial_curation_updated",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: targetIds.length > 1 ? "station_batch" : "station",
    targetId: targetIds.join(","),
    note: curationNote,
    payload: {
      stationIds: targetIds,
      decision,
      geoReviewStatus,
      geoConfidence,
      geoSource,
      visibilityStatus,
      lat,
      lng,
      curationNote
    }
  });

  await recordOperationalEvent({
    eventType: "territorial_curation_updated",
    severity: "info",
    scopeType: "territorial_review",
    scopeId: targetIds.join(","),
    actorId: admin.id,
    actorEmail: admin.email,
    reason: "curadoria territorial salva",
    payload: {
      stationIds: targetIds,
      decision,
      geoReviewStatus,
      geoConfidence,
      geoSource,
      visibilityStatus,
      lat,
      lng,
      curationNote
    }
  });

  revalidatePath("/");
  revalidatePath("/atualizacoes");
  revalidatePath("/admin");
  revalidatePath("/admin/ops/qualidade");
  revalidatePath("/auditoria");
  targetIds.forEach((id) => revalidatePath(`/postos/${id}`));
  redirect(`${ADMIN_ROUTE}?notice=station_saved` as Route);
}
export async function updateCityRolloutAction(formData: FormData) {
  const admin = await requireAdminUser();
  const groupSlug = String(formData.get("groupSlug") ?? "");
  const nextStatus = getOptionalText(formData, "status") as any;
  const nextOpsState = getOptionalText(formData, "operationalState") as any;
  const rolloutNote = getOptionalText(formData, "rolloutNote");

  if (!groupSlug) {
    redirect(`${ADMIN_ROUTE}?error=invalid_request` as Route);
  }

  const supabase = await createSupabaseServerClient();
  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString()
  };

  if (nextStatus) updatePayload.release_status = nextStatus;
  if (nextOpsState) updatePayload.operational_state = nextOpsState;
  if (rolloutNote) updatePayload.rollout_notes = rolloutNote;

  const { error } = await supabase
    .from("audit_station_groups")
    .update(updatePayload)
    .eq("slug", groupSlug);

  if (error) {
    await recordOperationalEvent({
      eventType: "city_rollout_failed",
      severity: "error",
      scopeType: "group",
      scopeId: groupSlug,
      actorId: admin.id,
      actorEmail: admin.email,
      reason: error.message
    });
    redirect(`${ADMIN_ROUTE}?error=moderation_failed` as Route);
  }

  await recordAdminActionLog({
    actionKind: "city_rollout_updated",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "group",
    targetId: groupSlug,
    note: `Rollout alterado para: ${nextStatus || "-"} / ${nextOpsState || "-"}. ${rolloutNote || ""}`,
    payload: updatePayload
  });

  await recordOperationalEvent({
    eventType: "city_rollout_updated",
    severity: "info",
    scopeType: "group",
    scopeId: groupSlug,
    actorId: admin.id,
    actorEmail: admin.email,
    reason: "promoção/recuo territorial salvo",
    payload: updatePayload
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/cidade/${groupSlug}`);
  redirect(`${ADMIN_ROUTE}?notice=rollout_updated` as Route);
}







const STATION_EDITOR_MANAGEMENT_ROUTE = "/admin/ops/station-editors" as Route;

export async function grantStationEditorRoleAction(formData: FormData) {
  const admin = await requireAdminUser();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirect(`${STATION_EDITOR_MANAGEMENT_ROUTE}?error=invalid_request` as Route);
  }

  let nextRoute = `${STATION_EDITOR_MANAGEMENT_ROUTE}?notice=role_granted` as Route;

  try {
    const granted = await grantStationEditorRole(email);

    await recordAdminActionLog({
      actionKind: "station_editor_granted",
      actorId: admin.id,
      actorEmail: admin.email,
      targetType: "admin_user",
      targetId: granted.userId,
      note: `Papel station_editor concedido para ${granted.email}`,
      payload: { email: granted.email, role: "station_editor" }
    });

    await recordOperationalEvent({
      eventType: "operational_action_executed",
      severity: "info",
      scopeType: "admin_user",
      scopeId: granted.userId,
      actorId: admin.id,
      actorEmail: admin.email,
      reason: "station_editor concedido",
      payload: { email: granted.email, role: "station_editor" }
    });

    revalidatePath("/admin");
    revalidatePath("/admin/ops");
    revalidatePath(STATION_EDITOR_MANAGEMENT_ROUTE);
  } catch (error) {
    await recordOperationalEvent({
      eventType: "operational_action_executed",
      severity: "warning",
      scopeType: "admin_user",
      actorId: admin.id,
      actorEmail: admin.email,
      reason: error instanceof Error ? error.message : "station_editor_grant_failed",
      payload: { email }
    });
    nextRoute = `${STATION_EDITOR_MANAGEMENT_ROUTE}?error=grant_failed` as Route;
  }

  redirect(nextRoute);
}

export async function revokeStationEditorRoleAction(formData: FormData) {
  const admin = await requireAdminUser();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirect(`${STATION_EDITOR_MANAGEMENT_ROUTE}?error=invalid_request` as Route);
  }

  let nextRoute = `${STATION_EDITOR_MANAGEMENT_ROUTE}?notice=role_revoked` as Route;

  try {
    const revoked = await revokeStationEditorRole(email);

    await recordAdminActionLog({
      actionKind: "station_editor_revoked",
      actorId: admin.id,
      actorEmail: admin.email,
      targetType: "admin_user",
      targetId: revoked.userId,
      note: `Papel station_editor removido de ${revoked.email}`,
      payload: { email: revoked.email, role: "admin" }
    });

    await recordOperationalEvent({
      eventType: "operational_action_executed",
      severity: "info",
      scopeType: "admin_user",
      scopeId: revoked.userId,
      actorId: admin.id,
      actorEmail: admin.email,
      reason: "station_editor removido",
      payload: { email: revoked.email, role: "admin" }
    });

    revalidatePath("/admin");
    revalidatePath("/admin/ops");
    revalidatePath(STATION_EDITOR_MANAGEMENT_ROUTE);
  } catch (error) {
    await recordOperationalEvent({
      eventType: "operational_action_executed",
      severity: "warning",
      scopeType: "admin_user",
      actorId: admin.id,
      actorEmail: admin.email,
      reason: error instanceof Error ? error.message : "station_editor_revoke_failed",
      payload: { email }
    });
    nextRoute = `${STATION_EDITOR_MANAGEMENT_ROUTE}?error=revoke_failed` as Route;
  }

  redirect(nextRoute);
}

export async function createStationEditorInviteAction(formData: FormData) {
  const admin = await requireAdminUser();
  const ttlHoursRaw = String(formData.get("ttlHours") ?? "").trim();
  const maxUsesRaw = String(formData.get("maxUses") ?? "").trim();
  const ttlHours = Number(ttlHoursRaw || "72");
  const maxUses = Number(maxUsesRaw || "1");

  let nextRoute = `${STATION_EDITOR_MANAGEMENT_ROUTE}?notice=invite_created` as Route;

  try {
    const invite = await createStationEditorInvite({
      createdById: admin.id,
      createdByEmail: admin.email,
      ttlHours: Number.isFinite(ttlHours) ? ttlHours : 72,
      maxUses: Number.isFinite(maxUses) ? maxUses : 1
    });

    await recordAdminActionLog({
      actionKind: "station_editor_invite_created",
      actorId: admin.id,
      actorEmail: admin.email,
      targetType: "station_editor_invite",
      targetId: invite.id,
      note: `Convite station_editor criado (${invite.inviteCode})`,
      payload: {
        inviteCode: invite.inviteCode,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        inviteLink: invite.inviteLink
      }
    });

    await recordOperationalEvent({
      eventType: "station_editor_invite_created",
      severity: "info",
      scopeType: "station_editor_invite",
      scopeId: invite.id,
      actorId: admin.id,
      actorEmail: admin.email,
      reason: "invite_created",
      payload: {
        inviteCode: invite.inviteCode,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        inviteLink: invite.inviteLink
      }
    });

    revalidatePath(STATION_EDITOR_MANAGEMENT_ROUTE);
    nextRoute = `${STATION_EDITOR_MANAGEMENT_ROUTE}?notice=invite_created&inviteCode=${encodeURIComponent(invite.inviteCode)}` as Route;
  } catch (error) {
    const failure = resolveStationEditorInviteCreateFailure(error);

    await recordOperationalEvent({
      eventType: "station_editor_invite_create_failed",
      severity: "warning",
      scopeType: "station_editor_invite",
      actorId: admin.id,
      actorEmail: admin.email,
      reason: error instanceof Error ? error.message : "invite_create_failed",
      payload: {
        schemaMissing: failure.schemaMissing,
        schemaPartial: failure.schemaPartial,
        serviceUnavailable: failure.serviceUnavailable,
        permissionDenied: failure.permissionDenied,
        errorCode: failure.errorCode,
        ttlHours: ttlHoursRaw,
        maxUses: maxUsesRaw
      }
    });

    nextRoute = `${STATION_EDITOR_MANAGEMENT_ROUTE}?error=${failure.reason}` as Route;
  }

  redirect(nextRoute);
}

export async function revokeStationEditorInviteAction(formData: FormData) {
  const admin = await requireAdminUser();
  const inviteId = String(formData.get("inviteId") ?? "").trim();

  if (!inviteId) {
    redirect(`${STATION_EDITOR_MANAGEMENT_ROUTE}?error=invalid_request` as Route);
  }

  let nextRoute = `${STATION_EDITOR_MANAGEMENT_ROUTE}?notice=invite_revoked` as Route;

  try {
    const invite = await revokeStationEditorInvite({
      inviteId,
      revokedById: admin.id,
      revokedByEmail: admin.email
    });

    await recordAdminActionLog({
      actionKind: "station_editor_invite_revoked",
      actorId: admin.id,
      actorEmail: admin.email,
      targetType: "station_editor_invite",
      targetId: invite.id,
      note: `Convite station_editor revogado (${invite.inviteCode})`,
      payload: {
        inviteCode: invite.inviteCode,
        revokedAt: invite.revokedAt
      }
    });

    await recordOperationalEvent({
      eventType: "station_editor_invite_revoked",
      severity: "info",
      scopeType: "station_editor_invite",
      scopeId: invite.id,
      actorId: admin.id,
      actorEmail: admin.email,
      reason: "invite_revoked",
      payload: {
        inviteCode: invite.inviteCode,
        revokedAt: invite.revokedAt
      }
    });

    revalidatePath(STATION_EDITOR_MANAGEMENT_ROUTE);
  } catch (error) {
    await recordOperationalEvent({
      eventType: "station_editor_invite_revoke_failed",
      severity: "warning",
      scopeType: "station_editor_invite",
      scopeId: inviteId,
      actorId: admin.id,
      actorEmail: admin.email,
      reason: error instanceof Error ? error.message : "invite_revoke_failed"
    });
    nextRoute = `${STATION_EDITOR_MANAGEMENT_ROUTE}?error=invite_revoke_failed` as Route;
  }

  redirect(nextRoute);
}


const TERRITORY_WORKFLOW_ROUTE = "/admin/ops" as Route;
const TERRITORY_WORKFLOW_NOTICE = "territory_state_updated";

function isTerritoryWorkflowState(value: string): value is TerritoryWorkflowState {
  return value === "em_mutirao" || value === "em_acompanhamento" || value === "concluido_por_enquanto";
}

function isTerritoryWorkflowResponsibleRole(value: string): value is TerritoryWorkflowResponsibleRole {
  return value === "station_editor" || value === "curadoria" || value === "operacao_admin";
}

function isTerritoryWorkflowDueKind(value: string): value is TerritoryWorkflowDueKind {
  return value === "hoje" || value === "esta_semana" || value === "sem_prazo";
}

function isTerritoryWorkflowBlockKind(value: string): value is TerritoryWorkflowBlockKind {
  return value === "aguardando_semeadura" || value === "aguardando_curadoria" || value === "aguardando_editor" || value === "sem_prioridade_agora";
}

function withNotice(path: string, notice: string) {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("notice", notice);
  return `${base}?${params.toString()}`;
}

export async function setTerritoryWorkflowStateAction(formData: FormData) {
  const admin = await requireAdminUser();
  const city = String(formData.get("city") ?? "").trim();
  const neighborhood = String(formData.get("neighborhood") ?? "").trim();
  const workflowState = String(formData.get("workflowState") ?? "").trim();
  const responsibleRoleRaw = String(formData.get("responsibleRole") ?? "").trim();
  const responsibleName = getOptionalText(formData, "responsibleName");
  const dueKindRaw = String(formData.get("dueKind") ?? "").trim();
  const blockKindRaw = String(formData.get("blockKind") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const note = getOptionalText(formData, "note");
  const territoryContext = getOptionalText(formData, "territoryContext");
  const source = getOptionalText(formData, "source");

  if (!city || !isTerritoryWorkflowState(workflowState)) {
    redirect(`${TERRITORY_WORKFLOW_ROUTE}?error=invalid_request` as Route);
  }

  const supabase = await createSupabaseServerClient();
  const territoryKey = territoryWorkflowKey(city, neighborhood || null);
  const targetReturnTo = returnTo.startsWith("/") ? returnTo : TERRITORY_WORKFLOW_ROUTE;
  const { data: existingWorkflow } = await supabase
    .from("territory_workflow_states")
    .select("responsible_role,responsible_name,due_kind,block_kind")
    .eq("territory_key", territoryKey)
    .maybeSingle();

  const resolvedResponsibleRole = isTerritoryWorkflowResponsibleRole(responsibleRoleRaw)
    ? responsibleRoleRaw
    : isTerritoryWorkflowResponsibleRole(existingWorkflow?.responsible_role)
      ? existingWorkflow.responsible_role
      : "operacao_admin";
  const resolvedResponsibleName = responsibleName || (String(existingWorkflow?.responsible_name ?? "").trim() || null);
  const resolvedDueKind = isTerritoryWorkflowDueKind(dueKindRaw)
    ? dueKindRaw
    : isTerritoryWorkflowDueKind(existingWorkflow?.due_kind)
      ? existingWorkflow.due_kind
      : "sem_prazo";
  const resolvedBlockKind = isTerritoryWorkflowBlockKind(blockKindRaw)
    ? blockKindRaw
    : isTerritoryWorkflowBlockKind(existingWorkflow?.block_kind)
      ? existingWorkflow.block_kind
      : null;
  const followUpAt = new Date().toISOString();

  const { error } = await supabase.from("territory_workflow_states").upsert(
    {
      territory_key: territoryKey,
      city,
      city_slug: getAuditCitySlug(city),
      neighborhood,
      workflow_state: workflowState,
      responsible_role: resolvedResponsibleRole,
      responsible_name: resolvedResponsibleName,
      due_kind: resolvedDueKind,
      due_at: territoryWorkflowDueAtForKind(resolvedDueKind),
      block_kind: resolvedBlockKind,
      note,
      follow_up_at: followUpAt,
      actor_id: admin.id,
      actor_email: admin.email,
      payload: {
        territoryContext,
        source,
        responsibleName: resolvedResponsibleName,
        responsibleRole: resolvedResponsibleRole,
        dueKind: resolvedDueKind,
        dueLabel: territoryWorkflowDueLabel(resolvedDueKind),
        blockKind: resolvedBlockKind,
        blockLabel: territoryWorkflowBlockLabel(resolvedBlockKind)
      },
      updated_at: followUpAt
    },
    { onConflict: "territory_key" }
  );

  if (error) {
    await recordOperationalEvent({
      eventType: "territory_workflow_state_failed",
      severity: "warning",
      scopeType: "territory",
      scopeId: territoryKey,
      actorId: admin.id,
      actorEmail: admin.email,
      reason: error.message,
      payload: {
        city,
        neighborhood,
        workflowState,
        responsibleRole: resolvedResponsibleRole,
        responsibleName: resolvedResponsibleName,
        dueKind: resolvedDueKind,
        blockKind: resolvedBlockKind,
        territoryContext,
        source
      }
    });
    redirect(`${TERRITORY_WORKFLOW_ROUTE}?error=territory_workflow_failed` as Route);
  }

  await recordAdminActionLog({
    actionKind: "territory_workflow_state_set",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "territory",
    targetId: territoryKey,
    note: note || `Território marcado como ${workflowState}`,
    payload: {
      city,
      neighborhood,
      workflowState,
      responsibleRole: resolvedResponsibleRole,
      responsibleName: resolvedResponsibleName,
      dueKind: resolvedDueKind,
      blockKind: resolvedBlockKind,
      territoryContext,
      source
    }
  });

  await recordOperationalEvent({
    eventType: "territory_workflow_state_set",
    severity: "info",
    scopeType: "territory",
    scopeId: territoryKey,
    actorId: admin.id,
    actorEmail: admin.email,
    city,
    reason: workflowState,
    payload: {
      city,
      neighborhood,
      workflowState,
      responsibleRole: resolvedResponsibleRole,
      responsibleName: resolvedResponsibleName,
      dueKind: resolvedDueKind,
      blockKind: resolvedBlockKind,
      territoryContext,
      source,
      followUpAt
    }
  });

  revalidatePath(TERRITORY_WORKFLOW_ROUTE);
  revalidatePath("/admin/ops/cobertura-territorial");
  revalidatePath("/admin/ops/impacto-semeadura-territorial");
  revalidatePath("/admin/ops/historico-cobertura-territorial");
  revalidatePath("/admin/ops/station-editors");
  revalidatePath("/admin/ops/qualidade");
  revalidatePath("/admin/ops/fila-territorial");
  revalidatePath("/admin/ops/historico-cobertura-territorial");

  redirect(withNotice(targetReturnTo, TERRITORY_WORKFLOW_NOTICE) as Route);
}





