"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { requireAdminUser } from "@/lib/auth/admin";
import { getStationByIdAdmin } from "@/lib/data/queries";
import { isValidStationCoordinate } from "@/lib/quality/stations";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { recordAdminActionLog, recordOperationalEvent } from "@/lib/ops/logs";

function getOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function buildReturnToWithStatus(returnTo: string, status: { notice?: string; error?: string; stationId?: string }) {
  const safeReturnTo = returnTo.startsWith("/postos") ? returnTo : "/postos";
  const separator = safeReturnTo.includes("?") ? "&" : "?";
  const params = new URLSearchParams();
  if (status.notice) params.set("notice", status.notice);
  if (status.error) params.set("error", status.error);
  if (status.stationId) params.set("stationId", status.stationId);
  return `${safeReturnTo}${separator}${params.toString()}` as Route;
}

export async function publishStationToSystemAction(formData: FormData) {
  const admin = await requireAdminUser();
  const stationId = getOptionalText(formData, "stationId");
  const returnTo = getOptionalText(formData, "returnTo") ?? "/postos";

  if (!stationId) {
    redirect(buildReturnToWithStatus(returnTo, { error: "invalid_request" }));
  }

  const station = await getStationByIdAdmin(stationId);
  if (!station) {
    redirect(buildReturnToWithStatus(returnTo, { error: "station_not_found" }));
  }

  if (station.duplicateOfStationId) {
    redirect(buildReturnToWithStatus(returnTo, { error: "duplicate_linked", stationId }));
  }

  if (!isValidStationCoordinate(station.lat, station.lng)) {
    redirect(buildReturnToWithStatus(returnTo, { error: "requires_location_review", stationId }));
  }

  const supabase = createSupabaseServiceClient();
  const nextGeoConfidence = station.geoConfidence === "high" || station.geoConfidence === "medium" ? station.geoConfidence : "medium";
  const nextGeoReviewStatus = station.geoReviewStatus === "ok" ? "ok" : "pending";
  const nextCurationNote = [station.curationNote, `Publicado no sistema por ${admin.email}`].filter(Boolean).join(" · ");

  const updatePayload = {
    is_active: true,
    visibility_status: "public",
    geo_review_status: nextGeoReviewStatus,
    geo_confidence: nextGeoConfidence,
    coordinate_reviewed_at: new Date().toISOString(),
    curation_note: nextCurationNote,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from("stations").update(updatePayload).eq("id", stationId);

  if (error) {
    await recordOperationalEvent({
      eventType: "station_publish_failed",
      severity: "error",
      scopeType: "station",
      scopeId: stationId,
      actorId: admin.id,
      actorEmail: admin.email,
      reason: error.message,
      payload: updatePayload
    });
    redirect(buildReturnToWithStatus(returnTo, { error: "publish_failed", stationId }));
  }

  await recordAdminActionLog({
    actionKind: "station_published_to_system",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "station",
    targetId: stationId,
    note: `Publicado no sistema por ${admin.email}`,
    payload: updatePayload
  });

  await recordOperationalEvent({
    eventType: "station_published_to_system",
    severity: "info",
    scopeType: "station",
    scopeId: stationId,
    actorId: admin.id,
    actorEmail: admin.email,
    reason: "station promoted from restricted list",
    payload: updatePayload
  });

  revalidatePath("/");
  revalidatePath("/postos");
  revalidatePath(`/postos/${stationId}`);
  revalidatePath(`/postos/${stationId}/editar`);
  revalidatePath("/admin");
  revalidatePath("/admin/ops");

  redirect(buildReturnToWithStatus(returnTo, { notice: "station_promoted", stationId }));
}