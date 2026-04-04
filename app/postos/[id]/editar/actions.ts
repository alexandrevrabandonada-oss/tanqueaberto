"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { requireAdminUser, requireStationEditorUser } from "@/lib/auth/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { recordAdminActionLog, recordOperationalEvent } from "@/lib/ops/logs";
import { getActiveStations, getStationByIdAdmin } from "@/lib/data/queries";
import { getStationProposalReviewSignal } from "@/lib/quality/stations";
import { getTerritorialDuplicateCandidates } from "@/lib/ops/territorial-curation";
import { recordStationLightEdit } from "@/lib/ops/station-light-edits";
import { getStationPublicName } from "@/lib/quality/stations";

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

function isMissingDuplicateLinkColumnError(message: string | undefined) {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("duplicate_of_station_id")
    && (normalized.includes("does not exist") || normalized.includes("could not find") || normalized.includes("schema cache"));
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
  const duplicateReason = nextDuplicate
    ? `Vinculado como duplicado de ${duplicateMatch?.publicName ?? nextDuplicate}`
    : currentDuplicate && !nextDuplicate
      ? "Vínculo de duplicado removido; revisão manual"
      : hasSensitiveChange
        ? "Edição leve com revisão manual de coordenada ou vínculo"
        : "Edição leve salva sem revisão adicional";
  const reviewReason = nextDuplicate
    ? `Possível duplicado de ${duplicateMatch?.publicName ?? nextDuplicate}; revisão manual pendente`
    : duplicateReason;
  const updatePayload = {
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
    curation_note: [currentStation.curationNote, duplicateReason, proposalSignal.label, proposalSignal.reason].filter(Boolean).join(" · "),
    updated_at: new Date().toISOString()
  };

  const supabase = createSupabaseServiceClient();
  let { error } = await supabase.from("stations").update(updatePayload).eq("id", stationId);
  let changeKind: "light_edit" | "manual_review" | "duplicate_link" = nextDuplicate ? "duplicate_link" : hasSensitiveChange ? "manual_review" : "light_edit";
  let status: "saved" | "manual_review" | "duplicate_linked" = nextDuplicate ? "duplicate_linked" : hasSensitiveChange ? "manual_review" : "saved";
  let reason = duplicateReason;

  if (error && nextDuplicate && isMissingDuplicateLinkColumnError(error.message)) {
    const fallbackPayload = {
      ...updatePayload,
      curation_note: [currentStation.curationNote, reviewReason, proposalSignal.label, proposalSignal.reason].filter(Boolean).join(" · ")
    };
    delete (fallbackPayload as { duplicate_of_station_id?: string | null }).duplicate_of_station_id;

    await recordOperationalEvent({
      eventType: "station_duplicate_link_schema_fallback",
      severity: "warning",
      scopeType: "station",
      scopeId: stationId,
      actorId: editor.id,
      actorEmail: editor.email,
      stationId,
      reason: error.message,
      payload: { requestedDuplicateOfStationId: nextDuplicate }
    });

    const retryResult = await supabase.from("stations").update(fallbackPayload).eq("id", stationId);
    error = retryResult.error;

    if (!error) {
      changeKind = "manual_review";
      status = "manual_review";
      reason = reviewReason;
    }
  }

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
  revalidatePath("/postos");
  revalidatePath("/admin/ops/station-editors");
  revalidatePath("/admin/ops/qualidade");
  revalidatePath("/admin");

  redirect(buildStationEditRedirect(stationId, { notice: status === "duplicate_linked" ? "duplicate_linked" : status === "manual_review" ? "saved_review" : "saved", returnTo }));
}

export async function mergeStationIntoCanonicalAction(formData: FormData) {
  const admin = await requireAdminUser();
  const stationId = String(formData.get("stationId") ?? "").trim();
  const returnTo = getOptionalText(formData, "returnTo");
  const duplicateOfStationId = getOptionalText(formData, "mergeTargetStationId") ?? getOptionalText(formData, "duplicateOfStationId");
  const canonicalName = getOptionalText(formData, "canonicalName");

  if (!stationId) {
    redirect(`/admin/ops/station-editors?error=invalid_request` as Route);
  }

  if (!duplicateOfStationId || duplicateOfStationId === stationId) {
    redirect(buildStationEditRedirect(stationId, { error: "merge_requires_duplicate", returnTo }));
  }

  if (!canonicalName) {
    redirect(buildStationEditRedirect(stationId, { error: "missing_canonical_name", returnTo }));
  }

  const [sourceStation, targetStation, catalogStations] = await Promise.all([
    getStationByIdAdmin(stationId),
    getStationByIdAdmin(duplicateOfStationId),
    getActiveStations()
  ]);

  if (!sourceStation) {
    redirect(buildStationEditRedirect(stationId, { error: "station_not_found", returnTo }));
  }

  if (!targetStation) {
    redirect(buildStationEditRedirect(stationId, { error: "merge_target_not_found", returnTo }));
  }

  const duplicateCandidates = getTerritorialDuplicateCandidates(sourceStation, catalogStations, 6);
  const duplicateMatch = duplicateCandidates.find((candidate) => candidate.stationId === duplicateOfStationId) ?? null;
  const duplicateCandidateReason = duplicateMatch?.reason ?? "seleção manual fora dos sugeridos";

  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const canonicalPublicName = canonicalName.trim();
  const targetNote = [
    targetStation.curationNote,
    `Unificado com ${getStationPublicName(sourceStation)} por ${admin.email}`
  ].filter(Boolean).join(" · ");
  const sourceReason = `Unificado com ${getStationPublicName(targetStation)}; nome final: ${canonicalPublicName}`;
  const sourceUpdatePayload = {
    is_active: false,
    visibility_status: "hidden",
    geo_review_status: "manual_review",
    duplicate_of_station_id: targetStation.id,
    curation_note: [sourceStation.curationNote, sourceReason].filter(Boolean).join(" · "),
    updated_at: now
  };

  const { error: targetUpdateError } = await supabase.from("stations").update({
    name: canonicalPublicName,
    name_public: canonicalPublicName,
    curation_note: targetNote,
    updated_at: now
  }).eq("id", targetStation.id);

  if (targetUpdateError) {
    await recordOperationalEvent({
      eventType: "station_merge_failed",
      severity: "error",
      scopeType: "station",
      scopeId: stationId,
      actorId: admin.id,
      actorEmail: admin.email,
      stationId,
      reason: targetUpdateError.message,
      payload: { stage: "update_target", sourceStationId: stationId, targetStationId: targetStation.id, canonicalName: canonicalPublicName }
    });
    redirect(buildStationEditRedirect(stationId, { error: "merge_failed", returnTo }));
  }

  const essentialMoves: Array<{ table: string; column: string }> = [
    { table: "price_reports", column: "station_id" }
  ];

  for (const move of essentialMoves) {
    const { error } = await supabase.from(move.table).update({ [move.column]: targetStation.id }).eq(move.column, stationId);
    if (error) {
      await recordOperationalEvent({
        eventType: "station_merge_failed",
        severity: "error",
        scopeType: "station",
        scopeId: stationId,
        actorId: admin.id,
        actorEmail: admin.email,
        stationId,
        reason: error.message,
        payload: { stage: `move_${move.table}`, sourceStationId: stationId, targetStationId: targetStation.id, canonicalName: canonicalPublicName }
      });
      redirect(buildStationEditRedirect(stationId, { error: "merge_failed", returnTo }));
    }
  }

  const bestEffortMoves: Array<{ table: string; values: Record<string, string> }> = [
    { table: "station_quality_reviews", values: { station_id: targetStation.id } },
    { table: "station_seed_requests", values: { station_id: targetStation.id } },
    { table: "station_light_edits", values: { station_id: targetStation.id } },
    { table: "station_light_edits", values: { duplicate_of_station_id: targetStation.id } },
    { table: "report_submission_rate_limits", values: { station_id: targetStation.id } }
  ];

  for (const move of bestEffortMoves) {
    const [column, value] = Object.entries(move.values)[0] ?? [];
    if (!column || !value) continue;
    const { error } = await supabase.from(move.table).update(move.values).eq(column, stationId);
    if (error) {
      await recordOperationalEvent({
        eventType: "station_merge_partial_warning",
        severity: "warning",
        scopeType: "station",
        scopeId: stationId,
        actorId: admin.id,
        actorEmail: admin.email,
        stationId,
        reason: error.message,
        payload: { table: move.table, column, sourceStationId: stationId, targetStationId: targetStation.id }
      });
    }
  }

  let sourceUpdateError = (await supabase.from("stations").update(sourceUpdatePayload).eq("id", stationId)).error;
  if (sourceUpdateError && isMissingDuplicateLinkColumnError(sourceUpdateError.message)) {
    const fallbackPayload = {
      ...sourceUpdatePayload,
      curation_note: [sourceStation.curationNote, sourceReason, `Vinculo canônico pendente por schema remoto`].filter(Boolean).join(" · ")
    };
    delete (fallbackPayload as { duplicate_of_station_id?: string }).duplicate_of_station_id;
    sourceUpdateError = (await supabase.from("stations").update(fallbackPayload).eq("id", stationId)).error;
  }

  if (sourceUpdateError) {
    await recordOperationalEvent({
      eventType: "station_merge_failed",
      severity: "error",
      scopeType: "station",
      scopeId: stationId,
      actorId: admin.id,
      actorEmail: admin.email,
      stationId,
      reason: sourceUpdateError.message,
      payload: { stage: "archive_source", sourceStationId: stationId, targetStationId: targetStation.id, canonicalName: canonicalPublicName }
    });
    redirect(buildStationEditRedirect(stationId, { error: "merge_failed", returnTo }));
  }

  const { error: relinkDuplicateError } = await supabase
    .from("stations")
    .update({ duplicate_of_station_id: targetStation.id, updated_at: now })
    .eq("duplicate_of_station_id", stationId);

  if (relinkDuplicateError && !isMissingDuplicateLinkColumnError(relinkDuplicateError.message)) {
    await recordOperationalEvent({
      eventType: "station_merge_partial_warning",
      severity: "warning",
      scopeType: "station",
      scopeId: stationId,
      actorId: admin.id,
      actorEmail: admin.email,
      stationId,
      reason: relinkDuplicateError.message,
      payload: { table: "stations", column: "duplicate_of_station_id", sourceStationId: stationId, targetStationId: targetStation.id }
    });
  }

  await recordAdminActionLog({
    actionKind: "station_merged_into_canonical",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "station",
    targetId: `${stationId}:${targetStation.id}`,
    note: sourceReason,
    payload: {
      sourceStationId: stationId,
      targetStationId: targetStation.id,
      canonicalName: canonicalPublicName,
        duplicateCandidateReason
    }
  });

  await recordOperationalEvent({
    eventType: "station_merged_into_canonical",
    severity: "info",
    scopeType: "station",
    scopeId: targetStation.id,
    actorId: admin.id,
    actorEmail: admin.email,
    stationId: targetStation.id,
    reason: sourceReason,
    payload: {
      sourceStationId: stationId,
      targetStationId: targetStation.id,
      canonicalName: canonicalPublicName,
      duplicateCandidateReason
    }
  });

  await recordStationLightEdit({
    stationId: targetStation.id,
    stationName: canonicalPublicName,
    editorId: admin.id,
    editorEmail: admin.email,
    changeKind: "duplicate_link",
    status: "duplicate_linked",
    duplicateOfStationId: targetStation.id,
    beforeSnapshot: {
      targetName: targetStation.name,
      targetNamePublic: targetStation.namePublic ?? targetStation.name,
      sourceStationId: sourceStation.id,
      sourceName: sourceStation.name,
      sourceDuplicateOfStationId: sourceStation.duplicateOfStationId ?? null
    },
    afterSnapshot: {
      targetName: canonicalPublicName,
      targetNamePublic: canonicalPublicName,
      sourceStationId: sourceStation.id,
      sourceVisibilityStatus: "hidden",
      sourceIsActive: false,
      sourceDuplicateOfStationId: targetStation.id
    },
    diff: {
      canonicalName: {
        before: targetStation.namePublic ?? targetStation.name,
        after: canonicalPublicName
      },
      mergedSourceStationId: {
        before: null,
        after: sourceStation.id
      }
    },
    reason: sourceReason
  });

  revalidatePath("/");
  revalidatePath("/postos");
  revalidatePath(`/postos/${stationId}`);
  revalidatePath(`/postos/${stationId}/editar`);
  revalidatePath(`/postos/${targetStation.id}`);
  revalidatePath(`/postos/${targetStation.id}/editar`);
  revalidatePath("/admin");
  revalidatePath("/admin/ops");
  revalidatePath("/admin/ops/station-editors");
  revalidatePath("/admin/ops/qualidade");

  redirect(buildStationEditRedirect(targetStation.id, { notice: "stations_merged", returnTo }));
}


