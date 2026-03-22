import type { Route } from "next";
import Link from "next/link";
import { Clock3, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { fuelLabels } from "@/lib/format/labels";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { getSelectedStationReport } from "@/lib/filters/public";
import { getStationPublicName, hasPendingStationLocationReview } from "@/lib/quality/stations";
import type { FuelType, StationWithReports } from "@/lib/types";

interface StationCardProps {
  station: StationWithReports;
  fuelFilter?: "all" | FuelType;
}

export function StationCard({ station, fuelFilter = "all" }: StationCardProps) {
  const latest = getSelectedStationReport(station, fuelFilter);
  const stationHref = `/postos/${station.id}` as Route;

  return (
    <SectionCard className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">{station.brand}</p>
          <h3 className="text-lg font-semibold text-white">{getStationPublicName(station)}</h3>
        </div>
        {latest ? (
          <Badge variant={recencyToneToBadgeVariant(getRecencyTone(latest.reportedAt))}>{formatRecencyLabel(latest.reportedAt)}</Badge>
        ) : (
          <Badge variant="outline">Sem atualização</Badge>
        )}
      </div>
      {hasPendingStationLocationReview(station) ? (
        <div className="rounded-[18px] border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          Localização em revisão
        </div>
      ) : null}
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
            Atualizado {formatRecencyLabel(latest.reportedAt)}
          </div>
        </div>
      ) : (
        <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/52">Sem atualização recente para esse filtro.</div>
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





