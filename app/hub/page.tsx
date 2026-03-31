import { AppShell } from "@/components/layout/app-shell";
import { SubmissionHistoryProvider } from "@/components/history/submission-history-context";
import { CollectorHub } from "@/components/hub/collector-hub";
import { MissionProvider } from "@/components/mission/mission-context";
import { RouteRuntimeSignals } from "@/components/layout/route-runtime-signals";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { getHomeStations } from "@/lib/data";
import type { StationWithReports } from "@/lib/types";
import { SectionCard } from "@/components/ui/section-card";
import { logRuntimeIssue } from "@/lib/observability/runtime-issues";

export const metadata = { robots: { index: false, follow: false, nocache: true } };

export const dynamic = "force-dynamic";

export default async function HubPage() {
  let stations: StationWithReports[] = [];
  try {
    stations = await getHomeStations();
  } catch (err) {
    logRuntimeIssue("Failed to fetch stations in HubPage", err, { scope: "public", surface: "pages/hub", fallback: "empty-station-list", optional: true });
  }

  return (
    <SubmissionHistoryProvider>
      <AppShell hideShellSubmitCta>
        <MissionProvider>
          <RouteRuntimeSignals />
        <div data-layout-scope="hub-wide" data-hero-primary="hub-continuity" className="space-y-4 pb-20">
          <SectionCard className="hidden space-y-2 border-white/10 bg-white/5 md:block xl:hidden">
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/36">Meu Hub</p>
              <div className="space-y-1">
                <h1 className="text-xl font-bold tracking-tight text-white xl:text-[1.6rem]">Seu Hub de continuidade.</h1>
                <p className="max-w-3xl text-sm text-white/56 xl:text-[14px]">
                  Aqui você vê o último gesto, a pendência atual e o próximo passo, sem repetir a barra do app.
                </p>
              </div>
            </div>
          </SectionCard>

          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 grayscale opacity-30">
              <Loader2 className="mb-4 h-8 w-8 animate-spin" />
              <p className="text-xs font-medium uppercase tracking-widest text-white/40">Carregando...</p>
            </div>
          }>
            <CollectorHub stations={stations} />
          </Suspense>
        </div>
        </MissionProvider>
      </AppShell>
    </SubmissionHistoryProvider>
  );
}