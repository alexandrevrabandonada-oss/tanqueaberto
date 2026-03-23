import type { Route } from "next";
import Link from "next/link";
import { Clock3, MapPin } from "lucide-react";

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

  return (
    <SectionCard className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">{station.brand || "Cadastro territorial"}</p>
          <h3 className="truncate text-lg font-semibold text-white">{getStationPublicName(station)}</h3>
          <p className="mt-1 text-sm text-white/50">
            {station.neighborhood}, {station.city}
          </p>
        </div>
        <Badge variant={latest ? recencyToneToBadgeVariant(latestTone) : "outline"}>{latest ? (latestTone === "stale" ? "Sem atualização" : "Preço recente") : "Sem preço recente"}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {showReviewBadge ? <Badge variant="warning">Localização em revisão</Badge> : null}
        {latest ? <Badge variant="outline">{formatRecencyLabel(latest.reportedAt)}</Badge> : <Badge variant="outline">Aguardando primeiro preço</Badge>}
      </div>

      <div className="flex items-center gap-2 text-sm text-white/64">
        <MapPin className="h-4 w-4 text-[color:var(--color-accent)]" />
        <span>
          {station.address}, {station.neighborhood}, {station.city}
        </span>
      </div>

      {latest ? (
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/64">{fuelLabels[latest.fuelType]}</span>
            <span className="text-xl font-semibold text-white">{formatCurrencyBRL(latest.price)}</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-white/48">
            <Clock3 className="h-3.5 w-3.5" />
            {latestLabel}
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">
          <p>Este posto já está no mapa, mas ainda não recebeu preço recente aprovado.</p>
          <ButtonLink
            href={sendHref}
            className="w-full"
            onClick={() => {
              rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
              void trackProductEvent({ eventType: "submit_opened", pagePath: sendHref, pageTitle: getStationPublicName(station), stationId: station.id, city: station.city, fuelType: null, scopeType: "submission", scopeId: station.id, payload: { source: "station-card-send" } });
            }}
          >
            Enviar o primeiro preço
          </ButtonLink>
        </div>
      )}

      <Link
        href={stationHref}
        onClick={() => {
          rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
          void trackProductEvent({ eventType: "station_clicked", pagePath: stationHref, pageTitle: getStationPublicName(station), stationId: station.id, city: station.city, fuelType: latest?.fuelType ?? null, scopeType: "station", scopeId: station.id, payload: { source: "station-card-open" } });
        }}
        className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
      >
        Abrir posto
      </Link>
    </SectionCard>
  );
}
