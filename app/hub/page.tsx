import { AppShell } from "@/components/layout/app-shell";
import { CollectorHub } from "@/components/hub/collector-hub";
import { Suspense } from "react";
import { Loader2, ArrowRight, Clock3, ShieldCheck, Zap } from "lucide-react";
import { getHomeStations } from "@/lib/data";
import type { StationWithReports } from "@/lib/types";
import { SectionCard } from "@/components/ui/section-card";

export default async function HubPage() {
  let stations: StationWithReports[] = [];
  try {
    stations = await getHomeStations();
  } catch (err) {
    console.error("Failed to fetch stations in HubPage", err);
  }

  return (
    <AppShell>
      <div data-layout-scope="hub-wide" className="space-y-6 pb-20">
        <SectionCard className="space-y-4 border-white/10 bg-white/5 xl:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/36">Meu Hub</p>
              <h1 className="text-2xl font-bold tracking-tight text-white xl:text-[2.1rem]">Central de continuidade do Bomba Aberta.</h1>
              <p className="max-w-2xl text-sm text-white/52">Sessão recente, fila, missão, impacto e próximo passo convivendo no mesmo eixo.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-white/38">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><Clock3 className="h-3.5 w-3.5 text-[color:var(--color-accent)]" />Sessão</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />Fila</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><Zap className="h-3.5 w-3.5 text-amber-400" />Missão</span>
            </div>
          </div>
        </SectionCard>

        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 grayscale opacity-30">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="text-xs font-medium uppercase tracking-widest text-white/40">Sincronizando dados...</p>
          </div>
        }>
          <CollectorHub stations={stations} />
        </Suspense>
      </div>
    </AppShell>
  );
}


