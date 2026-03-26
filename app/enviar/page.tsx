import type { Route } from "next";
import { Camera, ShieldCheck, Clock3, MapPinned, Send } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { ProductEvent } from "@/components/telemetry/product-event";
import { PriceSubmitForm } from "@/components/forms/price-submit-form";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { QueueAssistant } from "@/components/routes/queue-assistant";
import { getHomeStations } from "@/lib/data";
import type { FuelType, StationWithReports } from "@/lib/types";

export const dynamic = "force-dynamic";

interface SubmitPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function safeReturnTo(value: string | string[] | undefined) {
  const candidate = firstValue(value);
  return candidate.startsWith("/") ? candidate : "";
}

function parseFuel(value: string | string[] | undefined): FuelType | undefined {
  const candidate = firstValue(value);
  const allowed: FuelType[] = ["gasolina_comum", "gasolina_aditivada", "etanol", "diesel_s10", "diesel_comum", "gnv"];
  return allowed.includes(candidate as FuelType) ? (candidate as FuelType) : undefined;
}

export default async function SubmitPage({ searchParams }: SubmitPageProps) {
  const params = (await searchParams) ?? {};
  let stations: StationWithReports[] = [];
  try {
    stations = await getHomeStations();
  } catch (err) {
    console.error("Failed to fetch stations in SubmitPage", err);
  }

  const initialStationId = firstValue(params.stationId);
  const returnToHref = safeReturnTo(params.returnTo);
  const initialStation = initialStationId ? stations.find((station) => station.id === initialStationId) ?? null : null;
  const initialFuelType = parseFuel(params.fuel);

  return (
    <AppShell>
      <ProductEvent eventType="submit_opened" pagePath="/enviar" pageTitle="Enviar preço" />
      <QueueAssistant />

      <div data-layout-scope="submit-wide" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(330px,360px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,400px)] xl:items-start">
        <div data-layout-role="main" className="space-y-6 min-w-0">
          <SectionCard className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">Envio rápido</p>
                <h2 className="mt-1 text-[1.8rem] font-semibold leading-none text-white">Enviar preço</h2>
              </div>
              <Badge variant="warning">Foto + preço + horário</Badge>
            </div>
            <p className="text-sm text-white/62">
              Fluxo direto para rua: foto cedo, posto certo, combustível, preço e envio. O report entra como aguardando moderação.
            </p>
            {initialStation ? (
              <div className="rounded-[18px] border border-[color:var(--color-accent)]/18 bg-[color:var(--color-accent)]/8 px-4 py-3 text-sm text-white/72">
                <span className="font-medium text-white/88">Posto pré-selecionado:</span> {initialStation.name} · {initialStation.neighborhood}, {initialStation.city}
              </div>
            ) : null}
          </SectionCard>

          <SectionCard className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-black/30 p-4">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-[color:var(--color-accent)]" />
                <div>
                  <p className="text-sm font-semibold text-white">Comece pela foto</p>
                  <p className="text-sm text-white/56">Na rua, é mais rápido fotografar primeiro e preencher o resto em seguida.</p>
                </div>
              </div>
              <a
                href="#photo"
                className="rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-white/72 transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
              >
                Tirar foto agora
              </a>
            </div>
            <PriceSubmitForm stations={stations} initialStationId={initialStation?.id} initialFuelType={initialFuelType} returnToHref={returnToHref || undefined} />
            <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">
              <div className="flex items-center gap-2 text-white/80">
                <ShieldCheck className="h-4 w-4 text-[color:var(--color-accent)]" />
                Vai para moderação
              </div>
              <p className="mt-2">Depois do envio, o report fica em aguardando moderação e entra na fila de aprovação.</p>
              {returnToHref ? (
                <div className="mt-3 flex gap-2">
                  <ButtonLink href={returnToHref as Route} variant="secondary">
                    Voltar ao mapa
                  </ButtonLink>
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>

        <aside data-layout-role="rail" className="space-y-6 xl:sticky xl:top-32">
          <SectionCard className="space-y-4 border-white/10 bg-white/5 xl:p-5">
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Rail de apoio</p>
              <h3 className="text-lg font-semibold text-white">Envio pensado para tela larga</h3>
              <p className="text-sm leading-relaxed text-white/54">O formulário fica no eixo principal; aqui entram contexto, atalhos e um lembrete do fluxo.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Ordem ideal</p>
                <p className="mt-2 text-sm font-semibold text-white">Foto, posto, combustível, valor e envio.</p>
              </div>
              <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Quando usar</p>
                <p className="mt-2 text-sm font-semibold text-white">Para preencher um ponto do mapa sem perder o ritmo da rua.</p>
              </div>
              <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Status</p>
                <p className="mt-2 text-sm font-semibold text-white">O envio entra na fila e volta para moderação.</p>
              </div>
            </div>

            <div className="space-y-2 rounded-[22px] border border-white/8 bg-black/25 p-4">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/36">
                <Clock3 className="h-3.5 w-3.5 text-[color:var(--color-accent)]" />
                Atalhos
              </div>
              <ButtonLink href="/" variant="secondary" className="w-full justify-center">
                <MapPinned className="h-4 w-4" />
                Voltar ao mapa
              </ButtonLink>
              <ButtonLink href="/atualizacoes" className="w-full justify-center">
                <Send className="h-4 w-4" />
                Ver atualizações
              </ButtonLink>
            </div>
          </SectionCard>
        </aside>
      </div>
    </AppShell>
  );
}


