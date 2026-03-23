"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { recordAdminActionLog, recordOperationalEvent } from "@/lib/ops/logs";
import { requireAdminUser } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminLoginState {
  error: string | null;
  success: boolean;
}

const ADMIN_ROUTE = "/admin" as Route;
const ADMIN_LOGIN_ROUTE = "/admin/login" as Route;

function normalizeNotice(action: "approved" | "rejected") {
  return action === "approved" ? "Aprovado no painel." : "Rejeitado no painel.";
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
    return { error: "Informe e-mail e senha.", success: false };
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
    return { error: "Não foi possível entrar com essas credenciais.", success: false };
  }

  const { data: adminRow, error: adminError } = await supabase.from("admin_users").select("email").eq("email", email).maybeSingle();

  if (adminError) {
    await recordOperationalEvent({
      eventType: "auth_failed",
      severity: "error",
      scopeType: "auth",
      actorEmail: email,
      reason: adminError.message
    });
    return { error: "Falha ao validar acesso administrativo.", success: false };
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
    return { error: "Seu e-mail não está liberado para o admin.", success: false };
  }

  await recordOperationalEvent({
    eventType: "auth_success",
    severity: "info",
    scopeType: "auth",
    actorEmail: email,
    reason: "admin_login"
  });

  return { error: null, success: true };
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
  const supabase = await createSupabaseServerClient();

  const { data: report, error: reportError } = await supabase.from("price_reports").select("id,station_id,version,fuel_type,price,reported_at").in("id", reportIds).limit(1).maybeSingle();

  if (reportError || !report) {
    redirect(ADMIN_ROUTE);
  }

  const now = new Date().toISOString();
  const note = moderationNote?.trim() || normalizeNotice(decision);
  const nextVersion = (report.version ?? 1) + 1;

  const { error } = await supabase
    .from("price_reports")
    .update(
      decision === "approved"
        ? {
            status: decision,
            approved_at: now,
            rejected_at: null,
            moderated_by: admin.id,
            moderation_reason: note,
            moderation_note: note,
            version: nextVersion
          }
        : {
            status: decision,
            approved_at: null,
            rejected_at: now,
            moderated_by: admin.id,
            moderation_reason: note,
            moderation_note: note,
            version: nextVersion
          }
    )
    .in("id", reportIds);

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
    redirect(ADMIN_ROUTE);
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
      version: nextVersion,
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
      version: nextVersion,
      decision,
      moderationNote: note,
      groupedCount: reportIds.length
    }
  });

  revalidatePath("/");
  revalidatePath("/atualizacoes");
  revalidatePath("/admin");
  revalidatePath(`/postos/${report.station_id}`);
  revalidatePath("/auditoria");
  redirect(ADMIN_ROUTE);
}

export async function moderateReportAction(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "");
  const confirmationIds = formData.getAll("confirmationIds").map(id => String(id));
  const decision = String(formData.get("decision") ?? "") as "approved" | "rejected";
  const moderationNote = String(formData.get("moderationNote") ?? "");

  const allIds = [reportId, ...confirmationIds].filter(Boolean);

  if (allIds.length === 0 || (decision !== "approved" && decision !== "rejected")) {
    redirect(ADMIN_ROUTE);
  }

  await moderateReports(allIds, decision, moderationNote);
}

export async function moderateReportsBatchAction(formData: FormData) {
  const reportIds = String(formData.get("reportIds") ?? "").split(",").filter(Boolean);
  const decision = String(formData.get("decision") ?? "") as "approved" | "rejected";
  const moderationNote = String(formData.get("moderationNote") ?? "");

  if (reportIds.length === 0 || (decision !== "approved" && decision !== "rejected")) {
    redirect(ADMIN_ROUTE);
  }

  await moderateReports(reportIds, decision, moderationNote);
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
