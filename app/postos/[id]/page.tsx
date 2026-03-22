import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, Camera, Clock3, MapPinned } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PriceTable } from "@/components/station/price-table";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { getStationDetail } from "@/lib/data";
import { fuelLabels } from "@/lib/format/labels";
import { formatDateTimeBR, formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { formatCurrencyBRL } from "@/lib/format/currency";

export const dynamic = "force-dynamic";

interface StationPageProps {
  params: Promise<{ id: string }>;
}

function formatTrend(previous: number, current: number) {
  const delta = current - previous;
  const absolute = formatCurrencyBRL(Math.abs(delta));

  if (Math.abs(delta) < 0.005) {
    return "Sem variação";
  }

  return delta > 0 ? `Subiu ${absolute}` : `Caiu ${absolute}`;
}

export default async function StationPage({ params }: StationPageProps) {
  const { id } = await params;
  const station = await getStationDetail(id);

  if (!station) {
    notFound();
  }

  const latest = station.latestReports[0];

  return (
    <AppShell>
      <SectionCard className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">{station.brand}</p>
            <h2 className="mt-2 text-[1.9rem] font-semibold leading-none text-white">{station.name}</h2>
          </div>
          <div className="text-right">
            {latest ? (
              <Badge variant={recencyToneToBadgeVariant(getRecencyTone(latest.reportedAt))}>{formatRecencyLabel(latest.reportedAt)}</Badge>
            ) : (
              <Badge variant="outline">Sem atualização recente</Badge>
            )}
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/42">{station.neighborhood}, {station.city}</p>
          </div>
        </div>
        <div className="space-y-3 text-sm text-white/62">
          <div className="flex items-center gap-2">
            <MapPinned className="h-4 w-4 text-[color:var(--color-accent)]" />
            {station.address}, {station.neighborhood}, {station.city}
          </div>
          {latest ? (
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-[color:var(--color-accent)]" />
              Última atualização em {formatDateTimeBR(latest.reportedAt)}
            </div>
          ) : (
            <div className="rounded-[18px] border border-white/8 bg-black/25 px-4 py-3 text-sm text-white/58">
              Ainda não há preço recente aprovado para este posto.
            </div>
          )}
        </div>
        <ButtonLink href="/enviar" className="w-full">
          Enviar novo preço
          <ArrowRight className="h-4 w-4" />
        </ButtonLink>
        {latest ? (
          <div className="overflow-hidden rounded-[24px] border border-white/8 bg-black/30">
            <Image src={latest.photoUrl} alt={`Foto recente de ${station.name}`} width={1280} height={720} className="h-56 w-full object-cover" />
          </div>
        ) : null}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Preço recente por combustível</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Resumo rápido</h3>
          </div>
          <Badge variant="warning">{station.latestReports.length} faixas ativas</Badge>
        </div>
        {station.latestReports.length === 0 ? (
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">
            Sem preços recentes aprovados para este posto.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {station.latestReports.map((report) => {
              const previous = station.recentReports.find((item) => item.fuelType === report.fuelType && item.id !== report.id);

              return (
                <div key={report.id} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{fuelLabels[report.fuelType]}</p>
                      <p className="text-xs text-white/46">{formatRecencyLabel(report.reportedAt)}</p>
                    </div>
                    <p className="text-lg font-semibold text-white">{formatCurrencyBRL(report.price)}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-white/56">
                    <Camera className="h-3.5 w-3.5 text-[color:var(--color-accent)]" />
                    {previous ? formatTrend(previous.price, report.price) : "Primeiro preço desta faixa"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Histórico recente</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Linha do tempo</h3>
        </div>
        {station.recentReports.length === 0 ? (
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">
            Sem atualização recente para este posto.
          </div>
        ) : (
          <PriceTable reports={station.recentReports} />
        )}
      </SectionCard>

      <ButtonLink href="/enviar" className="w-full justify-center py-4">
        Enviar novo preço para este posto
        <ArrowRight className="h-4 w-4" />
      </ButtonLink>
    </AppShell>
  );
}
