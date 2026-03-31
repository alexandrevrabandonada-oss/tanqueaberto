"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { LocateFixed, MapPin, Search, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Station } from "@/lib/types";
import { calculateDistance, formatDistance } from "@/lib/geo/distance";
import { cn } from "@/lib/utils";
import { normalizeContextValue, readHomeContext, readLastStationContext } from "@/lib/navigation/home-context";
import { useGeolocation } from "@/hooks/use-geolocation";
import { getStationPublicName } from "@/lib/quality/stations";
import { trackProductEvent } from "@/lib/telemetry/client";

import { createStationSeedAction, type StationSeedState } from "@/app/postos/cadastrar/actions";

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
  const { coords, accuracy, loading, error, errorCode, getLocation } = useGeolocation();
  const [homeContextCity, setHomeContextCity] = useState("");
  const [lastStationCity, setLastStationCity] = useState("");
  const [nickname, setNickname] = useState("");
  const [brand, setBrand] = useState("");
  const [street, setStreet] = useState("");
  const [neighborhood, setNeighborhood] = useState(initialNeighborhood?.trim() ?? "");
  const [officialName, setOfficialName] = useState("");
  const [city, setCity] = useState(initialCity?.trim() ?? "");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
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

    setLat((value) => value || coords.lat.toFixed(6));
    setLng((value) => value || coords.lng.toFixed(6));
  }, [coords]);


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

  const duplicateCandidates = useMemo(() => {
    const input = { nickname, brand, street, neighborhood, officialName, city };
    const currentCoords = coords;

    return stations
      .map((station) => scoreCandidate(station, input, currentCoords))
      .filter((candidate): candidate is CandidateStation => candidate !== null)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);
  }, [brand, city, coords, neighborhood, nickname, officialName, stations, street]);

  useEffect(() => {
    latestSnapshotRef.current = {
      nickname: nickname.trim(),
      city: (city || homeContextCity || lastStationCity).trim(),
      duplicateCount: duplicateCandidates.length,
      hasCoords: Boolean(coords)
    };
  }, [city, coords, duplicateCandidates.length, homeContextCity, lastStationCity, nickname]);

  const canCreateNew = Boolean(nickname.trim() && (city.trim() || homeContextCity || lastStationCity));

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

  return (
    <form action={formAction} onSubmit={() => { hasSubmittedRef.current = true; }} className="space-y-4">
      <input type="hidden" name="source" value="station_editor" />
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
            <h2 className="text-base font-semibold text-white">Local atual</h2>
          </div>
          <p className="text-sm text-white/58">{locationStatus}</p>
          <div className="flex flex-wrap gap-2 text-[11px] text-white/54">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{coords ? "GPS ligado" : "GPS desligado"}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "Sem coordenada"}</span>
          </div>
          <Button type="button" variant="secondary" className="w-full" onClick={getLocation}>
            {loading ? "Buscando..." : coords ? "Atualizar GPS" : "Usar GPS agora"}
          </Button>
        </section>

        <section className="space-y-3 rounded-[24px] border border-white/8 bg-black/25 p-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[color:var(--color-accent)]" />
            <h2 className="text-base font-semibold text-white">Ajuste do local</h2>
          </div>
          <p className="text-sm text-white/58">Se precisar, mova o ponto com coordenadas simples. Se nao, siga com o GPS.</p>
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
          <div className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-2 text-xs text-white/54">Ajuste simples. Depois, a fila de curadoria decide se entra ativo ou em revisao.</div>
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
          <Badge variant={coords ? "accent" : "warning"}>{coords ? "Com geo" : "Sem geo"}</Badge>
        </div>

        <div className={cn("rounded-[18px] border px-4 py-3 text-sm", coords ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-50" : "border-yellow-400/20 bg-yellow-400/10 text-yellow-50")}>
          {coords ? "Com sinal bom, o posto pode entrar ativo. Se faltar sinal, ele fica para revisao." : "Sem geo forte, o posto vai para revisao antes de aparecer para todo mundo."}
        </div>

        <input type="hidden" name="confirmCreate" value={confirmCreate ? "1" : "0"} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" disabled={pending || !canCreateNew || (duplicateCandidates.length > 0 && !confirmCreate)} className="w-full justify-center sm:flex-1">
            {pending ? "Salvando..." : duplicateCandidates.length > 0 && !confirmCreate ? "Confirmar criacao" : "Salvar posto"}
          </Button>
          {duplicateCandidates.length > 0 ? (
            <Button type="button" variant="secondary" className="w-full justify-center sm:flex-1" onClick={() => setConfirmCreate(true)}>
              Criar novo mesmo assim
            </Button>
          ) : null}
        </div>
        {duplicateCandidates.length > 0 ? <p className="text-[11px] text-white/46">Se um dos parecidos for o certo, abra ele e evite duplicidade.</p> : null}
      </section>
    </form>
  );
}










