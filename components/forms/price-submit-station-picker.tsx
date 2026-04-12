"use client";

import type { MutableRefObject } from "react";
import { MapPin, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FuelType, StationWithReports } from "@/lib/types";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { calculateDistance, formatDistanceFromYou } from "@/lib/geo/distance";
import { formatRecencyLabel } from "@/lib/format/time";
import { cn } from "@/lib/utils";
import { getSelectedStationReport } from "@/lib/filters/public";
import { getStationPublicName, hasPendingStationLocationReview, isValidStationCoordinate } from "@/lib/quality/stations";

import type { StationPickerCandidate } from "./price-submit-form";

interface PriceSubmitStationPickerProps {
  stationId: string;
  selectedStation: StationWithReports | null;
  lockedStation: boolean;
  compactMode: boolean;
  stationError?: string;
  isStreetMode: boolean;
  coords: { lat: number; lng: number } | null;
  stationSearch: string;
  hasStationSearch: boolean;
  onStationSearchChange: (value: string) => void;
  stationSearchInputRef: MutableRefObject<HTMLInputElement | null>;
  showStationProposalFlow: boolean;
  onShowStationProposalFlowChange: (value: boolean) => void;
  stationProposalConfirmed: boolean;
  stationProposalName: string;
  onStationProposalNameChange: (value: string) => void;
  stationProposalStreet: string;
  onStationProposalStreetChange: (value: string) => void;
  stationProposalNeighborhood: string;
  onStationProposalNeighborhoodChange: (value: string) => void;
  stationProposalBrand: string;
  onStationProposalBrandChange: (value: string) => void;
  stationProposalNameInputRef: MutableRefObject<HTMLInputElement | null>;
  stationProposalStreetInputRef: MutableRefObject<HTMLInputElement | null>;
  proposalReady: boolean;
  proposalCity: string;
  proposalDuplicateCandidates: StationPickerCandidate[];
  nearbyRadiusMeters: number;
  nearbyPickerItems: StationPickerCandidate[];
  recentPickerItems: StationPickerCandidate[];
  fallbackPickerItems: StationPickerCandidate[];
  searchPickerItems: StationPickerCandidate[];
  showMoreNearby: boolean;
  onToggleMoreNearby: () => void;
  showMoreRecent: boolean;
  onToggleMoreRecent: () => void;
  showMoreFallback: boolean;
  onToggleMoreFallback: () => void;
  showMoreSearch: boolean;
  onToggleMoreSearch: () => void;
  fuelType: FuelType;
  isSuggested: boolean;
  stationSuggestionTone: "high" | "medium" | "none";
  stationSuggestionReason: string;
  geoStatusCopy: string;
  isAmbiguous: boolean;
  onStationSelect: (candidate: StationPickerCandidate, source: "nearby" | "recent" | "search" | "fallback") => void;
  onGetLocation: () => void;
  onConfirmStationProposal: () => void;
  onRejectStationProposal: () => void;
}

function shortAddress(address?: string | null) {
  if (!address) return "";
  return address
    .split(",")
    .slice(0, 2)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(", ");
}

function getGeoReviewBadge(candidate: StationPickerCandidate) {
  if (!candidate.hasReliableCoordinate) {
    return { label: "Sem geo", variant: "warning" as const };
  }

  if (candidate.station.geoReviewStatus === "pending") {
    return { label: "Geo em revisão", variant: "outline" as const };
  }

  if (candidate.station.geoReviewStatus === "manual_review") {
    return { label: "Geo em revisão", variant: "danger" as const };
  }

  return { label: "Geo ok", variant: "accent" as const };
}

function getStationSourceBadge(candidate: StationPickerCandidate, source: "nearby" | "recent" | "search" | "fallback") {
  if (source === "nearby" && candidate.hasReliableCoordinate) {
    return { label: "GPS", variant: "accent" as const };
  }

  if (source === "recent" || candidate.recentIndex < 999) {
    return { label: "Usado antes", variant: "outline" as const };
  }

  if (source === "search") {
    return { label: "Busca", variant: "secondary" as const };
  }

  if (candidate.cityContextMatch) {
    return { label: "Cidade", variant: "secondary" as const };
  }

  return { label: "Ranqueado", variant: "secondary" as const };
}

function StationOption({
  candidate,
  source,
  stationId,
  fuelType,
  onStationSelect
}: {
  candidate: StationPickerCandidate;
  source: "nearby" | "recent" | "search" | "fallback";
  stationId: string;
  fuelType: FuelType;
  onStationSelect: (candidate: StationPickerCandidate, source: "nearby" | "recent" | "search" | "fallback") => void;
}) {
  const isSelected = candidate.station.id === stationId;
  const geoBadge = getGeoReviewBadge(candidate);
  const isGeoPending = hasPendingStationLocationReview(candidate.station);
  const selectedReport = getSelectedStationReport(candidate.station, fuelType);
  const recentPriceLabel = selectedReport ? formatCurrencyBRL(selectedReport.price) : null;
  const recentTimeLabel = selectedReport ? formatRecencyLabel(selectedReport.reportedAt) : null;
  const streetLabel = candidate.addressShort || candidate.neighborhoodLabel || "Endereço curto indisponível";
  const brandLabel = candidate.brandLabel ?? "Sem bandeira";

  return (
    <button
      type="button"
      onClick={() => onStationSelect(candidate, source)}
      className={cn(
        "w-full rounded-[20px] border px-4 py-3 text-left transition-all",
        isSelected
          ? "border-[color:var(--color-accent)]/45 bg-[color:var(--color-accent)]/12 shadow-[0_12px_32px_rgba(255,212,0,0.12)]"
          : "border-white/10 bg-black/25 hover:border-white/18 hover:bg-white/[0.04]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-white">{candidate.publicName}</p>
            {isSelected ? <Badge variant="default">Escolhido</Badge> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/66">
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/78">{brandLabel}</span>
            <span className="truncate">{streetLabel}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/54">
            {candidate.distance !== null ? <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 font-semibold text-white/72">{formatDistanceFromYou(candidate.distance)}</span> : null}
            {recentPriceLabel ? <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-emerald-100">Preço {recentPriceLabel} · {recentTimeLabel}</span> : <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">Sem preço</span>}
            <Badge variant={geoBadge.variant}>{geoBadge.label}</Badge>
            {candidate.ambiguityCount > 1 ? <Badge variant="warning">Parecido</Badge> : null}
            {isGeoPending ? <Badge variant="outline">Geo em revisão</Badge> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1 text-xs text-white/42">
          <MapPin className="h-4 w-4" />
        </div>
      </div>
    </button>
  );
}

export function PriceSubmitStationPicker({
  stationId,
  selectedStation,
  lockedStation,
  compactMode,
  stationError,
  isStreetMode,
  coords,
  stationSearch,
  hasStationSearch,
  onStationSearchChange,
  stationSearchInputRef,
  showStationProposalFlow,
  onShowStationProposalFlowChange,
  stationProposalConfirmed,
  stationProposalName,
  onStationProposalNameChange,
  stationProposalStreet,
  onStationProposalStreetChange,
  stationProposalNeighborhood,
  onStationProposalNeighborhoodChange,
  stationProposalBrand,
  onStationProposalBrandChange,
  stationProposalNameInputRef,
  stationProposalStreetInputRef,
  proposalReady,
  proposalCity,
  proposalDuplicateCandidates,
  nearbyRadiusMeters,
  nearbyPickerItems,
  recentPickerItems,
  fallbackPickerItems,
  searchPickerItems,
  showMoreNearby,
  onToggleMoreNearby,
  showMoreRecent,
  onToggleMoreRecent,
  showMoreFallback,
  onToggleMoreFallback,
  showMoreSearch,
  onToggleMoreSearch,
  fuelType,
  isSuggested,
  stationSuggestionTone,
  stationSuggestionReason,
  geoStatusCopy,
  isAmbiguous,
  onStationSelect,
  onGetLocation,
  onConfirmStationProposal,
  onRejectStationProposal
}: PriceSubmitStationPickerProps) {
  const selectedStationReport = selectedStation ? getSelectedStationReport(selectedStation, fuelType) : null;

  return (
    <div className={cn("space-y-3 rounded-[22px] border border-white/8 bg-black/30 p-4", stationError && "border-red-500/50 bg-red-500/5")}>
      <input type="hidden" name="stationId" value={stationId} />
      <input type="hidden" name="stationProposalMode" value={showStationProposalFlow ? "1" : "0"} />
      <input type="hidden" name="stationProposalConfirmed" value={stationProposalConfirmed ? "1" : "0"} />
      <input type="hidden" name="stationProposalName" value={stationProposalName} />
      <input type="hidden" name="stationProposalStreet" value={stationProposalStreet} />
      <input type="hidden" name="stationProposalNeighborhood" value={stationProposalNeighborhood} />
      <input type="hidden" name="stationProposalBrand" value={stationProposalBrand} />
      <input type="hidden" name="stationProposalCity" value={proposalCity} />

      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-white" htmlFor="station-search">
          Posto
        </label>
        {compactMode ? <Badge variant="outline">Travado pelo contexto</Badge> : <Badge variant="outline">Proximidade e contexto</Badge>}
      </div>

      {lockedStation ? (
        <div className={cn("rounded-[18px] border bg-white/5 px-4 py-3 text-sm text-white/72 transition-all", stationError ? "border-red-500/50 bg-red-500/5" : "border-white/8")}>
          <p className="font-medium text-white">{selectedStation ? getStationPublicName(selectedStation) : "Posto"}</p>
          <p className="mt-1 text-white/54">{selectedStation?.neighborhood}, {selectedStation?.city}</p>
          {selectedStation?.address && !isStreetMode ? <p className="mt-1 text-xs text-white/42">{shortAddress(selectedStation.address)}</p> : null}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/34" />
              <input
                id="station-search"
                ref={stationSearchInputRef}
                value={stationSearch}
                onChange={(event) => onStationSearchChange(event.target.value)}
                placeholder="Buscar por nome, bairro, endereço, cidade ou bandeira"
                className={cn("h-12 w-full rounded-[18px] border bg-black/30 pl-11 pr-4 text-sm text-white outline-none transition", stationError ? "border-red-500/50 ring-1 ring-red-500/20" : "border-white/10")}
              />
            </div>
            {!coords ? (
              <Button type="button" variant="secondary" className="h-12 px-4 text-xs uppercase tracking-[0.18em]" onClick={onGetLocation}>
                Ver mais próximos
              </Button>
            ) : null}
          </div>

          {selectedStation ? (
            <div className="rounded-[18px] border border-[color:var(--color-accent)]/22 bg-[color:var(--color-accent)]/8 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">{getStationPublicName(selectedStation)}</p>
                    <Badge variant="default">Escolhido</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/72">
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">{selectedStation.distributorName?.trim() || selectedStation.brand?.trim() || "Sem bandeira"}</span>
                    <span className="truncate">{shortAddress(selectedStation.address) || selectedStation.neighborhood || selectedStation.city}</span>
                    {coords && isValidStationCoordinate(selectedStation.lat, selectedStation.lng) ? <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">{formatDistanceFromYou(calculateDistance(coords.lat, coords.lng, selectedStation.lat, selectedStation.lng))}</span> : null}
                  </div>
                  {selectedStationReport ? (
                    <p className="text-[11px] text-emerald-100/80">Preço {formatCurrencyBRL(selectedStationReport.price)} · {formatRecencyLabel(selectedStationReport.reportedAt)}</p>
                  ) : (
                    <p className="text-[11px] text-white/52">Sem preço.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {showStationProposalFlow ? (
            <div className="space-y-3 rounded-[20px] border border-[color:var(--color-accent)]/16 bg-[color:var(--color-accent)]/8 p-3.5">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-accent)]/72">Posto novo</p>
                <p className="text-sm font-semibold text-white">Se não achou, crie só o básico.</p>
                <p className="text-xs leading-relaxed text-white/56">Nome, rua e bairro bastam. Se houver um parecido, escolha ele antes de criar outro.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">Nome curto</span>
                  <input
                    ref={stationProposalNameInputRef}
                    value={stationProposalName}
                    onChange={(event) => onStationProposalNameChange(event.target.value)}
                    placeholder="Ex.: Posto X"
                    className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">Rua / trecho</span>
                  <input
                    ref={stationProposalStreetInputRef}
                    value={stationProposalStreet}
                    onChange={(event) => onStationProposalStreetChange(event.target.value)}
                    placeholder="Ex.: BR-393, km 285"
                    className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">Bairro</span>
                  <input
                    value={stationProposalNeighborhood}
                    onChange={(event) => onStationProposalNeighborhoodChange(event.target.value)}
                    placeholder="Ex.: Centro"
                    className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">Bandeira</span>
                  <input
                    value={stationProposalBrand}
                    onChange={(event) => onStationProposalBrandChange(event.target.value)}
                    placeholder="Opcional"
                    className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none"
                  />
                </label>
              </div>
              <div className={cn("rounded-[16px] border px-3 py-2.5 text-xs", coords ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-50" : "border-orange-400/20 bg-orange-400/10 text-orange-50")}>
                {coords ? "Sua localização ajuda a posicionar esse posto novo." : "Sem localização agora. Ainda dá para seguir com nome, rua e cidade."}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/42">Parecidos antes de criar</p>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/28">Até 3</span>
                </div>
                <div className="space-y-2">
                  {proposalDuplicateCandidates.length > 0 ? proposalDuplicateCandidates.map((candidate) => (
                    <StationOption key={`proposal:${candidate.station.id}`} candidate={candidate} source="search" stationId={stationId} fuelType={fuelType} onStationSelect={onStationSelect} />
                  )) : (
                    <div className="rounded-[16px] border border-white/8 bg-black/20 px-3 py-2 text-xs text-white/54">Digite nome ou rua para ver parecidos.</div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" className="w-full justify-center sm:flex-1" disabled={!proposalReady} onClick={onConfirmStationProposal}>
                  Criar novo posto
                </Button>
                <Button type="button" variant="secondary" className="w-full justify-center sm:flex-1" onClick={onRejectStationProposal}>
                  Escolher parecido
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {!lockedStation ? (
                <Button type="button" variant="secondary" className="h-9 px-3 text-[10px] uppercase tracking-[0.18em]" onClick={() => onShowStationProposalFlowChange(true)}>
                  Meu posto não está aqui
                </Button>
              ) : null}
            </div>
          )}

          {isAmbiguous ? (
            <div className="rounded-[18px] border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-50">
              <p className="font-semibold">Tem parecido?</p>
              <p className="mt-1 text-xs text-yellow-50/80">Se for o certo, siga. Se houver outro igual, troque antes de enviar.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button type="button" className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-white px-4 text-[11px] font-black uppercase tracking-[0.18em] text-black" onClick={onConfirmStationProposal}>
                  Seguir com este
                </button>
                <button type="button" className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white/82" onClick={onRejectStationProposal}>
                  Trocar por parecido
                </button>
              </div>
            </div>
          ) : null}

          {!hasStationSearch ? (
            <div className="space-y-4">
              {coords ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Mais próximos de você</p>
                    <span className="text-[11px] text-white/38">Raio inicial {nearbyRadiusMeters >= 5000 ? "5 km" : "2 km"}</span>
                  </div>
                  <div className="space-y-2">
                    {(showMoreNearby ? nearbyPickerItems : nearbyPickerItems.slice(0, 3)).map((candidate) => (
                      <StationOption key={`nearby:${candidate.station.id}`} candidate={candidate} source="nearby" stationId={stationId} fuelType={fuelType} onStationSelect={onStationSelect} />
                    ))}
                  </div>
                  {nearbyPickerItems.length > 3 ? (
                    <button type="button" className="text-[11px] font-semibold text-[color:var(--color-accent)]" onClick={onToggleMoreNearby}>
                      {showMoreNearby ? "Mostrar menos" : "Ver mais"}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {recentPickerItems.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Recentes e por onde você passou</p>
                    <span className="text-[11px] text-white/38">Memória curta do aparelho</span>
                  </div>
                  <div className="space-y-2">
                    {(showMoreRecent ? recentPickerItems : recentPickerItems.slice(0, 2)).map((candidate) => (
                      <StationOption key={`recent:${candidate.station.id}`} candidate={candidate} source="recent" stationId={stationId} fuelType={fuelType} onStationSelect={onStationSelect} />
                    ))}
                  </div>
                  {recentPickerItems.length > 2 ? (
                    <button type="button" className="text-[11px] font-semibold text-[color:var(--color-accent)]" onClick={onToggleMoreRecent}>
                      {showMoreRecent ? "Mostrar menos" : "Ver mais"}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Outros postos bem ranqueados</p>
                  <span className="text-[11px] text-white/38">Geo melhor e menos ambiguidade</span>
                </div>
                <div className="space-y-2">
                  {(showMoreFallback ? fallbackPickerItems : fallbackPickerItems.slice(0, 2)).map((candidate) => (
                    <StationOption key={`fallback:${candidate.station.id}`} candidate={candidate} source="fallback" stationId={stationId} fuelType={fuelType} onStationSelect={onStationSelect} />
                  ))}
                </div>
                {fallbackPickerItems.length > 2 ? (
                  <button type="button" className="text-[11px] font-semibold text-[color:var(--color-accent)]" onClick={onToggleMoreFallback}>
                    {showMoreFallback ? "Mostrar menos" : "Ver mais"}
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Resultados da busca</p>
                <span className="text-[11px] text-white/38">{searchPickerItems.length} encontrados</span>
              </div>
              {searchPickerItems.length > 0 ? (
                <>
                  <div className="space-y-2">
                    {(showMoreSearch ? searchPickerItems : searchPickerItems.slice(0, 3)).map((candidate) => (
                      <StationOption key={`search:${candidate.station.id}`} candidate={candidate} source="search" stationId={stationId} fuelType={fuelType} onStationSelect={onStationSelect} />
                    ))}
                  </div>
                  {searchPickerItems.length > 3 ? (
                    <button type="button" className="text-[11px] font-semibold text-[color:var(--color-accent)]" onClick={onToggleMoreSearch}>
                      {showMoreSearch ? "Mostrar menos" : "Ver mais"}
                    </button>
                  ) : null}
                </>
              ) : (
                <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/58">
                  Nenhum posto bateu com a busca. Tente nome, bairro, endereço, cidade ou bandeira.
                </div>
              )}
            </div>
          )}

          <div className="mt-2 flex items-start justify-between gap-3 rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-[11px] text-white/52">
            <div className="min-w-0">
              <p className="font-medium text-white/72">{isSuggested ? stationSuggestionTone === "high" ? "Mais provável" : "Sugerido" : "Guia"}</p>
              <p className="mt-1 leading-relaxed">{isSuggested ? stationSuggestionReason : geoStatusCopy}</p>
            </div>
            <Badge variant="outline">{geoStatusCopy.includes("Sem sua localização") ? "Sem GPS" : coords ? "Com GPS" : "Livre"}</Badge>
          </div>

          {!isStreetMode ? (
            <div className="flex flex-wrap gap-2 text-[11px] text-white/52">
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">1. Foto</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">2. Posto</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">3. Combustível</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">4. Preço</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">5. Enviar</span>
            </div>
          ) : null}
        </div>
      )}

      {stationError ? <p className="mt-1.5 px-1 text-[10px] font-bold uppercase text-red-400 tracking-wider transition-all animate-in fade-in slide-in-from-top-1">{stationError}</p> : null}
    </div>
  );
}


