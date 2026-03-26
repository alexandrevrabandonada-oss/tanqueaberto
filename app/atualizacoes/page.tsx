import { AppShell } from "@/components/layout/app-shell";
import { FeedBrowser } from "@/components/feed/feed-browser";
import { getRecentFeed } from "@/lib/data";
import type { ReportWithStation } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { Clock3, Send, MapPinned } from "lucide-react";

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
  const actionHref = feed.length > 0 ? "/postos/sem-atualizacao" : "/";

  return (
    <AppShell>
      <div data-layout-scope="updates-wide" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(330px,360px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,400px)] xl:items-start">
        <div data-layout-role="main" className="min-w-0">
          <FeedBrowser feed={feed} />
        </div>

        <aside data-layout-role="rail" className="space-y-6 xl:sticky xl:top-32">
          <SectionCard className="space-y-4 border-white/10 bg-white/5 xl:p-5">
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Rail útil</p>
              <h2 className="text-lg font-semibold text-white">Estado do feed e ação recomendada</h2>
              <p className="text-sm leading-relaxed text-white/54">A lateral mostra volume aprovado, última leitura e o melhor próximo gesto sem competir com os filtros.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Atualizações</p>
                <p className="mt-2 text-2xl font-semibold text-white">{feed.length}</p>
                <p className="mt-1 text-xs text-white/48">Só entradas aprovadas.</p>
              </div>
              <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Última leitura</p>
                <p className="mt-2 text-sm font-semibold text-white">{latestReport ? latestReport.station.city : "Sem feed recente"}</p>
                <p className="mt-1 text-xs text-white/48">{latestReport ? latestReport.station.name : "Atualize o mapa com um envio novo."}</p>
              </div>
              <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Melhor gesto</p>
                <p className="mt-2 text-sm font-semibold text-white">{actionLabel}</p>
                <p className="mt-1 text-xs text-white/48">Se a lista estiver vazia, volte ao mapa para completar o recorte.</p>
              </div>
            </div>

            <div className="space-y-2 rounded-[22px] border border-white/8 bg-black/25 p-4">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/36">
                <Clock3 className="h-3.5 w-3.5 text-[color:var(--color-accent)]" />
                Ações rápidas
              </div>
              <ButtonLink href={actionHref} variant="secondary" className="w-full justify-center">
                <MapPinned className="h-4 w-4" />
                {actionLabel}
              </ButtonLink>
              <ButtonLink href="/enviar" className="w-full justify-center">
                <Send className="h-4 w-4" />
                Enviar preço
              </ButtonLink>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-[10px]">Somente aprovados</Badge>
              <Badge variant="warning" className="text-[10px]">Fechando lacunas</Badge>
            </div>
          </SectionCard>
        </aside>
      </div>
    </AppShell>
  );
}
