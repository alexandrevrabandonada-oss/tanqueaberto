import * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import { Camera, Clock3, MapPin, Navigation, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { trackProductEvent } from "@/lib/telemetry/client";
import { SectionCard } from "@/components/ui/section-card";
import { fuelLabels } from "@/lib/format/labels";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { getSelectedStationReport } from "@/lib/filters/public";
import { getStationPublicName, hasPendingStationLocationReview } from "@/lib/quality/stations";
import { rememberStationVisit } from "@/lib/navigation/home-context";
import { GroupStatusBadge } from "@/components/ui/group-status-badge";
import { formatDistance } from "@/lib/geo/distance";
import { openExternalNavigation } from "@/lib/navigation/external-maps";
import type { FuelType, PriceReport, StationWithReports } from "@/lib/types";
import { cn } from "@/lib/utils";
import { QuickActionGroup, QuickActionButton } from "@/components/ui/quick-action";
import { useTestMode } from "@/hooks/use-test-mode";

interface StationCardProps {
  station: StationWithReports;
  fuelFilter?: "all" | FuelType;
  returnToHref?: string;
  isStreetMode?: boolean;
  isAssisted?: boolean;
  isUltraClaro?: boolean;
  isAdvanced?: boolean;
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
  recordActivity?: (type: 'view' | 'touch' | 'start' | 'complete', stationId?: string) => void;
  isHeaderSticky?: boolean;
  isHeaderMicro?: boolean;
}

function getStationHref(stationId: string, returnToHref?: string) {
  return returnToHref ? (`/postos/${stationId}?returnTo=${encodeURIComponent(returnToHref)}` as Route) : (`/postos/${stationId}` as Route);
}

function getSendHref(stationId: string, returnToHref?: string, fuelFilter?: "all" | FuelType) {
  const fuelParam = fuelFilter && fuelFilter !== "all" ? `&fuel=${fuelFilter}` : "";
  return returnToHref ? (`/enviar?stationId=${stationId}${fuelParam}&returnTo=${encodeURIComponent(returnToHref)}#photo` as Route) : ((`/enviar?stationId=${stationId}${fuelParam}#photo`) as Route);
}

export function StationCard({
  station,
  fuelFilter = "all",
  returnToHref,
  isStreetMode,
  isAssisted,
  isUltraClaro,
  isAdvanced,
  isFavorite,
  onFavoriteToggle,
  recordActivity,
  isHeaderSticky = false,
  isHeaderMicro = false
}: StationCardProps) {
  const latest: PriceReport | null = getSelectedStationReport(station, fuelFilter);
  const stationHref = getStationHref(station.id, returnToHref);
  const sendHref = getSendHref(station.id, returnToHref, fuelFilter);
  const latestTone = latest ? getRecencyTone(latest.reportedAt) : "stale";
  const latestLabel = latest
    ? latestTone === "stale"
      ? "Sem atualização recente"
      : `Atualizado ${formatRecencyLabel(latest.reportedAt)}`
    : "Sem preço recente";
  const showReviewBadge = hasPendingStationLocationReview(station) && !latest;
  const isContributionPriority = !latest || latestTone === "stale" || showReviewBadge || station.releaseStatus !== "ready";
  const { isActive: isTestMode } = useTestMode();

  const viewStartTime = React.useRef<number>(Date.now());

  const statusBadge = station.releaseStatus && station.releaseStatus !== "ready" ? (
    <GroupStatusBadge status={station.releaseStatus} />
  ) : showReviewBadge ? (
    <Badge variant="warning">Localização em revisão</Badge>
  ) : latest ? (
    <Badge variant={recencyToneToBadgeVariant(latestTone)}>{latestTone === "stale" ? "Sem atualização" : "Preço recente"}</Badge>
  ) : (
    <Badge variant="outline">Aguardando preço</Badge>
  );

  return (
    <SectionCard className={cn(
      "group relative overflow-hidden space-y-3 sm:space-y-4 py-3 sm:py-4 transition-all duration-200 hover:border-white/14 hover:bg-white/[0.07] focus-within:border-[color:var(--color-accent)]/30 focus-within:bg-white/[0.07]",
      isStreetMode && "space-y-2 py-3",
      isAdvanced && "py-2 space-y-1.5"
    )}>
      <Link
        href={stationHref}
        aria-label={`Abrir posto ${getStationPublicName(station)}`}
        className="absolute inset-0 z-0 rounded-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]/40"
        onClick={() => {
          recordActivity?.("view", station.id);
          rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
          void trackProductEvent({
            eventType: "station_clicked",
            pagePath: stationHref,
            pageTitle: getStationPublicName(station),
            stationId: station.id,
            city: station.city,
            fuelType: latest?.fuelType ?? null,
            scopeType: "station",
            scopeId: station.id,
            payload: { source: "station_card", isHeaderSticky, isHeaderMicro }
          });
        }}
      />
      <div className="relative z-10 space-y-3 sm:space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            {onFavoriteToggle && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onFavoriteToggle();
                }}
                className={cn("mt-1 shrink-0 p-3 -m-2", isFavorite ? "text-yellow-400" : "text-white/20")}
                aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <Star className={cn("h-5 w-5", isFavorite && "fill-current")} />
              </button>
            )}
            <div className="min-w-0">
              {!isStreetMode && !isAdvanced && <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">{station.brand || "Posto"}</p>}
              <h3 className={cn("truncate font-semibold text-white", (isStreetMode || isAdvanced) ? "text-base" : "text-base sm:text-lg")}>{getStationPublicName(station)}</h3>
              <div className="flex items-center gap-2">
                <p className="truncate text-[11px] sm:text-sm text-white/42">
                  {station.neighborhood}{!isStreetMode && !isAdvanced && `, ${station.city}`}
                </p>
                {station.distance !== undefined && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span className="shrink-0 text-[11px] font-semibold text-white/34">
                      {formatDistance(station.distance)}
                    </span>
                  </>
                )}
              </div>
              {isTestMode && (
                <p className="mt-1 font-mono text-[8px] text-indigo-400 opacity-60">
                  ID: {station.id.substring(0, 8)}... | Dist: {station.distance?.toFixed(4)}
                </p>
              )}
            </div>
          </div>
          {!isAdvanced && (
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              {statusBadge}
              {latest && !isStreetMode && <span className="text-[10px] uppercase tracking-wider text-white/30">{formatRecencyLabel(latest.reportedAt)}</span>}
            </div>
          )}
        </div>

        {!isStreetMode && !isAdvanced && (
          <div className="flex items-center gap-2 text-xs text-white/42">
            <MapPin className="h-3.5 w-3.5 text-[color:var(--color-accent)]/60" />
            <span className="truncate">{station.address}</span>
          </div>
        )}

        {latest ? (
          <div className={cn(
            "rounded-[20px] border border-white/8 bg-black/30 p-3 sm:p-4 transition-all",
            (isStreetMode || isAdvanced) && "p-2 px-3"
          )}>
            <div className="flex items-center justify-between">
              <span className={cn("font-medium text-white/56", (isStreetMode || isAdvanced) ? "text-xs" : "text-[11px] sm:text-xs") }>{fuelLabels[latest.fuelType]}</span>
              <span className={cn("font-bold tracking-tight text-white", (isStreetMode || isAdvanced) ? "text-lg" : "text-xl sm:text-2xl")}>{formatCurrencyBRL(latest.price)}</span>
            </div>
            {!isStreetMode && !isAdvanced && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-white/30">
                <Clock3 className="h-3 w-3" />
                {latestLabel}
              </div>
            )}
          </div>
        ) : !isStreetMode && !isAdvanced ? (
          <div className="rounded-[20px] border border-white/5 bg-white/5 p-4 text-sm leading-relaxed text-white/42">
            Posto cadastrado sem preço recente. Colabore com a primeira foto.
          </div>
        ) : null}

                <QuickActionGroup
          className={cn("relative z-10 grid grid-cols-2 gap-2 rounded-[22px] border border-[color:var(--color-accent)]/14 bg-[linear-gradient(180deg,rgba(255,204,0,0.08),rgba(255,255,255,0.03))] p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.18)]", isAdvanced && "gap-1.5 p-0.5")}
          onMisclick={() => {
            void trackProductEvent({
              eventType: "quick_action_misclick" as any,
              pagePath: stationHref,
              pageTitle: getStationPublicName(station),
              stationId: station.id,
              payload: { isHeaderSticky, isHeaderMicro }
            });
          }}
        >
          {isContributionPriority ? (
            <>
              <QuickActionButton
                icon={Camera}
                label={(isAssisted || isUltraClaro) ? "FOTO" : "Foto"}
                desktopLabel="Abrir câmera"
                variant="accent"
                isStreetMode={isStreetMode}
                isAssisted={isAssisted}
                isUltraClaro={isUltraClaro}
                href={sendHref}
                onClick={() => {
                  recordActivity?.("touch", station.id);
                  rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
                  void trackProductEvent({
                    eventType: "quick_action_clicked",
                    pagePath: sendHref,
                    pageTitle: getStationPublicName(station),
                    stationId: station.id,
                    payload: {
                      action: "photo",
                      isAssisted,
                      isUltraClaro,
                      streetMode: isStreetMode,
                      latencyMs: Date.now() - viewStartTime.current,
                      isHeaderSticky,
                      isHeaderMicro
                    }
                  });
                }}
              />

              <QuickActionButton
                icon={Navigation}
                label={(isAssisted || isUltraClaro) ? "ROTA" : "Rota"}
                desktopLabel="Traçar rota"
                variant="outline"
                isStreetMode={isStreetMode}
                isAssisted={isAssisted}
                isUltraClaro={isUltraClaro}
                onClick={() => {
                  recordActivity?.("touch", station.id);
                  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  void trackProductEvent({
                    eventType: "quick_action_clicked",
                    pagePath: "/",
                    stationId: station.id,
                    payload: {
                      action: "route",
                      isAssisted,
                      isUltraClaro,
                      streetMode: isStreetMode,
                      latencyMs: Date.now() - viewStartTime.current,
                      isHeaderSticky,
                      isHeaderMicro
                    }
                  });
                  openExternalNavigation(isMobile ? "waze" : "google", {
                    lat: station.lat,
                    lng: station.lng,
                    stationId: station.id,
                    stationName: getStationPublicName(station),
                    source: "station_card"
                  });
                }}
              />
            </>
          ) : (
            <>
              <QuickActionButton
                icon={MapPin}
                label={(isAssisted || isUltraClaro) ? "POSTO" : "Posto"}
                desktopLabel="Abrir posto"
                variant="accent"
                isStreetMode={isStreetMode}
                isAssisted={isAssisted}
                isUltraClaro={isUltraClaro}
                href={stationHref}
                onClick={() => {
                  recordActivity?.("touch", station.id);
                  rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
                  void trackProductEvent({
                    eventType: "quick_action_clicked",
                    pagePath: stationHref,
                    pageTitle: getStationPublicName(station),
                    stationId: station.id,
                    payload: {
                      action: "open_post",
                      isAssisted,
                      isUltraClaro,
                      streetMode: isStreetMode,
                      latencyMs: Date.now() - viewStartTime.current,
                      isHeaderSticky,
                      isHeaderMicro
                    }
                  });
                }}
              />

              <QuickActionButton
                icon={Navigation}
                label={(isAssisted || isUltraClaro) ? "ROTA" : "Rota"}
                desktopLabel="Traçar rota"
                variant="outline"
                isStreetMode={isStreetMode}
                isAssisted={isAssisted}
                isUltraClaro={isUltraClaro}
                onClick={() => {
                  recordActivity?.("touch", station.id);
                  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  void trackProductEvent({
                    eventType: "quick_action_clicked",
                    pagePath: "/",
                    stationId: station.id,
                    payload: {
                      action: "route",
                      isAssisted,
                      isUltraClaro,
                      streetMode: isStreetMode,
                      latencyMs: Date.now() - viewStartTime.current,
                      isHeaderSticky,
                      isHeaderMicro
                    }
                  });
                  openExternalNavigation(isMobile ? "waze" : "google", {
                    lat: station.lat,
                    lng: station.lng,
                    stationId: station.id,
                    stationName: getStationPublicName(station),
                    source: "station_card"
                  });
                }}
              />
            </>
          )}
        </QuickActionGroup>
      </div>
    </SectionCard>
  );
}
