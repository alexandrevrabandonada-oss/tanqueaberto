import { ArrowRight, Camera, Clock3, Search } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { StationMapShell } from "@/components/map/station-map-shell";
import { StationCard } from "@/components/station/station-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { recentUpdates, stations } from "@/lib/mock-data";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

export default function HomePage() {
  return (
    <AppShell>
      <SectionCard className="overflow-hidden p-0">
        <div className="border-b border-white/8 px-5 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Badge>Mapa vivo</Badge>
              <h2 className="mt-3 font-display text-[1.75rem] leading-none text-white">
                Preco recente, foto e recencia num toque.
              </h2>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-[22px] border border-white/8 bg-black/30 px-4 py-3 text-sm text-white/50">
            <Search className="h-4 w-4 text-[color:var(--color-accent)]" />
            Buscar posto, bairro ou cidade
          </div>
          <div className="mt-3">
            <ButtonLink href="/sobre" variant="ghost" className="px-0 py-0 text-xs uppercase tracking-[0.18em] text-white/52">
              Ver metodologia
            </ButtonLink>
          </div>
        </div>
        <StationMapShell />
      </SectionCard>

      <SectionCard className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Postos ativos</p>
          <p className="mt-3 text-3xl font-semibold text-white">{stations.length}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Ultimas 24h</p>
          <p className="mt-3 text-3xl font-semibold text-white">{recentUpdates.length}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Envios com foto</p>
          <p className="mt-3 text-3xl font-semibold text-white">100%</p>
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Agora no mapa</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Consulta rapida</h2>
          </div>
          <Link href="/atualizacoes" className="text-sm text-[color:var(--color-accent)]">
            Ver feed
          </Link>
        </div>
        <div className="space-y-3">
          {stations.map((station) => (
            <StationCard key={station.id} station={station} />
          ))}
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Atualizacoes recentes</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Transparencia popular</h2>
          </div>
          <Clock3 className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>
        <div className="space-y-3">
          {recentUpdates.slice(0, 3).map((report) => {
            const station = stations.find((item) => item.id === report.stationId);

            return (
              <div key={report.id} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{station?.name}</p>
                    <p className="text-sm text-white/50">{station?.neighborhood}</p>
                  </div>
                  <Badge variant="warning">{formatRelativeTime(report.reportedAt)}</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-white/58">
                    <Camera className="h-4 w-4 text-[color:var(--color-accent)]" />
                    Foto + horario capturados
                  </div>
                  <p className="text-xl font-semibold text-white">{formatCurrency(report.price)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <ButtonLink href="/enviar" className="px-5 py-3">
          Enviar novo preco
          <ArrowRight className="h-4 w-4" />
        </ButtonLink>
      </SectionCard>
    </AppShell>
  );
}
