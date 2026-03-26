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

  return (
    <AppShell>
      <div data-layout-scope="updates-wide" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(330px,360px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,400px)] xl:items-start">
        <div data-layout-role="main" className="min-w-0">
          <FeedBrowser feed={feed} />
        </div>

        <aside data-layout-role="rail" className="space-y-6 xl:sticky xl:top-32">
          <SectionCard className="space-y-4 border-white/10 bg-white/5 xl:p-5">
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Rail de apoio</p>
              <h2 className="text-lg font-semibold text-white">Atualizações em tela larga</h2>
              <p className="text-sm leading-relaxed text-white/54">O feed continua em coluna principal, enquanto o rail destaca a próxima ação e a leitura do produto.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Atualizações</p>
                <p className="mt-2 text-2xl font-semibold text-white">{feed.length}</p>
                <p className="mt-1 text-xs text-white/48">Entradas recentes aprovadas.</p>
              </div>
              <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Fluxo útil</p>
                <p className="mt-2 text-sm font-semibold text-white">Mapa, envio e recorte seguem conectados.</p>
                <p className="mt-1 text-xs text-white/48">Sem virar timeline genérica.</p>
              </div>
              <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Próximo gesto</p>
                <p className="mt-2 text-sm font-semibold text-white">Completar um posto ainda vazio melhora o mapa.</p>
              </div>
            </div>

            <div className="space-y-2 rounded-[22px] border border-white/8 bg-black/25 p-4">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/36">
                <Clock3 className="h-3.5 w-3.5 text-[color:var(--color-accent)]" />
                Ações rápidas
              </div>
              <ButtonLink href="/enviar" className="w-full justify-center md:hidden">
                <Send className="h-4 w-4" />
                Enviar preço
              </ButtonLink>
              <ButtonLink href="/" variant="secondary" className="w-full justify-center">
                <MapPinned className="h-4 w-4" />
                Voltar ao mapa
              </ButtonLink>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-[10px]">Social preview vivo</Badge>
              <Badge variant="warning" className="text-[10px]">Só aprovado</Badge>
            </div>
          </SectionCard>
        </aside>
      </div>
    </AppShell>
  );
}



