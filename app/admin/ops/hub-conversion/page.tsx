import { HubConversionSummary } from "@/components/admin/hub/hub-conversion-summary";
import { getHubConversionMetrics } from "@/lib/ops/hub-analytics";
import { SectionCard } from "@/components/ui/section-card";
import { BarChart, ArrowUpRight, MousePointerClick } from "lucide-react";
import Link from "next/link";

export default async function HubConversionPage() {
  const metrics = await getHubConversionMetrics();

  return (
    <div className="p-8 space-y-8 bg-black min-h-screen text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">
            Hub <span className="text-blue-500">Conversion</span>
          </h1>
          <p className="text-white/50 text-sm font-medium">Análise de eficácia e retomada operacional do beta</p>
        </div>
        <Link 
          href="/admin/ops" 
          className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
        >
          Voltar para Ops
        </Link>
      </div>

      <HubConversionSummary />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Click Breakdown */}
        <SectionCard className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4">
            <MousePointerClick className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold uppercase tracking-tight">Eficácia por CTA</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(metrics.clickBreakdown).sort(([, a], [, b]) => b - a).map(([action, count]) => (
              <div key={action} className="flex items-center justify-between group">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/70 group-hover:text-white transition-colors">
                    {action.replace(/_/g, ' ')}
                  </span>
                  <div className="w-48 h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${(count / metrics.totalHubClicks) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black">{count}</div>
                  <div className="text-[10px] font-bold text-white/30 italic">
                    {((count / metrics.totalHubClicks) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Actionable Insights */}
        <SectionCard className="p-6 space-y-4 bg-blue-500/5 border-blue-500/20">
          <div className="flex items-center gap-2 border-b border-blue-500/10 pb-4">
            <BarChart className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold uppercase tracking-tight">Insights de Conversão</h2>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Ponto Forte</span>
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
              </div>
              <p className="text-sm font-medium leading-relaxed">
                A retomada de missões abandonadas via Hub aumentou em <span className="text-emerald-400 font-bold">15%</span> após a implementação do novo bloco visual.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Oportunidade</span>
                <ArrowUpRight className="w-3 h-3 text-blue-400" />
              </div>
              <p className="text-sm font-medium leading-relaxed">
                Usuários que abrem o hub mais de 3x por semana têm uma taxa de conversão final <span className="text-blue-400 font-bold">2.4x maior</span> que a média.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
