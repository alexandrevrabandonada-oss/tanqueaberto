import type { Route } from "next";
import { Camera, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { SubmissionHistoryProvider } from "@/components/history/submission-history-context";
import { ProductEvent } from "@/components/telemetry/product-event";
import { MissionProvider } from "@/components/mission/mission-context";
import { RouteRuntimeSignals } from "@/components/layout/route-runtime-signals";
import { PriceSubmitIsland } from "@/components/forms/price-submit-island";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { getHomeStations } from "@/lib/data";
import { logRuntimeIssue } from "@/lib/observability/runtime-issues";
import type { FuelType, StationWithReports } from "@/lib/types";

export const metadata = { robots: { index: false, follow: false, nocache: true } };
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

function safeDraftKey(value: string | string[] | undefined) {
  const candidate = firstValue(value).trim();
  return candidate.startsWith("bomba-aberta:price-draft:") ? candidate : "";
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
    logRuntimeIssue("Failed to fetch stations in SubmitPage", err, {
      scope: "public",
      surface: "pages/enviar",
      fallback: "empty-station-list",
      optional: true
    });
  }

  const initialStationId = firstValue(params.stationId);
  const returnToHref = safeReturnTo(params.returnTo);
  const draftKeyOverride = safeDraftKey(params.draftKey);
  const initialStation = initialStationId ? stations.find((station) => station.id === initialStationId) ?? null : null;
  const initialFuelType = parseFuel(params.fuel);
  const flowSteps = ["Foto", "Posto", "Precos", "Envio"];

  return (
    <SubmissionHistoryProvider>
      <AppShell activeNavPath="/enviar">
        <MissionProvider>
          <RouteRuntimeSignals />
          <ProductEvent eventType="submit_opened" pagePath="/enviar" pageTitle="Enviar preço" />

          <div data-layout-scope="submit-wide" data-hero-primary="submit-form" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(330px,360px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,400px)] xl:items-start">
            <div data-layout-role="main" className="min-w-0 space-y-6">
              <SectionCard className="hidden space-y-2 border-white/10 bg-white/5 md:block xl:hidden">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Ajuda rápida</p>
                <h2 className="text-sm font-semibold text-white">O formulário continua sendo a parte principal</h2>
                <p className="text-sm text-white/54">
                  No celular e no tablet, a lateral some para não disputar com a foto, o posto e os preços.
                </p>
              </SectionCard>

              <SectionCard className="space-y-4 xl:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/42">Envio</p>
                    <h2 className="mt-1 text-[1.8rem] font-semibold leading-none text-white xl:text-[1.45rem]">Enviar preço</h2>
                  </div>
                  <Badge variant="warning">1 foto + 1 posto + 1 ou vários preços</Badge>
                </div>
                <p className="text-sm text-white/62 xl:text-[13px]">
                  Foto primeiro. Depois posto, preços por combustível e envio. Pode mandar um ou vários sem virar formulário pesado.
                </p>
                {initialStation ? (
                  <div className="rounded-[18px] border border-[color:var(--color-accent)]/18 bg-[color:var(--color-accent)]/8 px-4 py-3 text-sm text-white/72">
                    <span className="font-medium text-white/88">Posto pré-selecionado:</span> {initialStation.name} · {initialStation.neighborhood}, {initialStation.city}
                  </div>
                ) : null}
              </SectionCard>

              <SectionCard id="photo" className="space-y-3 scroll-mt-24 xl:space-y-2.5">
                <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-black/30 p-4 xl:p-3.5">
                  <div className="flex items-center gap-3">
                    <Camera className="h-5 w-5 text-[color:var(--color-accent)]" />
                    <div>
                      <p className="text-sm font-semibold text-white xl:text-[13px]">Comece pela foto</p>
                      <p className="text-sm text-white/56 xl:text-[13px]">Na rua, é mais rápido tirar a foto primeiro e preencher só os preços que aparecem nela.</p>
                    </div>
                  </div>
                  <a
                    href="#photo"
                    className="rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-white/72 transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
                  >
                    Tirar foto agora
                  </a>
                </div>

                <PriceSubmitIsland
                  stations={stations}
                  initialStationId={initialStation?.id}
                  initialFuelType={initialFuelType}
                  returnToHref={returnToHref || undefined}
                  draftKeyOverride={draftKeyOverride || undefined}
                />

                <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58 xl:p-3.5">
                  <div className="flex items-center gap-2 text-white/80">
                    <ShieldCheck className="h-4 w-4 text-[color:var(--color-accent)]" />
                    Vai para revisão
                  </div>
                  <p className="mt-2">Depois do envio, cada preço entra em revisão, mas a foto e o contexto seguem juntos.</p>
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

            <aside data-layout-role="rail" data-rail-useful="submit" className="hidden space-y-4 xl:block xl:sticky xl:top-24">
              <SectionCard className="space-y-3 border-white/10 bg-white/5 xl:p-4">
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Rail útil</p>
                  <h3 className="text-lg font-semibold text-white xl:text-base">Ordem, fila e atalho</h3>
                  <p className="text-sm leading-relaxed text-white/54 xl:text-[13px]">A lateral mostra a ordem do envio, o estado da fila e o melhor retorno para o mapa.</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-[20px] border border-white/8 bg-black/25 p-3.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Ordem do fluxo</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {flowSteps.map((step, index) => (
                        <Badge key={step} variant={index === 0 ? "warning" : "outline"} className="text-[10px]">
                          {step}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-white/48">Foto primeiro. Depois posto e bloco único de preços.</p>
                  </div>

                  <div className="rounded-[20px] border border-white/8 bg-black/25 p-3.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Fila e revisão</p>
                    <p className="mt-2 text-sm font-semibold text-white">Todo envio passa por revisão antes de aparecer no mapa.</p>
                    <p className="mt-1 text-xs text-white/48">A fila segura o pacote local sem travar quem está na rua.</p>
                  </div>
                </div>

                {initialStation ? (
                  <div className="rounded-[22px] border border-[color:var(--color-accent)]/16 bg-[color:var(--color-accent)]/8 p-3.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]/72">Posto escolhido</p>
                    <p className="mt-2 text-sm font-semibold text-white">{initialStation.name}</p>
                    <p className="mt-1 text-xs text-white/52">{initialStation.neighborhood}, {initialStation.city}</p>
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-white/8 bg-black/25 p-3.5 text-sm text-white/56 xl:text-[13px]">
                    Abra o mapa primeiro se quiser enviar já com o posto certo.
                  </div>
                )}
              </SectionCard>
            </aside>
          </div>
        </MissionProvider>
      </AppShell>
    </SubmissionHistoryProvider>
  );
}
