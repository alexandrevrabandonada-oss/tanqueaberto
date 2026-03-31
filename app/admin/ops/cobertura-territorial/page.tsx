import Link from "next/link";
import type { Route } from "next";
import { Clock3, MapPin, Sprout } from "lucide-react";

import { requireAdminUser } from "@/lib/auth/admin";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { getTerritorialCoverageReadout } from "@/lib/ops/territorial-coverage";

export const dynamic = "force-dynamic";

function badgeVariant(state: string) {
  if (state === "boa") return "accent";
  if (state === "fraca") return "warning";
  return "danger";
}

function buildSeedHref(city: string, neighborhood?: string | null): Route {
  const params = new URLSearchParams();
  params.set("city", city);
  if (neighborhood) params.set("neighborhood", neighborhood);
  params.set("seedOrigin", "territorial_coverage");
  return (`/postos/cadastrar?${params.toString()}` as Route);
}

function buildOpsHref(path: string, city: string, neighborhood?: string | null): Route {
  const params = new URLSearchParams();
  params.set("city", city);
  if (neighborhood) params.set("neighborhood", neighborhood);
  params.set("territoryContext", "territorial_coverage");
  return `${path}?${params.toString()}` as Route;
}

function TerritoryActions({ city, neighborhood }: { city: string; neighborhood?: string | null }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={buildSeedHref(city, neighborhood)} className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[color:var(--color-accent)]/18">Abrir semeadura neste bairro</Link>
      <Link href={buildOpsHref("/postos/sem-atualizacao", city, neighborhood)} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">Ver postos sem atualização</Link>
      <Link href={buildOpsHref("/admin/ops/qualidade", city, neighborhood)} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">Abrir curadoria deste território</Link>
      <Link href={buildOpsHref("/admin/ops/station-editors", city, neighborhood)} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">Ver editores que atuaram aqui</Link>
    </div>
  );
}

export default async function TerritorialCoveragePage() {
  await requireAdminUser();
  const coverage = await getTerritorialCoverageReadout(30);
  const focusZone = coverage.topZones[0] ?? coverage.cities[0]?.neighborhoods[0] ?? null;

  return (
    <div className="space-y-6 pb-20">
      <SectionCard className="space-y-4 border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-accent)]">Cobertura territorial</p>
            <h1 className="text-2xl font-semibold text-white">Onde falta posto e onde a base está fraca</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-white/58">Leitura simples por cidade e bairro para orientar station_editor, sem dashboard bonito e sem ruído.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/ops" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">Voltar ao OPS</Link>
            <Link href="/admin/ops/qualidade" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">Triagem rápida</Link>
            <Link href="/admin/ops/station-editors" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">Station editors</Link>
            <Link href="/admin/ops/impacto-semeadura-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">Impacto da semeadura</Link>
            <Link href="/admin/ops/historico-cobertura-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">Histórico territorial</Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Cidades", value: coverage.summary.cities, note: `${coverage.summary.neighborhoods} bairros` },
            { label: "Boa", value: coverage.summary.goodZones, note: "cobertura útil" },
            { label: "Fraca", value: coverage.summary.weakZones, note: "precisa densificar" },
            { label: "Vazia", value: coverage.summary.emptyZones, note: "sem postos suficientes" },
            { label: "Sem preço", value: coverage.summary.stationsWithoutPrice, note: "postos sem leitura recente" },
            { label: "Em revisão", value: coverage.summary.stationsInReview, note: "sinal territorial pendente" }
          ].map((item) => (
            <div key={item.label} className="rounded-[18px] border border-white/8 bg-black/25 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
              <p className="mt-1 text-[11px] text-white/42">{item.note}</p>
            </div>
          ))}
        </div>

        {focusZone ? (
          <div className="rounded-[18px] border border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/8 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-accent)]">Próxima ação recomendada</p>
                <h2 className="text-lg font-semibold text-white">{focusZone.neighborhood || focusZone.city}</h2>
                <p className="text-sm text-white/58">Use o território mais quente como ponto de partida para mutirão ou semeadura.</p>
              </div>
              <Badge variant="outline">{focusZone.coverageState}</Badge>
            </div>
            <div className="mt-3">{TerritoryActions({ city: focusZone.city, neighborhood: focusZone.neighborhood })}</div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Zonas a atacar primeiro</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Prioridade territorial</h2>
            <p className="mt-1 text-sm text-white/54">Mostra onde a lista ainda está vazia, fraca ou com pouca leitura recente.</p>
          </div>
          <Badge variant="outline">{coverage.topZones.length} zonas</Badge>
        </div>

        <div className="space-y-3">
          {coverage.topZones.map((zone) => (
            <div key={`${zone.city}-${zone.neighborhood}`} className="rounded-[22px] border border-white/8 bg-black/25 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-white">{zone.city}</p>
                    <Badge variant={badgeVariant(zone.coverageState) as any}>{zone.coverageState}</Badge>
                  </div>
                  <p className="text-sm text-white/54">{zone.neighborhood}</p>
                  <p className="text-[11px] text-white/42">{zone.stations} postos · {zone.stationsWithRecentPrice} com preço recente · {zone.stationsWithoutPrice} sem preço · {zone.stationsInReview} em revisão</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Prioridade</p>
                  <p className="text-2xl font-semibold text-white">{zone.priority}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {zone.signals.map((signal) => <Badge key={signal} variant="outline" className="h-6 px-2 text-[9px]">{signal}</Badge>)}
              </div>
              <div className="mt-3">{TerritoryActions({ city: zone.city, neighborhood: zone.neighborhood })}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
        <SectionCard className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Por cidade</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Cobertura e lacunas</h2>
            </div>
            <Badge variant="outline">30 dias</Badge>
          </div>

          <div className="space-y-4">
            {coverage.cities.map((city) => (
              <div key={city.city} className="rounded-[22px] border border-white/8 bg-black/25 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-white">{city.city}</p>
                      <Badge variant={badgeVariant(city.coverageState) as any}>{city.coverageState}</Badge>
                    </div>
                    <p className="text-[11px] text-white/42">{city.stations} postos · {city.stationsWithRecentPrice} com preço recente · {city.stationsInReview} em revisão · {city.stationsWithoutUpdate} sem atualização</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Cobertura</p>
                    <p className="text-2xl font-semibold text-white">{Math.round(city.coverageRatio * 100)}%</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">{city.signals.map((signal) => <Badge key={signal} variant="outline" className="h-6 px-2 text-[9px]">{signal}</Badge>)}</div>
                <div className="mt-3">{TerritoryActions({ city: city.city })}</div>
                <div className="mt-4 space-y-2">
                  {city.neighborhoods.slice(0, 4).map((neighborhood) => (
                    <div key={`${city.city}-${neighborhood.neighborhood}`} className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-white">{neighborhood.neighborhood}</p>
                            <Badge variant={badgeVariant(neighborhood.coverageState) as any} className="h-5 px-2 text-[9px]">{neighborhood.coverageState}</Badge>
                          </div>
                          <p className="text-[11px] text-white/42">{neighborhood.stations} postos · {neighborhood.stationsWithRecentPrice} com preço recente · {neighborhood.stationsWithoutPrice} sem preço</p>
                        </div>
                        <p className="text-sm font-semibold text-white">{neighborhood.priority}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard className="space-y-4">
            <div className="flex items-center gap-2">
              <Sprout className="h-4 w-4 text-[color:var(--color-accent)]" />
              <h2 className="text-lg font-semibold text-white">Sinais cruzados</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Semeaduras", value: coverage.summary.seedRequests, note: "postos novos criados" },
                { label: "Para revisar", value: coverage.summary.seedNeedsReview, note: "cadastros pendentes" },
                { label: "Duplicadas", value: coverage.summary.seedDuplicates, note: "pedidos já vistos" },
                { label: "Edições leves", value: coverage.summary.lightEdits, note: "correções de posto" },
                { label: "Risco duplicado", value: coverage.summary.duplicateSignals, note: "sinal de conflito" },
                { label: "Sem atualização", value: coverage.summary.stationsWithoutUpdate, note: "base envelhecida" }
              ].map((item) => (
                <div key={item.label} className="rounded-[18px] border border-white/8 bg-black/25 p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
                  <p className="mt-1 text-[11px] text-white/42">{item.note}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[color:var(--color-accent)]" />
              <h2 className="text-lg font-semibold text-white">Resumo prático</h2>
            </div>
            <div className="space-y-3 text-sm text-white/60">
              <p>• Cobertura boa: a cidade já tem leitura recente suficiente para a base principal.</p>
              <p>• Cobertura fraca: já existe posto, mas falta preço recente ou densidade em bairros importantes.</p>
              <p>• Cobertura vazia: o bairro ainda depende de semeadura ou confirmação de duplicidade antes de virar base útil.</p>
            </div>
          </SectionCard>

          <SectionCard className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-[color:var(--color-accent)]" />
              <h2 className="text-lg font-semibold text-white">Leitura rápida</h2>
            </div>
            <div className="space-y-2 text-sm text-white/60">
              <p>{coverage.summary.stations} postos observados.</p>
              <p>{coverage.summary.stationsWithRecentPrice} com preço recente e {coverage.summary.stationsWithoutPrice} sem preço recente.</p>
              <p>{coverage.summary.goodZones} zonas boas, {coverage.summary.weakZones} fracas e {coverage.summary.emptyZones} vazias.</p>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}




