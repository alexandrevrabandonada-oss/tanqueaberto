import type { Route } from "next";
import Link from "next/link";
import { Camera, Clock3, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { trackProductEvent } from "@/lib/telemetry/client";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { fuelLabels } from "@/lib/format/labels";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { getSelectedStationReport } from "@/lib/filters/public";
import { getStationPublicName, hasPendingStationLocationReview } from "@/lib/quality/stations";
import { rememberStationVisit } from "@/lib/navigation/home-context";
import { GroupStatusBadge } from "@/components/ui/group-status-badge";
import type { FuelType, PriceReport, StationWithReports } from "@/lib/types";

interface StationCardProps {
  station: StationWithReports;
  fuelFilter?: "all" | FuelType;
  returnToHref?: string;
}

function getStationHref(stationId: string, returnToHref?: string) {
  return returnToHref ? (`/postos/${stationId}?returnTo=${encodeURIComponent(returnToHref)}` as Route) : (`/postos/${stationId}` as Route);
}

function getSendHref(stationId: string, returnToHref?: string, fuelFilter?: "all" | FuelType) {
  const fuelParam = fuelFilter && fuelFilter !== "all" ? `&fuel=${fuelFilter}` : "";
  return returnToHref ? (`/enviar?stationId=${stationId}${fuelParam}&returnTo=${encodeURIComponent(returnToHref)}#photo` as Route) : ((`/enviar?stationId=${stationId}${fuelParam}#photo`) as Route);
}

export function StationCard({ station, fuelFilter = "all", returnToHref }: StationCardProps) {
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
    <SectionCard className="space-y-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">{station.brand || "Posto"}</p>
          <h3 className="truncate text-lg font-semibold text-white">{getStationPublicName(station)}</h3>
          <p className="truncate text-sm text-white/50">
            {station.neighborhood}, {station.city}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {statusBadge}
          {latest && <span className="text-[10px] uppercase tracking-wider text-white/30">{formatRecencyLabel(latest.reportedAt)}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-white/42">
        <MapPin className="h-3.5 w-3.5 text-[color:var(--color-accent)]/60" />
        <span className="truncate">
          {station.address}
        </span>
      </div>

      {latest ? (
        <div className="rounded-[20px] border border-white/8 bg-black/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/60">{fuelLabels[latest.fuelType]}</span>
            <span className="text-2xl font-bold tracking-tight text-white">{formatCurrencyBRL(latest.price)}</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-white/30">
            <Clock3 className="h-3 w-3" />
            {latestLabel}
          </div>
        </div>
      ) : (
        <div className="rounded-[20px] border border-white/5 bg-white/5 p-4 text-sm leading-relaxed text-white/42">
          Posto cadastrado sem preço recente. Colabore com a primeira foto.
        </div>
      )}

      <div className="flex items-center gap-2">
        <ButtonLink
          href={sendHref}
          className="flex-1"
          onClick={() => {
            rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
            void trackProductEvent({ eventType: "camera_opened_from_station", pagePath: sendHref, pageTitle: getStationPublicName(station), stationId: station.id, city: station.city, fuelType: latest?.fuelType ?? null, scopeType: "submission", scopeId: station.id, payload: { source: "station-card-bottom", compactMode: true } });
          }}
        >
          <Camera className="h-4 w-4" />
          Abrir câmera
        </ButtonLink>
        <Link
          href={stationHref}
          onClick={() => {
            rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
            void trackProductEvent({ eventType: "station_clicked", pagePath: stationHref, pageTitle: getStationPublicName(station), stationId: station.id, city: station.city, fuelType: latest?.fuelType ?? null, scopeType: "station", scopeId: station.id, payload: { source: "station-card-open" } });
          }}
          className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 px-6 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5 active:scale-[0.98]"
        >
          Ver detalhes
        </Link>
      </div>
    </SectionCard>
  );
}

