"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { recordAdminActionLog, recordOperationalEvent } from "@/lib/ops/logs";
import { requireAdminUser } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateCollectorScore } from "@/lib/ops/collector-trust";
import { mapStationRow } from "@/lib/data/mappers";
import { canPromoteStationToMap } from "@/lib/ops/territorial-curation";

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

  const { data: reports, error: reportError } = await supabase
    .from("price_reports")
    .select("id,station_id,version,fuel_type,price,reported_at,reporter_nickname,ip_hash,metadata,location_confidence")
    .in("id", reportIds);

  if (reportError || !reports || reports.length === 0) {
    redirect(ADMIN_ROUTE);
  }

  const report = reports[0];

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

  // Update collector trust score for each report moderated
  try {
    const trustUpdates = reports.map((r) => {
      const metadata = (r.metadata as any) || {};
      return updateCollectorScore(r.reporter_nickname, r.ip_hash, {
        action: decision === "approved" ? "approve" : "reject",
        reason: note,
        photoQuality: metadata.quality_score,
        locationConfidence: r.location_confidence as any,
        isConsistencyBonus: false // Could be calculated comparing with history
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

export async function updateTerritorialCurationAction(formData: FormData) {
  const admin = await requireAdminUser();
  const stationId = getOptionalText(formData, "stationId");
  const stationIds = parseStationIdList(formData);
  const targetIds = stationIds.length > 0 ? stationIds : stationId ? [stationId] : [];

  if (targetIds.length === 0) {
    redirect(`${ADMIN_ROUTE}?error=invalid_request` as Route);
  }

  const decision = getOptionalText(formData, "decision") as "approve" | "adjust" | "hide" | null;
  const geoReviewStatus = getOptionalText(formData, "geoReviewStatus") as "ok" | "pending" | "manual_review" | null;
  const geoConfidence = getOptionalText(formData, "geoConfidence");
  const geoSource = getOptionalText(formData, "geoSource");
  const visibilityStatus = getOptionalText(formData, "visibilityStatus") as "public" | "review" | "hidden" | null;
  const curationNote = getOptionalText(formData, "curationNote") ?? getOptionalText(formData, "moderationNote");
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
  } else if (decision === "adjust") {
    updatePayload.geo_review_status = "manual_review";
    updatePayload.visibility_status = "review";
  } else if (decision === "hide") {
    updatePayload.geo_review_status = "manual_review";
    updatePayload.visibility_status = "hidden";
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
    .from("station_groups")
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


