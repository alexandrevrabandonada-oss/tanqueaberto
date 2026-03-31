import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight, MapPin, Sprout, Users } from "lucide-react";

import { requireAdminUser } from "@/lib/auth/admin";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import {
  getTerritorialSeedingImpactReadout,
  type SeedingImpactZoneRow,
  type SeedingImpactCityRow,
  type SeedingImpactEditorRow
} from "@/lib/ops/territorial-seeding-impact";
import { TerritoryWorkflowControls } from "@/components/admin/ops/territory-workflow-controls";
import { buildTerritoryWorkflowReturnTo, getTerritoryWorkflowReadout, resolveTerritoryWorkflowState } from "@/lib/ops/territory-workflow";

export const dynamic = "force-dynamic";

type PeriodKey = "7d" | "30d" | "90d";

const PERIODS: Record<PeriodKey, number> = { "7d": 7, "30d": 30, "90d": 90 };

function resolvePeriod(value: string | string[] | undefined): PeriodKey {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "7d" || raw === "30d" || raw === "90d" ? raw : "30d";
}

function periodHref(period: PeriodKey) {
  return `/admin/ops/impacto-semeadura-territorial?period=${period}` as Route;
}

function territoryHref(path: string, city?: string, neighborhood?: string) {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (neighborhood) params.set("neighborhood", neighborhood);
  if (city || neighborhood) params.set("territoryContext", "territorial_impact");
  const suffix = params.toString();
  return suffix ? (`${path}?${suffix}` as Route) : (path as Route);
}

function transitionLabel(zone: SeedingImpactZoneRow) {
  if (zone.transition === "vazia_para_fraca") return "vazia → fraca";
  if (zone.transition === "fraca_para_boa") return "fraca → boa";
  if (zone.transition === "continua_vazia") return "continua vazia";
  if (zone.transition === "boa_para_fraca") return "boa → fraca";
  if (zone.transition === "boa_mantida") return "boa mantida";
  return "fraca mantida";
}

function badgeVariant(state: string) {
  if (state === "boa") return "accent";
  if (state === "fraca") return "warning";
  return "danger";
}

function moneyRate(value: number) {
  return `${Math.round(value * 100)}%`;
}

function impactTone(zone: SeedingImpactZoneRow) {
  if (zone.transition === "fraca_para_boa") return "border-green-500/20 bg-green-500/5";
  if (zone.transition === "vazia_para_fraca") return "border-amber-500/20 bg-amber-500/5";
  if (zone.transition === "continua_vazia") return "border-red-500/20 bg-red-500/5";
  return "border-white/8 bg-black/25";
}

function zoneSummary(zone: SeedingImpactZoneRow) {
  return `${zone.seedRequests} semeadas · ${zone.seedActive} ativas · ${zone.seedNeedsReview} em revisão · ${zone.seedDuplicates} duplicadas`;
}

function TerritoryActions({ city, neighborhood }: { city: string; neighborhood?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={territoryHref("/postos/cadastrar", city, neighborhood)} className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[color:var(--color-accent)]/18">
        Abrir semeadura neste bairro
      </Link>
      <Link href={territoryHref("/postos/sem-atualizacao", city, neighborhood)} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">
        Ver postos sem atualização
      </Link>
      <Link href={territoryHref("/admin/ops/qualidade", city, neighborhood)} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">
        Abrir curadoria deste território
      </Link>
      <Link href={territoryHref("/admin/ops/station-editors", city, neighborhood)} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">
        Ver editores que atuaram aqui
      </Link>
    </div>
  );
}

function EditorRow({ editor }: { editor: SeedingImpactEditorRow }) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-[18px] border border-white/8 bg-black/25 p-4 md:grid-cols-[minmax(0,1.8fr)_repeat(5,minmax(0,0.8fr))] md:items-center">
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-semibold text-white">{editor.editorEmail}</p>
        <p className="text-[11px] text-white/42">
          {editor.citiesTouched} cidades · {editor.neighborhoodsTouched} bairros · última semeadura {editor.lastSeedAt ? new Date(editor.lastSeedAt).toLocaleDateString("pt-BR") : "-"}
        </p>
      </div>
      <div className="text-left md:text-right">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Semeadas</p>
        <p className="mt-1 text-lg font-semibold text-white">{editor.totalSeeded}</p>
      </div>
      <div className="text-left md:text-right">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Ativas</p>
        <p className="mt-1 text-lg font-semibold text-white">{editor.activeCount}</p>
      </div>
      <div className="text-left md:text-right">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Revisão</p>
        <p className="mt-1 text-lg font-semibold text-white">{editor.reviewCount}</p>
      </div>
      <div className="text-left md:text-right">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Duplicadas</p>
        <p className="mt-1 text-lg font-semibold text-white">{editor.duplicateCount}</p>
      </div>
      <div className="text-left md:text-right">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Taxa dup.</p>
        <p className="mt-1 text-lg font-semibold text-white">{moneyRate(editor.duplicateRate)}</p>
      </div>
    </div>
  );
}

function ZoneCard({ zone }: { zone: SeedingImpactZoneRow }) {
  return (
    <div className={`rounded-[22px] border p-4 ${impactTone(zone)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-white">{zone.city}</p>
            <Badge variant={badgeVariant(zone.coverageState) as any}>{transitionLabel(zone)}</Badge>
          </div>
          <p className="text-sm text-white/54">{zone.neighborhood}</p>
          <p className="text-[11px] text-white/42">{zoneSummary(zone)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Cobertura</p>
          <p className="text-2xl font-semibold text-white">{Math.round(zone.coverageRatio * 100)}%</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {zone.signals.slice(0, 4).map((signal) => (
          <Badge key={signal} variant="outline" className="h-6 px-2 text-[9px]">
            {signal}
          </Badge>
        ))}
      </div>

      <div className="mt-3">
        <TerritoryActions city={zone.city} neighborhood={zone.neighborhood} />
      </div>
    </div>
  );
}

export default async function SeedingImpactPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminUser();
  const params = (await searchParams) ?? {};
  const period = resolvePeriod(params.period);
  const readout = await getTerritorialSeedingImpactReadout(PERIODS[period]);
  const cities = readout.cities as SeedingImpactCityRow[];
  const activeRate = readout.summary.seedRequests > 0 ? readout.summary.seedActive / readout.summary.seedRequests : 0;
  const duplicateRate = readout.summary.seedRequests > 0 ? readout.summary.seedDuplicates / readout.summary.seedRequests : 0;
  const reviewRate = readout.summary.seedRequests > 0 ? readout.summary.seedNeedsReview / readout.summary.seedRequests : 0;
  const focusZone = readout.liftedWeakToGood[0] ?? readout.liftedEmptyToWeak[0] ?? readout.stillEmpty[0] ?? cities[0]?.neighborhoods[0] ?? null;
  const workflowReadout = await getTerritoryWorkflowReadout(120);
  const currentWorkflow = focusZone ? resolveTerritoryWorkflowState(workflowReadout.records, focusZone.city, focusZone.neighborhood) : null;

  return (
    <div className="space-y-6 pb-20">
      <SectionCard className="space-y-4 border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-accent)]">Impacto da semeadura</p>
            <h1 className="text-2xl font-semibold text-white">Quem semeia, onde a base cresce e onde ainda falta posto</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-white/58">
              Leitura operacional por período, cidade, bairro e editor para avaliar se a semeadura em campo está ampliando cobertura útil.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["7d", "30d", "90d"] as const).map((option) => (
              <Link
                key={option}
                href={periodHref(option)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${option === period ? "border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent)]/15 text-white" : "border-white/10 bg-white/5 text-white/72 hover:bg-white/10"}`}
              >
                {option}
              </Link>
            ))}
            <Link href="/admin/ops" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
              Voltar ao OPS
            </Link>
            <Link href="/admin/ops/cobertura-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
              Cobertura territorial
            </Link>
            <Link href="/admin/ops/station-editors" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
              Station editors
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Semeadas", value: readout.summary.seedRequests, note: `no período de ${period}` },
            { label: "Ativas", value: readout.summary.seedActive, note: `${moneyRate(activeRate)} do período` },
            { label: "Em revisão", value: readout.summary.seedNeedsReview, note: `${moneyRate(reviewRate)} do período` },
            { label: "Duplicadas", value: readout.summary.seedDuplicates, note: `${moneyRate(duplicateRate)} do período` },
            { label: "Edições leves", value: readout.summary.lightEdits, note: "apoio da base em campo" },
            { label: "Editors", value: readout.summary.editors, note: "station_editor ativos" },
            { label: "Vazia → fraca", value: readout.summary.liftedEmptyToWeak, note: "ganho real de cobertura" },
            { label: "Fraca → boa", value: readout.summary.liftedWeakToGood, note: "base ficou mais útil" }
          ].map((item) => (
            <div key={item.label} className="rounded-[18px] border border-white/8 bg-black/25 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
              <p className="mt-1 text-[11px] text-white/42">{item.note}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {focusZone ? (
        <SectionCard className="space-y-4 border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-accent)]">Ação direta</p>
              <h2 className="text-lg font-semibold text-white">Continuar onde o território mudou</h2>
              <p className="text-sm text-white/58">Comece pelo bairro que já mostrou movimento útil e siga o mutirão a partir dele.</p>
            </div>
            <Badge variant="outline">{focusZone.city}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <TerritoryActions city={focusZone.city} neighborhood={focusZone.neighborhood} />
          </div>
          <TerritoryWorkflowControls
            city={focusZone.city}
            neighborhood={focusZone.neighborhood}
            returnTo={buildTerritoryWorkflowReturnTo("/admin/ops/impacto-semeadura-territorial", undefined, undefined, undefined, { period })}
            currentState={currentWorkflow}
            compact
          />
        </SectionCard>
      ) : null}

      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Movimento territorial</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Bairros que mudaram de estado</h2>
            <p className="mt-1 text-sm text-white/54">Mostra onde a semeadura tirou o bairro da vacância ou fez a base subir de fraca para boa.</p>
          </div>
          <Badge variant="outline">{readout.summary.neighborhoods} bairros</Badge>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          {[
            { title: "Saiu de vazia para fraca", rows: readout.liftedEmptyToWeak, tone: "border-amber-500/20 bg-amber-500/5", empty: "Nenhum bairro saiu desse estado agora." },
            { title: "Saiu de fraca para boa", rows: readout.liftedWeakToGood, tone: "border-green-500/20 bg-green-500/5", empty: "Nenhum bairro subiu para boa no período." },
            { title: "Continua sem cobertura", rows: readout.stillEmpty, tone: "border-red-500/20 bg-red-500/5", empty: "Nenhum bairro ficou vazio no recorte atual." }
          ].map((bucket) => (
            <div key={bucket.title} className={`rounded-[22px] border p-4 ${bucket.tone}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-white">{bucket.title}</h3>
                <Badge variant="outline">{bucket.rows.length}</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {bucket.rows.slice(0, 5).map((zone) => (
                  <ZoneCard key={`${zone.city}-${zone.neighborhood}-${bucket.title}`} zone={zone} />
                ))}
                {bucket.rows.length === 0 && <p className="text-sm text-white/50">{bucket.empty}</p>}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Por editor</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Quem está gerando base útil</h2>
            <p className="mt-1 text-sm text-white/54">Mostra quantidade semeada, ativa, em revisão e duplicada por `station_editor`.</p>
          </div>
          <Badge variant="outline">{readout.editors.length} editores</Badge>
        </div>

        <div className="space-y-3">
          {readout.editors.map((editor) => (
            <EditorRow key={editor.editorEmail} editor={editor} />
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <SectionCard className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Por cidade e bairro</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Onde a semeadura está mais útil</h2>
            </div>
            <Badge variant="outline">{readout.cities.length} cidades</Badge>
          </div>

          <div className="space-y-4">
            {cities.map((city) => (
              <div key={city.city} className="rounded-[22px] border border-white/8 bg-black/25 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-white">{city.city}</p>
                      <Badge variant={badgeVariant(city.coverageState) as any}>{city.coverageState}</Badge>
                    </div>
                    <p className="text-[11px] text-white/42">
                      {city.seedRequests} semeadas · {city.seedActive} ativas · {city.seedNeedsReview} em revisão · {city.seedDuplicates} duplicadas
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Cobertura</p>
                    <p className="text-2xl font-semibold text-white">{Math.round(city.coverageRatio * 100)}%</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {city.signals.map((signal) => (
                    <Badge key={signal} variant="outline" className="h-6 px-2 text-[9px]">{signal}</Badge>
                  ))}
                </div>

                <div className="mt-3">
                  <TerritoryActions city={city.city} />
                </div>

                <div className="mt-4 space-y-2">
                  {city.neighborhoods.slice(0, 4).map((neighborhood) => (
                    <div key={`${city.city}-${neighborhood.neighborhood}`} className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-white">{neighborhood.neighborhood}</p>
                            <Badge variant={badgeVariant(neighborhood.coverageState) as any} className="h-5 px-2 text-[9px]">{transitionLabel(neighborhood)}</Badge>
                          </div>
                          <p className="text-[11px] text-white/42">
                            {neighborhood.seedRequests} semeadas · {neighborhood.seedActive} ativas · {neighborhood.seedNeedsReview} em revisão · {neighborhood.seedDuplicates} duplicadas
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-white">{Math.round(neighborhood.coverageRatio * 100)}%</p>
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
              <h2 className="text-lg font-semibold text-white">Leitura rápida</h2>
            </div>
            <div className="space-y-3 text-sm text-white/60">
              <p>• <strong>Vazia → fraca</strong>: a semeadura já tirou o bairro do zero, mas ainda falta densidade.</p>
              <p>• <strong>Fraca → boa</strong>: a base ficou útil para operação de rua.</p>
              <p>• <strong>Continua vazia</strong>: ainda depende de mutirão, ajuste de duplicidade ou nova semeadura.</p>
              <p>• <strong>Duplicadas</strong>: revisar antes de aprovar novo posto para não inflar a base.</p>
            </div>
          </SectionCard>

          <SectionCard className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[color:var(--color-accent)]" />
              <h2 className="text-lg font-semibold text-white">Leitura do período</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Semeadas", value: readout.summary.seedRequests },
                { label: "Ativas", value: readout.summary.seedActive },
                { label: "Em revisão", value: readout.summary.seedNeedsReview },
                { label: "Duplicadas", value: readout.summary.seedDuplicates },
                { label: "Editors", value: readout.summary.editors },
                { label: "Bairros vazios", value: readout.summary.stillEmpty }
              ].map((item) => (
                <div key={item.label} className="rounded-[18px] border border-white/8 bg-black/25 p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[color:var(--color-accent)]" />
              <h2 className="text-lg font-semibold text-white">Atalho operacional</h2>
            </div>
            <div className="space-y-3 text-sm text-white/60">
              <p>• Abra a cobertura territorial para atacar bairro por bairro.</p>
              <p>• Use este relatório para escolher mutirão e conferir duplicidade.</p>
              <p>• Use a fila de editors para ver quem está produzindo base útil com menos revisão.</p>
            </div>
            <Link href="/admin/ops/cobertura-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
              Abrir cobertura territorial
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}




