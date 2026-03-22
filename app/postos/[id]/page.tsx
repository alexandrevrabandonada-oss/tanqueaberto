import Image from "next/image";
import { notFound } from "next/navigation";
import { Camera, Clock3, MapPinned } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PriceTable } from "@/components/station/price-table";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { getStationDetail } from "@/lib/data";
import { formatDateTimeBR, formatRecencyLabel } from "@/lib/format/time";

export const dynamic = "force-dynamic";

interface StationPageProps {
  params: Promise<{ id: string }>;
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
          <Badge>{latest ? formatRecencyLabel(latest.reportedAt) : "Sem atualização recente"}</Badge>
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
          ) : null}
        </div>
        {latest ? (
          <div className="overflow-hidden rounded-[24px] border border-white/8 bg-black/30">
            <Image src={latest.photoUrl} alt={`Foto recente de ${station.name}`} width={1280} height={720} className="h-56 w-full object-cover" />
          </div>
        ) : null}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Preços mais recentes</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Painel do posto</h3>
        </div>
        <PriceTable reports={station.latestReports} />
      </SectionCard>

      <SectionCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Histórico recente</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Linha do tempo</h3>
        </div>
        <div className="space-y-3">
          {station.recentReports.length === 0 ? (
            <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">
              Sem atualização recente para este posto.
            </div>
          ) : (
            station.recentReports.map((report) => (
              <div key={report.id} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-white/64">{formatDateTimeBR(report.reportedAt)}</p>
                  <Badge variant="warning">Aprovado</Badge>
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-white/52">
                  <Camera className="h-4 w-4 text-[color:var(--color-accent)]" />
                  Foto enviada por {report.reporterNickname ?? "anônimo"}
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </AppShell>
  );
}
