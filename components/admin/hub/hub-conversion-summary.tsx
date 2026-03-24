import { getHubConversionMetrics } from "@/lib/ops/hub-analytics";
import { SectionCard } from "@/components/ui/section-card";
import { BarChart3, Target, MousePointer2, Zap } from "lucide-react";

export async function HubConversionSummary() {
  const metrics = await getHubConversionMetrics();

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <SectionCard className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-blue-400">
          <BarChart3 className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Aberturas Hub</span>
        </div>
        <div className="text-2xl font-black">{metrics.totalHubOpens}</div>
      </SectionCard>

      <SectionCard className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-emerald-400">
          <MousePointer2 className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">CTR (Click Through)</span>
        </div>
        <div className="text-2xl font-black">{metrics.ctr.toFixed(1)}%</div>
      </SectionCard>

      <SectionCard className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-amber-400">
          <Target className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Conv. (Action {"->"} Send)</span>
        </div>
        <div className="text-2xl font-black">{metrics.conversionRate.toFixed(1)}%</div>
      </SectionCard>

      <SectionCard className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-rose-400">
          <Zap className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Retomada Missão</span>
        </div>
        <div className="text-2xl font-black">{metrics.missionResumptionRate.toFixed(1)}%</div>
      </SectionCard>
    </div>
  );
}
