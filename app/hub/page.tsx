export const metadata = { robots: { index: false, follow: false, nocache: true } };

export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/app-shell";
import { CollectorHub } from "@/components/hub/collector-hub";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
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
    <AppShell hideShellSubmitCta>
      <div data-layout-scope="hub-wide" data-hero-primary="hub-continuity" className="space-y-4 pb-20">
        <SectionCard className="hidden space-y-2 border-white/10 bg-white/5 md:block xl:hidden">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/36">Meu Hub</p>
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-white xl:text-[1.6rem]">Centro de continuidade real.</h1>
              <p className="max-w-3xl text-sm text-white/56 xl:text-[14px]">
                Aqui o foco e o peso vao para o ultimo gesto, a pendencia atual e o proximo melhor passo, sem repetir o shell.
              </p>
            </div>
          </div>
        </SectionCard>

        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 grayscale opacity-30">
            <Loader2 className="mb-4 h-8 w-8 animate-spin" />
            <p className="text-xs font-medium uppercase tracking-widest text-white/40">Sincronizando dados...</p>
          </div>
        }>
          <CollectorHub stations={stations} />
        </Suspense>
      </div>
    </AppShell>
  );
}




