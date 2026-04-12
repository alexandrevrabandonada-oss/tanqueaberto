import Link from "next/link";
import type { Metadata } from "next";
import type { Route } from "next";
import { MapPinPlus, ShieldCheck, TriangleAlert } from "lucide-react";

import { StationSeedForm } from "@/components/stations/station-seed-form";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { getActiveStations, getStationById } from "@/lib/data/queries";
import { requireStationEditorUser } from "@/lib/auth/admin";
import { ProductEvent } from "@/components/telemetry/product-event";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cadastro de postos | Bomba Aberta",
  description: "Fluxo restrito para semear postos novos com baixa fricção e menos duplicidade."
};

interface StationSeedPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function readSeedParams(searchParams: Record<string, string | string[] | undefined>) {
  const notice = typeof searchParams.notice === "string" ? searchParams.notice : "";
  const stationId = typeof searchParams.stationId === "string" ? searchParams.stationId : "";
  const outcome = typeof searchParams.outcome === "string" ? searchParams.outcome : "";
  const city = typeof searchParams.city === "string" ? searchParams.city : "";
  const neighborhood = typeof searchParams.neighborhood === "string" ? searchParams.neighborhood : "";
  const seedOrigin = typeof searchParams.seedOrigin === "string" ? searchParams.seedOrigin : "";

  return { notice, stationId, outcome, city, neighborhood, seedOrigin };
}

function buildSeedHref(city: string, neighborhood?: string | null) {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (neighborhood) params.set("neighborhood", neighborhood);
  params.set("seedOrigin", "territorial_coverage");
  return `/postos/cadastrar?${params.toString()}` as Route;
}

export default async function StationSeedPage({ searchParams }: StationSeedPageProps) {
  await requireStationEditorUser("/postos/cadastrar");
  const resolvedSearchParams = (await searchParams) ?? {};
  const { notice, stationId, outcome, city, neighborhood, seedOrigin } = readSeedParams(resolvedSearchParams);
  const stations = await getActiveStations();
  const savedStation = stationId ? await getStationById(stationId) : null;
  const createdEventType = outcome === "active" ? "station_seed_new_station_active" : outcome === "manual_review" ? "station_seed_new_station_manual_review" : null;
  const continueHref = buildSeedHref(city || savedStation?.city || "", neighborhood || savedStation?.neighborhood || null);
  const backToCoverageHref = "/admin/ops/cobertura-territorial" as Route;
  const backToMapHref = "/" as Route;

  return (
    <div className="space-y-4 pb-16 pt-1">
      <ProductEvent eventType="station_seed_flow_opened" pagePath="/postos/cadastrar" pageTitle="Cadastro de postos" scopeType="station_seed" scopeId="/postos/cadastrar" />
      {createdEventType ? (
        <>
          <ProductEvent eventType="station_seed_new_station_created" pagePath="/postos/cadastrar" pageTitle="Cadastro de postos" scopeType="station_seed" scopeId={stationId || "/postos/cadastrar"} payload={{ outcome, stationId: stationId || null }} />
          <ProductEvent eventType={createdEventType} pagePath="/postos/cadastrar" pageTitle="Cadastro de postos" scopeType="station_seed" scopeId={stationId || "/postos/cadastrar"} payload={{ outcome, stationId: stationId || null }} />
        </>
      ) : null}

      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Cadastro restrito</p>
            <h1 className="text-[2rem] font-semibold leading-none text-white">Semeie um posto novo</h1>
            <p className="max-w-2xl text-sm text-white/58">Fluxo curto para pessoas de confiança cadastrarem um posto ainda ausente na lista, com menos duplicidade e sem abrir o admin completo.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
            <ShieldCheck className="h-4 w-4 text-[color:var(--color-accent)]" />
            Papel estreito
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">O que faz</p>
            <p className="mt-2 text-sm text-white/68">Cria posto, ajusta o local e salva sinal mínimo para curadoria.</p>
          </div>
          <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">O que não faz</p>
            <p className="mt-2 text-sm text-white/68">Não abre o admin completo nem expõe funções amplas de operação.</p>
          </div>
          <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Saída</p>
            <p className="mt-2 text-sm text-white/68">Com sinal forte, entra ativo. Sem isso, segue para revisão.</p>
          </div>
        </div>

        {notice === "station_saved" ? (
          <div className="space-y-3 rounded-[18px] border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 text-emerald-50">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/72">Salvo</p>
                <p className="text-base font-semibold text-emerald-50">Posto salvo. Agora você pode seguir em campo.</p>
                <p className="text-sm text-emerald-50/72">
                  {savedStation?.namePublic || savedStation?.name || "Posto"} · {savedStation?.city || city || "Sem cidade"}
                  {savedStation?.neighborhood || neighborhood ? ` · ${savedStation?.neighborhood || neighborhood}` : ""}
                </p>
              </div>
              <Badge variant="accent" className="h-6 px-2 text-[9px]">{outcome === "active" ? "Ativo" : "Revisão"}</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {stationId ? (
                <Link href={`/postos/${stationId}` as Route} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-white/15">
                  Abrir posto salvo
                </Link>
              ) : null}
              <Link href={continueHref} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 hover:bg-white/10">
                Cadastrar próximo
              </Link>
              <Link href="/postos" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 hover:bg-white/10">
                Ver base existente
              </Link>
              <Link href={backToCoverageHref} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 hover:bg-white/10">
                Voltar para cobertura
              </Link>
              <Link href={backToMapHref} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 hover:bg-white/10">
                Voltar para o mapa
              </Link>
            </div>
          </div>
        ) : null}

        {notice === "invite_accepted" ? (
          <div className="rounded-[18px] border border-[color:var(--color-accent)]/22 bg-[color:var(--color-accent)]/10 px-4 py-3 text-sm text-white/78">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>Convite confirmado. Sessão leve ativa neste aparelho para semeadura e edição de postos.</span>
              <Link href="/postos" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-white/15">
                Abrir base existente
              </Link>
            </div>
          </div>
        ) : null}
      </SectionCard>

      {seedOrigin ? (
        <SectionCard className="border-white/8 bg-black/25 px-4 py-3 text-sm text-white/58">
          <div className="flex flex-wrap items-center gap-2">
            <MapPinPlus className="h-4 w-4 text-[color:var(--color-accent)]" />
            <span>Contexto de entrada:</span>
            <span className="font-semibold text-white">{seedOrigin === "territorial_coverage" ? "Cobertura territorial" : seedOrigin}</span>
            {city ? <span>· {city}</span> : null}
            {neighborhood ? <span>· {neighborhood}</span> : null}
          </div>
        </SectionCard>
      ) : null}

      {notice !== "station_saved" ? (
        <SectionCard className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPinPlus className="h-5 w-5 text-[color:var(--color-accent)]" />
            <h2 className="text-xl font-semibold text-white">Novo posto</h2>
          </div>
          <p className="text-sm text-white/56">Use GPS atual ou informe endereço curto para geocodificar, ajustar o pin e confirmar o local antes de salvar.</p>
          <StationSeedForm stations={stations} notice={notice} initialCity={city} initialNeighborhood={neighborhood} seedOrigin={seedOrigin} />
        </SectionCard>
      ) : null}

      {notice !== "station_saved" ? (
        <SectionCard className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Link href="/postos" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">
              Navegar na base existente
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-yellow-300" />
            <h2 className="text-base font-semibold text-white">Dica rápida</h2>
          </div>
          <p className="text-sm text-white/58">Antes de criar, confira os parecidos acima e use o posto existente quando for o mesmo lugar.</p>
        </SectionCard>
      ) : null}
    </div>
  );
}



