import { ShieldAlert, Image as ImageIcon, Scale, AlertCircle, TrendingDown } from "lucide-react";
import { getQualityMetrics } from "@/lib/data/quality-queries";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { fuelLabels } from "@/lib/format/labels";
import Link from "next/link";

export default async function QualityDashboardPage() {
  const metrics = await getQualityMetrics(7);

  return (
    <div className="space-y-6 pb-20">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white">Qualidade do Dado</h1>
        <p className="text-sm text-white/54">Monitoramento de ruído, conflitos e integridade das submissões (7 dias).</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SectionCard className="p-4 bg-white/5 border-white/8">
          <p className="text-[10px] uppercase tracking-widest text-white/30">Ruído Global</p>
          <p className="mt-1 text-2xl font-bold text-white">{(metrics.noiseRatio * 100).toFixed(1)}%</p>
          <div className="mt-2 flex items-center gap-1 text-[10px] text-white/40">
            <TrendingDown className="h-3 w-3" />
            <span>Sinalizações/Total</span>
          </div>
        </SectionCard>

        <SectionCard className="p-4 bg-white/5 border-white/8">
          <p className="text-[10px] uppercase tracking-widest text-white/30">Conflitos de Preço</p>
          <p className="mt-1 text-2xl font-bold text-orange-400">{metrics.priceConflicts}</p>
          <p className="mt-2 text-[10px] text-white/40">Discrepância {">"} 20%</p>
        </SectionCard>

        <SectionCard className="p-4 bg-white/5 border-white/8">
          <p className="text-[10px] uppercase tracking-widest text-white/30">Reuso de Foto</p>
          <p className="mt-1 text-2xl font-bold text-red-400">{metrics.potentialPhotoReuses}</p>
          <p className="mt-2 text-[10px] text-white/40">Hash duplicado (48h)</p>
        </SectionCard>

        <SectionCard className="p-4 bg-white/5 border-white/8">
          <p className="text-[10px] uppercase tracking-widest text-white/30">Total Sinalizados</p>
          <p className="mt-1 text-2xl font-bold text-white">{metrics.flaggedReports}</p>
          <p className="mt-2 text-[10px] text-white/40">Aguardando revisão foca</p>
        </SectionCard>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orange-400" />
            <h2 className="text-lg font-semibold text-white">Top Postos com Conflito</h2>
          </div>
          <div className="space-y-2">
            {metrics.topConflictStations.length === 0 ? (
              <p className="text-sm text-white/40 italic py-4">Nenhum conflito crítico recente.</p>
            ) : (
              metrics.topConflictStations.map(({ station, conflictCount }) => (
                <div key={station.id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 border border-white/5">
                  <div className="min-w-0 pr-4">
                    <p className="truncate text-sm font-medium text-white">{station.name}</p>
                    <p className="truncate text-[10px] text-white/30">{station.neighborhood} · {station.city}</p>
                  </div>
                  <Badge variant="warning">{conflictCount} conflitos</Badge>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard className="space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-semibold text-white">Sinalizações Recentes</h2>
          </div>
          <div className="space-y-2">
            {metrics.recentFlaggedReports.length === 0 ? (
              <p className="text-sm text-white/40 italic py-4">Nenhuma sinalização automática pendente.</p>
            ) : (
              metrics.recentFlaggedReports.map((report) => (
                <Link 
                  key={report.id} 
                  href={`/admin?search=${report.id}`}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 border border-white/5 hover:bg-white/10 transition"
                >
                  <div className="min-w-0 pr-4">
                    <p className="truncate text-sm font-medium text-white">{report.station.name}</p>
                    <p className="truncate text-[10px] text-white/30">
                      {fuelLabels[report.fuelType]} · {formatCurrencyBRL(report.price)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {report.metadata?.potential_photo_reuse && <Badge variant="danger" className="text-[8px]">REUSO FOTO</Badge>}
                    {report.metadata?.price_discrepancy && <Badge variant="warning" className="text-[8px]">DIFERENÇA ALTA</Badge>}
                  </div>
                </Link>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard className="p-6 bg-red-500/5 border-red-500/20">
        <div className="flex gap-4">
          <AlertCircle className="h-6 w-6 text-red-400 shrink-0" />
          <div className="space-y-2">
            <h3 className="font-semibold text-white text-lg">Integridade Operacional</h3>
            <p className="text-sm text-white/66 leading-relaxed">
              O sistema sinaliza automaticamente reports com discrepância de preço significativa ou fotos repetidas. 
              <strong> Estes itens não aparecem na Fast Lane de moderação pública</strong> até serem revisados manualmente para evitar poluição da base.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
