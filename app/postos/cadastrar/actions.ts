"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { requireStationEditorUser } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAdminActionLog, recordOperationalEvent } from "@/lib/ops/logs";
import { getStationProposalReviewSignal } from "@/lib/quality/stations";

export interface StationSeedState {
  error: string | null;
  success: boolean;
  createdStationId: string | null;
}

const STATION_SEED_ROUTE = "/postos/cadastrar" as Route;

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

function resolveStationVisibility(hasStrongSignal: boolean) {
  return hasStrongSignal ? "public" : "review";
}

function resolveGeoConfidence(hasCoords: boolean, accuracy: number | null) {
  if (!hasCoords) {
    return "low";
  }

  if (accuracy === null) {
    return "medium";
  }

  return accuracy <= 100 ? "high" : "medium";
}

export async function createStationSeedAction(_prevState: StationSeedState, formData: FormData): Promise<StationSeedState> {
  const editor = await requireStationEditorUser();
  const nickname = getOptionalText(formData, "nickname");
  const brand = getOptionalText(formData, "brand") ?? "Sem bandeira";
  const street = getOptionalText(formData, "street");
  const neighborhood = getOptionalText(formData, "neighborhood");
  const officialName = getOptionalText(formData, "officialName");
  const city = getOptionalText(formData, "city");
  const lat = getOptionalNumber(formData, "lat");
  const lng = getOptionalNumber(formData, "lng");
  const accuracy = getOptionalNumber(formData, "accuracy");
  const source = getOptionalText(formData, "source") ?? "manual";
  const duplicateHint = getOptionalText(formData, "duplicateHint");

  if (!nickname) {
    return { error: "Informe o apelido do posto.", success: false, createdStationId: null };
  }

  if (!city) {
    return { error: "Informe a cidade ou carregue o GPS antes de salvar.", success: false, createdStationId: null };
  }

  const hasCoords = lat !== null && lng !== null;
  const hasStrongSignal = Boolean(hasCoords && nickname && city && (street || neighborhood));
  const geoReviewStatus = hasCoords ? "pending" : "manual_review";
  const geoConfidence = resolveGeoConfidence(hasCoords, accuracy);
  const visibilityStatus = resolveStationVisibility(hasStrongSignal);
  const isActive = hasStrongSignal;
  const outcome = hasStrongSignal ? "active" : "manual_review";
  const address = street || neighborhood || city;
  const publicName = nickname;
  const officialDisplayName = officialName || nickname;
  const proposalSignal = getStationProposalReviewSignal(
    {
      name: nickname,
      namePublic: publicName,
      nameOfficial: officialDisplayName,
      brand,
      address,
      city,
      neighborhood: neighborhood || city,
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      geoConfidence,
      geoReviewStatus
    },
    duplicateHint ? 2 : 1
  );

  const supabase = await createSupabaseServerClient();
  const payload = {
    name: nickname,
    name_public: publicName,
    name_official: officialDisplayName,
    brand,
    address,
    city,
    neighborhood: neighborhood || city,
    lat: lat ?? 0,
    lng: lng ?? 0,
    is_active: isActive,
    source,
    geo_source: hasCoords ? "manual" : "manual",
    geo_confidence: geoConfidence,
    geo_review_status: geoReviewStatus,
    visibility_status: visibilityStatus,
    curation_note: [proposalSignal.label, proposalSignal.reason, duplicateHint ? `Parecido com ${duplicateHint}` : null].filter(Boolean).join(" · ")
  };

  const { data, error } = await supabase
    .from("stations")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data?.id) {
    await recordOperationalEvent({
      eventType: "station_proposal_created",
      severity: "error",
      scopeType: "station_seed",
      actorId: editor.id,
      actorEmail: editor.email,
      reason: error?.message ?? "seed_insert_failed",
      payload: { nickname, city, hasCoords, visibilityStatus }
    });

    return { error: "Nao foi possivel salvar o posto agora.", success: false, createdStationId: null };
  }

  await supabase.from("station_seed_requests").insert({
    station_id: data.id,
    creator_id: editor.id,
    creator_email: editor.email,
    payload: {
      nickname,
      brand,
      street,
      neighborhood,
      officialName,
      city,
      lat,
      lng,
      accuracy,
      source,
      duplicateHint,
      proposalReviewState: proposalSignal.state,
      proposalReviewLabel: proposalSignal.label
    },
    status: hasStrongSignal ? "created" : "needs_review"
  });

  await recordAdminActionLog({
    actionKind: "station_seed_created",
    actorId: editor.id,
    actorEmail: editor.email,
    targetType: "station",
    targetId: data.id,
    note: proposalSignal.reason,
    payload: {
      nickname,
      brand,
      street,
      neighborhood,
      officialName,
      city,
      lat,
      lng,
      accuracy,
      visibilityStatus,
      geoReviewStatus,
      proposalReviewState: proposalSignal.state,
      proposalReviewLabel: proposalSignal.label,
      duplicateHint
    }
  });

  await recordOperationalEvent({
    eventType: "station_proposal_created",
    severity: hasStrongSignal ? "info" : "warning",
    scopeType: "station_seed",
    scopeId: data.id,
    actorId: editor.id,
    actorEmail: editor.email,
    reason: hasStrongSignal ? "posto semeado com sinal forte" : "posto semeado para revisao",
    payload: {
      nickname,
      brand,
      street,
      neighborhood,
      officialName,
      city,
      lat,
      lng,
      accuracy,
      visibilityStatus,
      geoReviewStatus,
      proposalReviewState: proposalSignal.state,
      proposalReviewLabel: proposalSignal.label,
      duplicateHint
    }
  });

  revalidatePath(STATION_SEED_ROUTE);
  revalidatePath("/admin");
  revalidatePath("/admin/ops");
  revalidatePath("/admin/ops/qualidade");
  revalidatePath("/postos");
  revalidatePath(`/postos/${data.id}`);

  const nextParams = new URLSearchParams({ notice: "station_saved", stationId: data.id, outcome, city, neighborhood: neighborhood || city, seedOrigin: source });
  redirect(`${STATION_SEED_ROUTE}?${nextParams.toString()}` as Route);
}




