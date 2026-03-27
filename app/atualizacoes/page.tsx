import { AppShell } from "@/components/layout/app-shell";
import { FeedBrowser } from "@/components/feed/feed-browser";
import { getRecentFeed } from "@/lib/data";
import type { ReportWithStation } from "@/lib/types";


import { SectionCard } from "@/components/ui/section-card";


export const dynamic = "force-dynamic";

export default async function UpdatesPage() {
  let feed: ReportWithStation[] = [];
  try {
    feed = await getRecentFeed();
  } catch (err) {
    console.error("Failed to fetch feed in UpdatesPage", err);
    feed = [];
  }

  const latestReport = [...feed].sort((left, right) => new Date(right.reportedAt).getTime() - new Date(left.reportedAt).getTime())[0] ?? null;
  const actionLabel = feed.length > 0 ? "Fechar lacunas do mapa" : "Abrir mapa";

  return (
    <AppShell>
      <div data-layout-scope="updates-wide" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(330px,360px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,400px)] xl:items-start">
        <div data-layout-role="main" className="min-w-0">
          <FeedBrowser feed={feed} />
        </div>

        <aside data-layout-role="rail" className="space-y-4 xl:sticky xl:top-24">
          <SectionCard className="space-y-3 border-white/10 bg-white/5 xl:p-4">
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Rail útil</p>
              <h2 className="text-lg font-semibold text-white xl:text-base">Estado do feed e ação recomendada</h2>
              <p className="text-sm leading-relaxed text-white/54 xl:text-[13px]">A lateral mostra volume aprovado, última leitura e o melhor próximo gesto sem competir com os filtros.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[20px] border border-white/8 bg-black/25 p-3.5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Atualizações</p>
                <p className="mt-2 text-2xl font-semibold text-white">{feed.length}</p>
                <p className="mt-1 text-xs text-white/48">Só entradas aprovadas.</p>
              </div>
              <div className="rounded-[20px] border border-white/8 bg-black/25 p-3.5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Última leitura</p>
                <p className="mt-2 text-sm font-semibold text-white">{latestReport ? latestReport.station.city : "Sem feed recente"}</p>
                <p className="mt-1 text-xs text-white/48">{latestReport ? latestReport.station.name : "Atualize o mapa com um envio novo."}</p>
              </div>
              <div className="rounded-[20px] border border-white/8 bg-black/25 p-3.5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Melhor gesto</p>
                <p className="mt-2 text-sm font-semibold text-white">{actionLabel}</p>
                <p className="mt-1 text-xs text-white/48">Se a lista estiver vazia, volte ao mapa para completar o recorte.</p>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/8 bg-black/25 p-3.5 text-sm text-white/56 xl:text-[13px]">
              A leitura rápida já está no feed principal. O rail fica só com o contexto que ajuda a decidir o próximo passo.
            </div>
          </SectionCard>
        </aside>
      </div>
    </AppShell>
  );
}




