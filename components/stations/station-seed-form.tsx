"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { LocateFixed, Loader2, MapPin, MapPinned, Navigation, Search, ShieldCheck } from "lucide-react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Station } from "@/lib/types";
import { calculateDistance, formatDistance } from "@/lib/geo/distance";
import { cn } from "@/lib/utils";
import { normalizeContextValue, readHomeContext, readLastStationContext } from "@/lib/navigation/home-context";
import { useGeolocation } from "@/hooks/use-geolocation";
import { getStationPublicName } from "@/lib/quality/stations";
import { trackProductEvent } from "@/lib/telemetry/client";

import { createStationSeedAction, geocodeStationSeedAddressAction, type StationSeedState } from "@/app/postos/cadastrar/actions";

const initialState: StationSeedState = { error: null, success: false, createdStationId: null };

interface StationSeedFormProps {
  stations: Station[];
  notice?: string;
  stationId?: string;
  initialCity?: string;
  initialNeighborhood?: string;
  seedOrigin?: string;
}

interface CandidateStation {
  station: Station;
  score: number;
  reason: string;
  distance: number | null;
}

type LocationMode = "gps" | "address";

const seedPinIcon = new L.DivIcon({
  className: "custom-map-pin",
  html: '<div class="map-pin-dot map-pin-dot--recent"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

function MapCenter({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], 16);
  }, [center.lat, center.lng, map]);
  return null;
}

function DraggableSeedMarker({
  position,
  onChange
}: {
  position: { lat: number; lng: number };
  onChange: (next: { lat: number; lng: number }) => void;
}) {
  const [draggable, setDraggable] = useState(true);
  const markerRef = useRef<L.Marker | null>(null);

  useMapEvents({
    click(event) {
      onChange({ lat: event.latlng.lat, lng: event.latlng.lng });
    }
  });

  return (
    <Marker
      draggable={draggable}
      icon={seedPinIcon}
      position={[position.lat, position.lng]}
      ref={markerRef}
      eventHandlers={{
        dragend: () => {
          const marker = markerRef.current;
          if (!marker) return;
          const point = marker.getLatLng();
          onChange({ lat: point.lat, lng: point.lng });
        },
        dblclick: () => setDraggable((value) => !value)
      }}
    />
  );
}

function normalize(value: string) {
  return normalizeContextValue(value);
}

function scoreCandidate(station: Station, input: { nickname: string; brand: string; street: string; neighborhood: string; officialName: string; city: string }, coords: { lat: number; lng: number } | null): CandidateStation | null {
  const query = normalize([input.nickname, input.brand, input.street, input.neighborhood, input.officialName, input.city].filter(Boolean).join(" "));
  const stationText = normalize([getStationPublicName(station), station.brand, station.address, station.city, station.neighborhood].filter(Boolean).join(" "));

  if (!query) {
    return null;
  }

  const tokenSet = new Set(query.split(/\s+/g).filter(Boolean));
  const stationTokens = new Set(stationText.split(/\s+/g).filter(Boolean));
  const overlap = [...tokenSet].filter((token) => stationTokens.has(token)).length;

  let score = 0;
  const reasons: string[] = [];

  if (stationText === query) {
    score += 60;
    reasons.push("nome igual");
  } else if (overlap >= 2) {
    score += 30;
    reasons.push("nome parecido");
  } else if (overlap === 1) {
    score += 15;
    reasons.push("nome semelhante");
  }

  if (input.brand && normalize(station.brand) === normalize(input.brand)) {
    score += 14;
    reasons.push("mesma bandeira");
  }

  if (input.city && normalize(station.city) === normalize(input.city)) {
    score += 12;
    reasons.push("mesma cidade");
  }

  if (input.neighborhood && normalize(station.neighborhood) === normalize(input.neighborhood)) {
    score += 10;
    reasons.push("mesmo bairro");
  }

  if (input.street && normalize(station.address).includes(normalize(input.street))) {
    score += 14;
    reasons.push("mesma rua");
  }

  const distance = coords ? calculateDistance(coords.lat, coords.lng, station.lat, station.lng) : null;
  if (distance !== null) {
    if (distance <= 400) {
      score += 20;
      reasons.push("muito perto");
    } else if (distance <= 1200) {
      score += 12;
      reasons.push("perto");
    }
  }

  if (score < 20) {
    return null;
  }

  return {
    station,
    score,
    distance,
    reason: reasons.slice(0, 2).join(" · ") || "posto parecido"
  };
}

function SeedDuplicateCard({ candidate, onUseExisting }: { candidate: CandidateStation; onUseExisting: (station: Station) => void }) {
  return (
    <button
      type="button"
      onClick={() => onUseExisting(candidate.station)}
      className="w-full rounded-[18px] border border-white/10 bg-black/25 px-4 py-3 text-left transition hover:border-white/18 hover:bg-white/[0.04]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-semibold text-white">{getStationPublicName(candidate.station)}</p>
          <p className="text-xs text-white/58">{candidate.station.brand || "Sem bandeira"} · {candidate.station.neighborhood} · {candidate.station.city}</p>
          <p className="text-[11px] text-white/42">{candidate.reason}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[11px] text-white/42">
          {candidate.distance !== null ? <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{formatDistance(candidate.distance)}</span> : null}
          <Badge variant="outline">Usar este</Badge>
        </div>
      </div>
    </button>
  );
}

export function StationSeedForm({ stations, notice, initialCity, initialNeighborhood, seedOrigin }: StationSeedFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createStationSeedAction, initialState);
  const [isGeocoding, startGeocoding] = useTransition();
  const { coords, accuracy, loading, error, errorCode, getLocation } = useGeolocation();
  const [locationMode, setLocationMode] = useState<LocationMode>("gps");
  const [homeContextCity, setHomeContextCity] = useState("");
  const [lastStationCity, setLastStationCity] = useState("");
  const [nickname, setNickname] = useState("");
  const [brand, setBrand] = useState("");
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [reference, setReference] = useState("");
  const [neighborhood, setNeighborhood] = useState(initialNeighborhood?.trim() ?? "");
  const [officialName, setOfficialName] = useState("");
  const [city, setCity] = useState(initialCity?.trim() ?? "");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [geocodeConfidence, setGeocodeConfidence] = useState<"high" | "medium" | "low" | "">("");
  const [geocodeDisplayName, setGeocodeDisplayName] = useState("");
  const [geocodeMessage, setGeocodeMessage] = useState<string | null>(null);
  const [confirmCreate, setConfirmCreate] = useState(false);
  const nicknameInputRef = useRef<HTMLInputElement | null>(null);
  const cityInputRef = useRef<HTMLInputElement | null>(null);
  const flowOpenedTrackedRef = useRef(false);
  const gpsStateTrackedRef = useRef<string | null>(null);
  const flowAbandonedTrackedRef = useRef(false);
  const hasSubmittedRef = useRef(false);
  const latestSnapshotRef = useRef({ nickname: "", city: "", duplicateCount: 0, hasCoords: false });

  useEffect(() => {
    const homeContext = readHomeContext();
    const lastStation = readLastStationContext();
    setHomeContextCity(homeContext.city ?? "");
    setLastStationCity(lastStation?.city ?? "");
    setCity((initialCity ?? homeContext.city ?? lastStation?.city ?? "").trim());
    setNeighborhood((initialNeighborhood ?? "").trim());
  }, [initialCity, initialNeighborhood]);

  useEffect(() => {
    if (!coords) {
      return;
    }

    if (locationMode !== "gps") {
      return;
    }

    setLat((value) => value || coords.lat.toFixed(6));
    setLng((value) => value || coords.lng.toFixed(6));
  }, [coords, locationMode]);


  useEffect(() => {
    if (loading) {
      return;
    }

    const nextState = coords
      ? accuracy !== null && accuracy <= 100
        ? 'station_seed_gps_ok'
        : 'station_seed_gps_imprecise'
      : error || errorCode === 'denied'
        ? 'station_seed_no_gps'
        : null;

    if (!nextState || gpsStateTrackedRef.current === nextState) {
      return;
    }

    gpsStateTrackedRef.current = nextState;
    void trackProductEvent({
      eventType: nextState,
      pagePath: '/postos/cadastrar',
      pageTitle: 'Cadastro de postos',
      payload: {
        hasCoords: Boolean(coords),
        accuracy: accuracy ?? null,
        errorCode: errorCode ?? null
      }
    });
  }, [accuracy, coords, error, errorCode, loading]);

  useEffect(() => {
    if (flowOpenedTrackedRef.current) {
      return;
    }

    flowOpenedTrackedRef.current = true;
    void trackProductEvent({
      eventType: 'station_seed_flow_opened',
      pagePath: '/postos/cadastrar',
      pageTitle: 'Cadastro de postos'
    });
  }, []);

  useEffect(() => {
    return () => {
      if (hasSubmittedRef.current || flowAbandonedTrackedRef.current) {
        return;
      }

      const snapshot = latestSnapshotRef.current;
      if (!snapshot.nickname && !snapshot.city) {
        return;
      }

      flowAbandonedTrackedRef.current = true;
      void trackProductEvent({
        eventType: 'station_seed_flow_abandoned',
        pagePath: '/postos/cadastrar',
        pageTitle: 'Cadastro de postos',
        payload: snapshot
      });
    };
  }, []);

  const locationStatus = useMemo(() => {
    if (loading) {
      return "Localizando agora...";
    }

    if (coords && accuracy !== null && accuracy <= 100) {
      return "GPS confiavel";
    }

    if (coords) {
      return "GPS impreciso";
    }

    if (error) {
      return error;
    }

    if (errorCode === "denied") {
      return "GPS negado";
    }

    return "Sem GPS";
  }, [accuracy, coords, error, errorCode, loading]);

  const currentCoords = useMemo(() => {
    const parsedLat = Number(lat.replace(",", "."));
    const parsedLng = Number(lng.replace(",", "."));
    return Number.isFinite(parsedLat) && Number.isFinite(parsedLng)
      ? { lat: parsedLat, lng: parsedLng }
      : coords;
  }, [coords, lat, lng]);

  const duplicateCandidates = useMemo(() => {
    const input = { nickname, brand, street, neighborhood, officialName, city };

    return stations
      .map((station) => scoreCandidate(station, input, currentCoords))
      .filter((candidate): candidate is CandidateStation => candidate !== null)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);
  }, [brand, city, currentCoords, neighborhood, nickname, officialName, stations, street]);

  useEffect(() => {
    latestSnapshotRef.current = {
      nickname: nickname.trim(),
      city: (city || homeContextCity || lastStationCity).trim(),
      duplicateCount: duplicateCandidates.length,
      hasCoords: Boolean(currentCoords)
    };
  }, [city, currentCoords, duplicateCandidates.length, homeContextCity, lastStationCity, nickname]);

  const hasRequiredAddress = Boolean(street.trim() && (city.trim() || homeContextCity || lastStationCity));
  const canCreateNew = Boolean(
    nickname.trim()
      && (city.trim() || homeContextCity || lastStationCity)
      && (locationMode === "gps" || (hasRequiredAddress && currentCoords && locationConfirmed))
  );

  const hasLowGeocodeConfidence = geocodeConfidence === "low";

  function handleLocationModeChange(nextMode: LocationMode) {
    setLocationMode(nextMode);
    setLocationConfirmed(false);
    setConfirmCreate(false);
    if (nextMode === "gps") {
      setGeocodeMessage(null);
    }
  }

  function handleMapPointChange(next: { lat: number; lng: number }) {
    setLat(next.lat.toFixed(6));
    setLng(next.lng.toFixed(6));
    setLocationConfirmed(false);
  }

  function handleGeocodeAddress() {
    startGeocoding(async () => {
      const payload = new FormData();
      payload.set("nickname", nickname);
      payload.set("street", street);
      payload.set("streetNumber", streetNumber);
      payload.set("neighborhood", neighborhood);
      payload.set("city", city || homeContextCity || lastStationCity);

      const result = await geocodeStationSeedAddressAction(payload);
      if (!result.ok || result.lat === null || result.lng === null) {
        setGeocodeMessage(result.error ?? "Nao foi possivel localizar esse endereco.");
        setLocationConfirmed(false);
        return;
      }

      setLat(result.lat.toFixed(6));
      setLng(result.lng.toFixed(6));
      setGeocodeConfidence(result.confidence ?? "");
      setGeocodeDisplayName(result.displayName ?? "");
      setGeocodeMessage(result.confidence === "low"
        ? "Endereco encontrado com confianca baixa. Ajuste o pin e siga para revisao."
        : "Endereco localizado. Ajuste o pin se necessario e confirme o ponto.");
      setLocationConfirmed(false);
      setConfirmCreate(false);
    });
  }

  function handleUseExisting(station: Station) {
    void trackProductEvent({
      eventType: "station_seed_similar_chosen",
      pagePath: "/postos/cadastrar",
      pageTitle: "Cadastro de postos",
      stationId: station.id,
      city: station.city,
      payload: {
        stationId: station.id,
        publicName: getStationPublicName(station)
      }
    });
    router.push((`/postos/${station.id}` as Route));
  }

  const blockReason = !canCreateNew
    ? !nickname.trim()
      ? "Informe o apelido do posto."
      : !city.trim() && !homeContextCity && !lastStationCity
        ? "Informe a cidade do posto."
        : locationMode === "address" && !currentCoords
          ? "Geocodifique o endereço antes de salvar."
          : locationMode === "address" && !locationConfirmed
            ? "Confirme o ponto no mapa antes de salvar."
            : null
    : null;

  return (
    <>
      {pending && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-[28px] border border-white/12 bg-black/90 px-10 py-8 shadow-2xl">
            <Loader2 className="h-9 w-9 animate-spin text-[color:var(--color-accent)]" />
            <div className="text-center">
              <p className="text-base font-semibold text-white">Salvando posto...</p>
              <p className="mt-1 text-sm text-white/54">Aguarde enquanto o cadastro é registrado.</p>
            </div>
          </div>
        </div>
      )}
    <form action={formAction} onSubmit={() => { hasSubmittedRef.current = true; }} className="space-y-4">
      <input type="hidden" name="source" value="station_editor" />
      <input type="hidden" name="locationMode" value={locationMode} />
      <input type="hidden" name="locationConfirmed" value={locationConfirmed ? "1" : "0"} />
      <input type="hidden" name="geocodeConfidence" value={geocodeConfidence} />
      <input type="hidden" name="geocodeDisplayName" value={geocodeDisplayName} />
      <input type="hidden" name="accuracy" value={accuracy ?? ""} />
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      <input type="hidden" name="city" value={city || homeContextCity || lastStationCity} />
      <input type="hidden" name="duplicateHint" value={duplicateCandidates[0]?.station.id ?? ""} />

      <div className="rounded-[24px] border border-white/8 bg-black/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Cadastro restrito</p>
            <h1 className="text-2xl font-semibold text-white">Semeadura rapida de postos</h1>
            <p className="max-w-xl text-sm text-white/58">Fluxo curto para pessoas de confianca que precisam abrir um posto que ainda nao existe na lista.</p>
            
          </div>
          <Badge variant="outline">Papel estreito</Badge>
        </div>
        {seedOrigin || initialCity || initialNeighborhood ? (
          <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/58">
            <span className="font-semibold text-white">Contexto de campo:</span> {seedOrigin === "territorial_coverage" ? "Cobertura territorial" : seedOrigin || "Entrada manual"}
            {initialCity ? ` · ${initialCity}` : ""}
            {initialNeighborhood ? ` · ${initialNeighborhood}` : ""}
          </div>
        ) : null}
        {notice === "station_saved" ? <div className="mt-3 rounded-[18px] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-50">Posto salvo. Ele entra na fila de curadoria.</div> : null}
        {state.error ? <div className="mt-3 rounded-[18px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-50">{state.error}</div> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="space-y-3 rounded-[24px] border border-white/8 bg-black/25 p-4">
          <div className="flex items-center gap-2">
            <LocateFixed className="h-4 w-4 text-[color:var(--color-accent)]" />
            <h2 className="text-base font-semibold text-white">Como localizar o posto</h2>
          </div>
          <div className="grid gap-2">
            <button type="button" onClick={() => handleLocationModeChange("gps")} className={cn("rounded-[16px] border px-3 py-2 text-left text-sm", locationMode === "gps" ? "border-[color:var(--color-accent)]/45 bg-[color:var(--color-accent)]/12 text-white" : "border-white/10 bg-black/20 text-white/74")}>Usar GPS atual</button>
            <button type="button" onClick={() => handleLocationModeChange("address")} className={cn("rounded-[16px] border px-3 py-2 text-left text-sm", locationMode === "address" ? "border-[color:var(--color-accent)]/45 bg-[color:var(--color-accent)]/12 text-white" : "border-white/10 bg-black/20 text-white/74")}>Informar endereco</button>
          </div>
          <p className="text-sm text-white/58">{locationMode === "gps" ? locationStatus : "Digite endereco curto, geocodifique e confirme o pin no mapa."}</p>
          {locationMode === "address" ? (
            <div className="space-y-2 rounded-[16px] border border-[color:var(--color-accent)]/25 bg-[color:var(--color-accent)]/10 p-3">
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/60">Rua</span>
                <input value={street} onChange={(event) => { setStreet(event.target.value); setConfirmCreate(false); }} placeholder="Ex.: Av. Sávio Cota" className="w-full rounded-[14px] border border-white/12 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/34" />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/60">Numero</span>
                  <input value={streetNumber} onChange={(event) => { setStreetNumber(event.target.value); setConfirmCreate(false); }} placeholder="Ex.: 245" className="w-full rounded-[14px] border border-white/12 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/34" />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/60">Bairro</span>
                  <input value={neighborhood} onChange={(event) => { setNeighborhood(event.target.value); setConfirmCreate(false); }} placeholder="Ex.: Aterrado" className="w-full rounded-[14px] border border-white/12 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/34" />
                </label>
              </div>
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/60">Cidade</span>
                <input ref={cityInputRef} value={city} onChange={(event) => { setCity(event.target.value); setConfirmCreate(false); }} placeholder={homeContextCity || lastStationCity || "Ex.: Volta Redonda"} className="w-full rounded-[14px] border border-white/12 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/34" required />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/60">Referencia (opcional)</span>
                <input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ex.: em frente ao mercado" className="w-full rounded-[14px] border border-white/12 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/34" />
              </label>

              <Button type="button" variant="secondary" className="w-full" disabled={isGeocoding || !street.trim() || !(city.trim() || homeContextCity || lastStationCity)} onClick={handleGeocodeAddress}>
                {isGeocoding ? "Buscando endereco..." : "Geocodificar endereco"}
              </Button>
              {geocodeMessage ? <p className="text-xs text-white/72">{geocodeMessage}</p> : null}
              {geocodeDisplayName ? <p className="text-[11px] text-white/52">Resultado: {geocodeDisplayName}</p> : null}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 text-[11px] text-white/54">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{currentCoords ? "Com coordenada" : "Sem coordenada"}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{currentCoords ? `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}` : "Sem ponto"}</span>
          </div>
          {locationMode === "gps" ? (
            <Button type="button" variant="secondary" className="w-full" onClick={getLocation}>
              {loading ? "Buscando..." : coords ? "Atualizar GPS" : "Usar GPS agora"}
            </Button>
          ) : null}
        </section>

        <section className="space-y-3 rounded-[24px] border border-white/8 bg-black/25 p-4">
          <div className="flex items-center gap-2">
            <MapPinned className="h-4 w-4 text-[color:var(--color-accent)]" />
            <h2 className="text-base font-semibold text-white">Ajuste do ponto</h2>
          </div>
          <p className="text-sm text-white/58">Coordenadas finais usadas no cadastro. No modo endereco, confirme o pin antes de salvar.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/42">Latitude</span>
              <input value={lat} onChange={(event) => setLat(event.target.value)} inputMode="decimal" placeholder="-22.5" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/42">Longitude</span>
              <input value={lng} onChange={(event) => setLng(event.target.value)} inputMode="decimal" placeholder="-44.1" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" />
            </label>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-2 text-xs text-white/54">Toque no mapa para reposicionar rapidamente, ou arraste o pin.</div>

          {locationMode === "address" && currentCoords ? (
            <div className="space-y-2">
              <div className="h-52 overflow-hidden rounded-[18px] border border-white/10">
                <MapContainer center={[currentCoords.lat, currentCoords.lng]} zoom={16} scrollWheelZoom={false} className="h-full w-full">
                  <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapCenter center={currentCoords} />
                  <DraggableSeedMarker position={currentCoords} onChange={handleMapPointChange} />
                </MapContainer>
              </div>
              <Button type="button" variant={locationConfirmed ? "primary" : "secondary"} className="w-full" onClick={() => setLocationConfirmed((value) => !value)}>
                <Navigation className="h-4 w-4" />
                {locationConfirmed ? "Ponto confirmado" : "Confirmar este ponto no mapa"}
              </Button>
            </div>
          ) : null}

          {locationMode === "address" && !currentCoords ? (
            <div className="rounded-[18px] border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-xs text-yellow-50">Busque um endereco para visualizar e confirmar o pin.</div>
          ) : null}
        </section>
      </div>

      <section className="space-y-3 rounded-[24px] border border-white/8 bg-black/25 p-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-[color:var(--color-accent)]" />
          <h2 className="text-base font-semibold text-white">Apelido do posto</h2>
        </div>
        <label className="space-y-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/42">Apelido</span>
          <input
            ref={nicknameInputRef}
            value={nickname}
            onChange={(event) => {
              setNickname(event.target.value);
              setConfirmCreate(false);
            }}
            placeholder="Ex.: Posto da Rodovia"
            className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
            required
          />
        </label>
      </section>

      <section className="space-y-3 rounded-[24px] border border-white/8 bg-black/25 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[color:var(--color-accent)]" />
          <h2 className="text-base font-semibold text-white">Campos leves</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/42">Bandeira</span>
            <input value={brand} onChange={(event) => { setBrand(event.target.value); setConfirmCreate(false); }} placeholder="Opcional" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/42">Rua / trecho</span>
            <input value={street} onChange={(event) => { setStreet(event.target.value); setConfirmCreate(false); }} placeholder="Opcional" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/42">Bairro</span>
            <input value={neighborhood} onChange={(event) => { setNeighborhood(event.target.value); setConfirmCreate(false); }} placeholder="Opcional" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/42">Nome oficial</span>
            <input value={officialName} onChange={(event) => { setOfficialName(event.target.value); setConfirmCreate(false); }} placeholder="Opcional, interno" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/42">Cidade</span>
            <input ref={cityInputRef} value={city} onChange={(event) => { setCity(event.target.value); setConfirmCreate(false); }} placeholder={homeContextCity || lastStationCity || "Derivada do contexto"} className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" required />
          </label>
        </div>

        <input type="hidden" name="streetNumber" value={streetNumber} />
        <input type="hidden" name="reference" value={reference} />
      </section>

      <section className="space-y-3 rounded-[24px] border border-white/8 bg-black/25 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Duplicidade</p>
            <h2 className="mt-1 text-base font-semibold text-white">Veja parecidos antes de criar</h2>
          </div>
          <Badge variant="warning">{duplicateCandidates.length} parecidos</Badge>
        </div>

        {duplicateCandidates.length > 0 ? (
          <div className="space-y-2">
            {duplicateCandidates.map((candidate) => (
              <SeedDuplicateCard key={candidate.station.id} candidate={candidate} onUseExisting={handleUseExisting} />
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/58">Nada parecido apareceu por enquanto. Ainda assim, confira nome e bairro antes de salvar.</div>
        )}
      </section>

      <section className="space-y-3 rounded-[24px] border border-white/8 bg-black/25 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Saida</p>
            <h2 className="mt-1 text-base font-semibold text-white">Salvar agora ou revisar</h2>
          </div>
          <Badge variant={currentCoords ? "accent" : "warning"}>{currentCoords ? "Com geo" : "Sem geo"}</Badge>
        </div>

        <div className={cn("rounded-[18px] border px-4 py-3 text-sm", currentCoords && !hasLowGeocodeConfidence ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-50" : "border-yellow-400/20 bg-yellow-400/10 text-yellow-50")}>
          {currentCoords && !hasLowGeocodeConfidence
            ? "Com sinal bom, o posto pode entrar ativo."
            : hasLowGeocodeConfidence
              ? "Geocoding com confianca baixa: o posto vai para revisao manual."
              : "Sem geo forte, o posto vai para revisao antes de aparecer para todo mundo."}
        </div>

        {blockReason ? (
          <div className="rounded-[16px] border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm">
            <p className="font-semibold text-orange-100">{blockReason}</p>
            {locationMode === "address" && !locationConfirmed && currentCoords ? (
              <p className="mt-1 text-xs text-orange-100/72">Role para cima, ajuste o pin se necessário e clique em "Confirmar este ponto no mapa".</p>
            ) : null}
          </div>
        ) : null}

        <input type="hidden" name="confirmCreate" value={confirmCreate ? "1" : "0"} />
        <div className="flex flex-col gap-2 sm:flex-row">
          {duplicateCandidates.length > 0 && !confirmCreate ? (
            <Button type="button" disabled={!canCreateNew} className="w-full justify-center sm:flex-1" onClick={() => setConfirmCreate(true)}>
              Confirmar criacao mesmo assim
            </Button>
          ) : (
            <Button type="submit" disabled={pending || !canCreateNew} className="w-full justify-center sm:flex-1">
              {pending ? "Salvando..." : "Salvar posto"}
            </Button>
          )}
        </div>
        {duplicateCandidates.length > 0 ? <p className="text-[11px] text-white/46">Se um dos parecidos for o certo, abra ele e evite duplicidade.</p> : null}
      </section>
    </form>
    </>
  );
}










