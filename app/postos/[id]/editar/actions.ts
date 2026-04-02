"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { requireStationEditorUser } from "@/lib/auth/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { recordAdminActionLog, recordOperationalEvent } from "@/lib/ops/logs";
import { getActiveStations, getStationByIdAdmin } from "@/lib/data/queries";
import { getStationProposalReviewSignal } from "@/lib/quality/stations";
import { getTerritorialDuplicateCandidates } from "@/lib/ops/territorial-curation";
import { recordStationLightEdit } from "@/lib/ops/station-light-edits";

function getOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function getOptionalNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) {
    return null;
  }

  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function makeDiff(before: Record<string, unknown>, after: Record<string, unknown>) {
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


function buildStationEditRedirect(stationId: string, params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && value.trim()) {
      query.set(key, value);
    }
  }

  const suffix = query.toString();
  return suffix ? (`/postos/${stationId}/editar?${suffix}` as Route) : (`/postos/${stationId}/editar` as Route);
}

export async function updateStationLightEditAction(formData: FormData) {
  const editor = await requireStationEditorUser();
  const stationId = String(formData.get("stationId") ?? "").trim();
  const returnTo = getOptionalText(formData, "returnTo");

  if (!stationId) {
    redirect(`/admin/ops/station-editors?error=invalid_request` as Route);
  }

  const currentStation = await getStationByIdAdmin(stationId);
  if (!currentStation) {
    redirect(buildStationEditRedirect(stationId, { error: "station_not_found", returnTo }));
  }

  const nickname = getOptionalText(formData, "nickname");
  const brand = getOptionalText(formData, "brand");
  const street = getOptionalText(formData, "street");
  const neighborhood = getOptionalText(formData, "neighborhood");
  const lat = getOptionalNumber(formData, "lat");
  const lng = getOptionalNumber(formData, "lng");
  const duplicateOfStationId = getOptionalText(formData, "duplicateOfStationId");

  if (!nickname) {
    redirect(buildStationEditRedirect(stationId, { error: "missing_nickname", returnTo }));
  }

  if (duplicateOfStationId && duplicateOfStationId === stationId) {
    redirect(buildStationEditRedirect(stationId, { error: "invalid_duplicate", returnTo }));
  }

  const nextLat = lat ?? currentStation.lat;
  const nextLng = lng ?? currentStation.lng;
  const nextBrand = brand ?? currentStation.brand;
  const nextAddress = street ?? currentStation.address;
  const nextNeighborhood = neighborhood ?? currentStation.neighborhood;
  const nextDuplicate = duplicateOfStationId ?? null;
  const currentDuplicate = currentStation.duplicateOfStationId ?? null;
  const duplicateChanged = nextDuplicate !== currentDuplicate;
  const hasSensitiveChange = nextLat !== currentStation.lat || nextLng !== currentStation.lng || duplicateChanged;
  const nextGeoReviewStatus = hasSensitiveChange ? "manual_review" : currentStation.geoReviewStatus ?? "pending";
  const nextVisibilityStatus = hasSensitiveChange ? "review" : currentStation.visibilityStatus ?? "review";
  const nextGeoConfidence = hasSensitiveChange
    ? currentStation.geoConfidence === "high"
      ? "medium"
      : currentStation.geoConfidence ?? "medium"
    : currentStation.geoConfidence ?? "medium";
  const nextNamePublic = nickname;
  const nextName = nickname;
  const nextNameOfficial = currentStation.nameOfficial ?? currentStation.name;

  const catalogStations = await getActiveStations();
  const duplicateCandidates = getTerritorialDuplicateCandidates(
    {
      ...currentStation,
      name: nextName,
      namePublic: nextNamePublic,
      nameOfficial: nextNameOfficial,
      brand: nextBrand,
      address: nextAddress,
      neighborhood: nextNeighborhood,
      city: currentStation.city,
      lat: nextLat,
      lng: nextLng,
      geoConfidence: nextGeoConfidence as any,
      geoReviewStatus: nextGeoReviewStatus as any
    },
    catalogStations,
    3
  );

  const duplicateMatch = nextDuplicate ? duplicateCandidates.find((candidate) => candidate.stationId === nextDuplicate) ?? null : null;
  if (nextDuplicate && !duplicateMatch) {
    redirect(buildStationEditRedirect(stationId, { error: "invalid_duplicate", returnTo }));
  }

  const proposalSignal = getStationProposalReviewSignal(
    {
      name: nextName,
      namePublic: nextNamePublic,
      nameOfficial: nextNameOfficial,
      brand: nextBrand,
      address: nextAddress,
      city: currentStation.city,
      neighborhood: nextNeighborhood,
      lat: nextLat,
      lng: nextLng,
      geoConfidence: nextGeoConfidence as any,
      geoReviewStatus: nextGeoReviewStatus as any
    },
    nextDuplicate ? 2 : 1
  );

  const beforeSnapshot = {
    name: currentStation.name,
    namePublic: currentStation.namePublic ?? currentStation.name,
    brand: currentStation.brand,
    address: currentStation.address,
    neighborhood: currentStation.neighborhood,
    lat: currentStation.lat,
    lng: currentStation.lng,
    geoReviewStatus: currentStation.geoReviewStatus,
    geoConfidence: currentStation.geoConfidence,
    visibilityStatus: currentStation.visibilityStatus,
    duplicateOfStationId: currentStation.duplicateOfStationId ?? null
  };

  const afterSnapshot = {
    name: nextName,
    namePublic: nextNamePublic,
    brand: nextBrand,
    address: nextAddress,
    neighborhood: nextNeighborhood,
    lat: nextLat,
    lng: nextLng,
    geoReviewStatus: nextGeoReviewStatus,
    geoConfidence: nextGeoConfidence,
    visibilityStatus: nextVisibilityStatus,
    duplicateOfStationId: nextDuplicate
  };

  const diff = makeDiff(beforeSnapshot, afterSnapshot);
  const changeKind = nextDuplicate ? "duplicate_link" : hasSensitiveChange ? "manual_review" : "light_edit";
  const status = nextDuplicate ? "duplicate_linked" : hasSensitiveChange ? "manual_review" : "saved";
  const reason = nextDuplicate
    ? `Vinculado como duplicado de ${duplicateMatch?.publicName ?? nextDuplicate}`
    : currentDuplicate && !nextDuplicate
      ? "Vínculo de duplicado removido; revisão manual"
      : hasSensitiveChange
        ? "Edição leve com revisão manual de coordenada ou vínculo"
        : "Edição leve salva sem revisão adicional";

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("stations").update({
    name: nextName,
    name_public: nextNamePublic,
    brand: nextBrand,
    address: nextAddress,
    neighborhood: nextNeighborhood,
    lat: nextLat,
    lng: nextLng,
    geo_review_status: nextGeoReviewStatus,
    geo_confidence: nextGeoConfidence,
    visibility_status: nextVisibilityStatus,
    duplicate_of_station_id: nextDuplicate,
    curation_note: [currentStation.curationNote, reason, proposalSignal.label, proposalSignal.reason].filter(Boolean).join(" · "),
    updated_at: new Date().toISOString()
  }).eq("id", stationId);

  if (error) {
    await recordOperationalEvent({
      eventType: "station_light_edit_failed",
      severity: "error",
      scopeType: "station",
      scopeId: stationId,
      actorId: editor.id,
      actorEmail: editor.email,
      stationId,
      reason: error.message,
      payload: { diff, duplicateOfStationId: nextDuplicate }
    });
    redirect(buildStationEditRedirect(stationId, { error: "save_failed", returnTo }));
  }

  await recordStationLightEdit({
    stationId,
    stationName: currentStation.name,
    editorId: editor.id,
    editorEmail: editor.email,
    changeKind,
    status,
    duplicateOfStationId: nextDuplicate,
    beforeSnapshot,
    afterSnapshot,
    diff,
    reason
  });

  await recordAdminActionLog({
    actionKind: "station_light_edit_saved",
    actorId: editor.id,
    actorEmail: editor.email,
    targetType: "station",
    targetId: stationId,
    note: reason,
    payload: { stationId, diff, status, duplicateOfStationId: nextDuplicate, proposalReviewState: proposalSignal.state, proposalReviewLabel: proposalSignal.label }
  });

  await recordOperationalEvent({
    eventType: "station_light_edit_saved",
    severity: hasSensitiveChange || nextDuplicate ? "warning" : "info",
    scopeType: "station",
    scopeId: stationId,
    actorId: editor.id,
    actorEmail: editor.email,
    stationId,
    reason,
    payload: {
      stationId,
      status,
      changeKind,
      diff,
      duplicateOfStationId: nextDuplicate,
      proposalReviewState: proposalSignal.state,
      proposalReviewLabel: proposalSignal.label
    }
  });

  revalidatePath(`/postos/${stationId}`);
  revalidatePath(`/postos/${stationId}/editar`);
  revalidatePath("/admin/ops/station-editors");
  revalidatePath("/admin/ops/qualidade");
  revalidatePath("/admin");

  redirect(buildStationEditRedirect(stationId, { notice: status === "duplicate_linked" ? "duplicate_linked" : hasSensitiveChange ? "saved_review" : "saved", returnTo }));
}


