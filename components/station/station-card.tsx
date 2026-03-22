import type { Route } from "next";
import Link from "next/link";
import { Clock3, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { fuelLabels } from "@/lib/format/labels";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { getSelectedStationReport } from "@/lib/filters/public";
import { getStationMarketPresence, getStationMarketPresenceLabel, getStationPublicName, hasPendingStationLocationReview } from "@/lib/quality/stations";
import type { FuelType, StationWithReports } from "@/lib/types";

interface StationCardProps {
  station: StationWithReports;
  fuelFilter?: "all" | FuelType;
  returnToHref?: string;
}

function getStationHref(stationId: string, returnToHref?: string) {
  return returnToHref ? (`/postos/${stationId}?returnTo=${encodeURIComponent(returnToHref)}` as Route) : (`/postos/${stationId}` as Route);
}

function getSendHref(stationId: string, returnToHref?: string) {
  return returnToHref ? (`/enviar?stationId=${stationId}&returnTo=${encodeURIComponent(returnToHref)}#photo` as Route) : ((`/enviar?stationId=${stationId}#photo`) as Route);
}

export function StationCard({ station, fuelFilter = "all", returnToHref }: StationCardProps) {
  const latest = getSelectedStationReport(station, fuelFilter);
  const stationHref = getStationHref(station.id, returnToHref);
  const sendHref = getSendHref(station.id, returnToHref);
  const marketPresence = getStationMarketPresence(station);
  const marketLabel = getStationMarketPresenceLabel(station);

  return (
    <SectionCard className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">{station.brand}</p>
          <h3 className="text-lg font-semibold text-white">{getStationPublicName(station)}</h3>
        </div>
        <Badge variant={marketPresence === "recent" ? recencyToneToBadgeVariant(getRecencyTone(latest?.reportedAt ?? new Date().toISOString())) : "outline"}>
          {marketLabel}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Posto cadastrado</Badge>
        {hasPendingStationLocationReview(station) ? <Badge variant="warning">Localização em revisão</Badge> : null}
      </div>

      <div className="flex items-center gap-2 text-sm text-white/64">
        <MapPin className="h-4 w-4 text-[color:var(--color-accent)]" />
        <span>
          {station.neighborhood}, {station.city}
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
            {marketPresence === "recent" ? `Atualizado ${formatRecencyLabel(latest.reportedAt)}` : "Sem atualização recente"}
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">
          <p>Este posto já está no mapa, mas ainda não recebeu preço recente aprovado.</p>
          <ButtonLink href={sendHref} className="w-full">
            Enviar o primeiro preço
          </ButtonLink>
        </div>
      )}

      <Link
        href={stationHref}
        className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
      >
        Abrir posto
      </Link>
    </SectionCard>
  );
}
