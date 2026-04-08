"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { requireStationEditorUser } from "@/lib/auth/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { recordAdminActionLog, recordOperationalEvent } from "@/lib/ops/logs";
import { getStationProposalReviewSignal } from "@/lib/quality/stations";
import { geocodeWithNominatim } from "@/lib/geo/osm";

export interface StationSeedState {
  error: string | null;
  success: boolean;
  createdStationId: string | null;
}

export interface StationSeedGeocodeState {
  ok: boolean;
  error: string | null;
  lat: number | null;
  lng: number | null;
  confidence: "high" | "medium" | "low" | null;
  displayName: string | null;
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

function readBoolean(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
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

function isLegacyStationsColumnError(message: string | undefined) {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("does not exist")
    || normalized.includes("could not find")
    || normalized.includes("schema cache");
}

export async function geocodeStationSeedAddressAction(formData: FormData): Promise<StationSeedGeocodeState> {
  await requireStationEditorUser("/postos/cadastrar");

  const nickname = getOptionalText(formData, "nickname") ?? "Posto";
  const street = getOptionalText(formData, "street");
  const streetNumber = getOptionalText(formData, "streetNumber");
  const neighborhood = getOptionalText(formData, "neighborhood") ?? "";
  const city = getOptionalText(formData, "city") ?? "";

  if (!street || !city) {
    return {
      ok: false,
      error: "Informe ao menos rua e cidade para buscar o endereco.",
      lat: null,
      lng: null,
      confidence: null,
      displayName: null
    };
  }

  const address = [street, streetNumber].filter(Boolean).join(", ");
  const geocoded = await geocodeWithNominatim({
    name: nickname,
    address,
    neighborhood,
    city
  });

  if (!geocoded) {
    return {
      ok: false,
      error: "Nao foi possivel localizar esse endereco agora. Ajuste os dados e tente novamente.",
      lat: null,
      lng: null,
      confidence: null,
      displayName: null
    };
  }

  return {
    ok: true,
    error: null,
    lat: geocoded.lat,
    lng: geocoded.lng,
    confidence: geocoded.confidence,
    displayName: geocoded.displayName
  };
}

export async function createStationSeedAction(_prevState: StationSeedState, formData: FormData): Promise<StationSeedState> {
  const editor = await requireStationEditorUser("/postos/cadastrar");
  const locationMode = (getOptionalText(formData, "locationMode") ?? "gps") as "gps" | "address";
  const locationConfirmed = readBoolean(formData, "locationConfirmed");
  const nickname = getOptionalText(formData, "nickname");
  const brand = getOptionalText(formData, "brand") ?? "Sem bandeira";
  const street = getOptionalText(formData, "street");
  const streetNumber = getOptionalText(formData, "streetNumber");
  const reference = getOptionalText(formData, "reference");
  const neighborhood = getOptionalText(formData, "neighborhood");
  const officialName = getOptionalText(formData, "officialName");
  const city = getOptionalText(formData, "city");
  const lat = getOptionalNumber(formData, "lat");
  const lng = getOptionalNumber(formData, "lng");
  const accuracy = getOptionalNumber(formData, "accuracy");
  const geocodeConfidence = getOptionalText(formData, "geocodeConfidence") as "high" | "medium" | "low" | null;
  const geocodeDisplayName = getOptionalText(formData, "geocodeDisplayName");
  const source = getOptionalText(formData, "source") ?? "manual";
  const duplicateHint = getOptionalText(formData, "duplicateHint");

  if (!nickname) {
    return { error: "Informe o apelido do posto.", success: false, createdStationId: null };
  }

  if (!city) {
    return { error: "Informe a cidade ou carregue o GPS antes de salvar.", success: false, createdStationId: null };
  }

  if (locationMode === "address" && (!lat || !lng)) {
    return { error: "Busque o endereco e confirme o ponto no mapa antes de salvar.", success: false, createdStationId: null };
  }

  if (locationMode === "address" && !locationConfirmed) {
    return { error: "Confirme o local no mapa para concluir o cadastro por endereco.", success: false, createdStationId: null };
  }

  const hasCoords = lat !== null && lng !== null;
  const hasLowGeocodeConfidence = locationMode === "address" && geocodeConfidence === "low";
  const hasStrongSignal = Boolean(hasCoords && nickname && city && (street || neighborhood) && !hasLowGeocodeConfidence);
  const geoReviewStatus = !hasCoords || hasLowGeocodeConfidence ? "manual_review" : "pending";
  const geoConfidence = locationMode === "address"
    ? (geocodeConfidence ?? resolveGeoConfidence(hasCoords, accuracy))
    : resolveGeoConfidence(hasCoords, accuracy);
  const visibilityStatus = resolveStationVisibility(hasStrongSignal);
  const isActive = hasStrongSignal;
  const outcome = hasStrongSignal ? "active" : "manual_review";
  const address = [street, streetNumber, neighborhood || city].filter(Boolean).join(", ");
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

  const supabase = createSupabaseServiceClient();
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
    geo_source: locationMode === "address" ? "geocode_osm" : "manual",
    geo_confidence: geoConfidence,
    geo_review_status: geoReviewStatus,
    visibility_status: visibilityStatus,
    curation_note: [
      proposalSignal.label,
      proposalSignal.reason,
      locationMode === "address" ? `Endereco geocodificado${geocodeDisplayName ? `: ${geocodeDisplayName}` : ""}` : null,
      reference ? `Referencia: ${reference}` : null,
      duplicateHint ? `Parecido com ${duplicateHint}` : null
    ].filter(Boolean).join(" · ")
  };

  let { data, error } = await supabase
    .from("stations")
    .insert(payload)
    .select("id")
    .single();

  if ((error || !data?.id) && isLegacyStationsColumnError(error?.message)) {
    const legacyPayload = {
      name: nickname,
      brand,
      address,
      city,
      neighborhood: neighborhood || city,
      lat: lat ?? 0,
      lng: lng ?? 0,
      is_active: isActive
    };

    const legacyInsert = await supabase
      .from("stations")
      .insert(legacyPayload)
      .select("id")
      .single();

    data = legacyInsert.data;
    error = legacyInsert.error;
  }

  if (error || !data?.id) {
    await recordOperationalEvent({
      eventType: "station_proposal_created",
      severity: "error",
      scopeType: "station_seed",
      actorId: editor.id,
      actorEmail: editor.email,
      reason: error?.message ?? "seed_insert_failed",
      payload: { nickname, city, hasCoords, visibilityStatus, locationMode, geocodeConfidence }
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
      streetNumber,
      reference,
      neighborhood,
      officialName,
      city,
      lat,
      lng,
      accuracy,
      locationMode,
      locationConfirmed,
      geocodeConfidence,
      geocodeDisplayName,
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
      streetNumber,
      reference,
      neighborhood,
      officialName,
      city,
      lat,
      lng,
      accuracy,
      locationMode,
      locationConfirmed,
      geocodeConfidence,
      geocodeDisplayName,
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
      streetNumber,
      reference,
      neighborhood,
      officialName,
      city,
      lat,
      lng,
      accuracy,
      locationMode,
      locationConfirmed,
      geocodeConfidence,
      geocodeDisplayName,
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

  const nextParams = new URLSearchParams({ notice: "station_saved", stationId: data.id });
  redirect(`/postos?${nextParams.toString()}` as Route);
}





