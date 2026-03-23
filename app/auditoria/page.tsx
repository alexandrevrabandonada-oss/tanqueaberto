import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, BarChart3, Download, MapPinned, TriangleAlert } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { ProductEvent } from "@/components/telemetry/product-event";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { HistoryChart } from "@/components/audit/history-chart";
import { EmptyStateCard } from "@/components/state/empty-state-card";
import { auditWindowFilters, fuelLabels, publicFuelFilters } from "@/lib/format/labels";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatDateTimeBR } from "@/lib/format/time";
import { getAuditOverview } from "@/lib/audit/queries";
import { getAuditCitySlug } from "@/lib/audit/cities";
import type { AuditWindowDays } from "@/lib/audit/types";
import type { FuelType } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseDays(value: string | string[] | undefined): AuditWindowDays {
  const parsed = Number(Array.isArray(value) ? value[0] : value ?? "30");
  if (parsed === 7 || parsed === 30 || parsed === 90) return parsed;
  return 30;
}

function parseFuel(value: string | string[] | undefined): FuelType {
  const allowed: FuelType[] = ["gasolina_comum", "gasolina_aditivada", "etanol", "diesel_s10", "diesel_comum", "gnv"];
  const candidate = Array.isArray(value) ? value[0] : value;
  return allowed.includes(candidate as FuelType) ? (candidate as FuelType) : "gasolina_comum";
}

interface AuditOverviewPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AuditOverviewPage({ searchParams }: AuditOverviewPageProps) {
  const params = (await searchParams) ?? {};
  const fuelType = parseFuel(params.fuel);
  const days = parseDays(params.days);
  const overview = await getAuditOverview(fuelType, days);

  return (
    <AppShell>
      <ProductEvent eventType="audit_opened" pagePath="/auditoria" pageTitle="Auditoria pública" />

      <SectionCard className="space-y-5">
        <div className="space-y-2">
          <Badge>Beta fechado · observatório público</Badge>
          <h1 className="text-[2rem] font-semibold leading-none text-white">Auditoria pública e histórico longo</h1>
          <p className="max-w-2xl text-sm text-white/62">
            Aqui você vê como os preços vêm se movendo no recorte escolhido. A leitura ainda está em formação em parte da base, então vale interpretar com cautela.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Cobertura inicial</p>
            <p className="mt-2 text-lg font-semibold text-white">{Math.round(overview.summary.coverageRatio * 100)}%</p>
            <p className="mt-1 text-sm text-white/54">Parte da base ainda está em formação.</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Leitura em formação</p>
            <p className="mt-2 text-lg font-semibold text-white">{overview.summary.confidenceLabel}</p>
            <p className="mt-1 text-sm text-white/54">Quanto mais massa, mais firme fica a leitura.</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Interpretar com cautela</p>
            <p className="mt-2 text-lg font-semibold text-white">{overview.summary.trend}</p>
            <p className="mt-1 text-sm text-white/54">Os indícios ajudam; sozinhos não fecham conclusão.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/" variant="secondary">
            Voltar ao mapa
          </ButtonLink>
          <ButtonLink href="/atualizacoes" variant="secondary">
            Ver atualizações
          </ButtonLink>
          <ButtonLink href="/auditoria/metodologia" variant="secondary">
            Ver metodologia
          </ButtonLink>
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-start gap-3 rounded-[22px] border border-white/8 bg-black/30 p-4 text-sm text-white/60">
          <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-accent)]" />
          <div className="space-y-1">
            <p className="font-medium text-white">Como ler este painel</p>
            <p>1. Veja a cobertura e a confiança primeiro.</p>
            <p>2. Use o combustível e o período para comparar sem forçar leitura em base curta.</p>
            <p>3. Se os dados estiverem vazios, isso pode significar só que ainda não há massa suficiente.</p>
          </div>
        </div>

        <details className="group rounded-[22px] border border-white/8 bg-black/30 p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-white/80">
            Ajustar combustível e período
            <span className="text-white/42 transition group-open:rotate-180">⌄</span>
          </summary>
          <div className="mt-4 space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {publicFuelFilters.filter((item) => item.value !== "all").map((item) => {
                const href = (`/auditoria?fuel=${item.value}&days=${days}` as Route);
                const active = fuelType === item.value;
                return (
                  <Link
                    key={item.value}
                    href={href}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                      active ? "bg-[color:var(--color-accent)] text-black" : "border border-white/10 bg-white/5 text-white/66"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {auditWindowFilters.map((item) => (
                <Link
                  key={item.value}
                  href={`/auditoria?fuel=${fuelType}&days=${item.value}` as Route}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                    days === item.value ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white/66"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </details>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Atalhos</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Dossiês, leitura municipal e memória pública</h2>
          </div>
          <BarChart3 className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Link href="/auditoria/comparar" className="rounded-[22px] border border-white/8 bg-black/30 p-4 transition hover:border-white/18">
            <p className="text-base font-semibold text-white">Comparar cidades</p>
            <p className="mt-1 text-sm text-white/54">Ver mediana, cobertura e variação entre municípios.</p>
          </Link>
          <Link href="/auditoria/relatorios" className="rounded-[22px] border border-white/8 bg-black/30 p-4 transition hover:border-white/18">
            <p className="text-base font-semibold text-white">Relatórios recentes</p>
            <p className="mt-1 text-sm text-white/54">Acessar dossiês recorrentes, alertas e memória pública.</p>
          </Link>
          <Link href="/auditoria/metodologia" className="rounded-[22px] border border-white/8 bg-black/30 p-4 transition hover:border-white/18">
            <p className="text-base font-semibold text-white">Metodologia</p>
            <p className="mt-1 text-sm text-white/54">Ler a regra do jogo antes de comparar.</p>
          </Link>
        </div>
      </SectionCard>

      <SectionCard className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Observações</p>
          <p className="mt-3 text-3xl font-semibold text-white">{overview.summary.observations}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Postos</p>
          <p className="mt-3 text-3xl font-semibold text-white">{overview.summary.stations}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Cobertura</p>
          <p className="mt-3 text-3xl font-semibold text-white">{Math.round(overview.summary.coverageRatio * 100)}%</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Confiança</p>
          <p className="mt-3 text-3xl font-semibold text-white">{overview.summary.confidenceLabel}</p>
        </div>
      </SectionCard>

      <details className="group rounded-[22px] border border-white/8 bg-black/30 p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-white/80">
          Ver detalhes técnicos
          <span className="text-white/42 transition group-open:rotate-180">⌄</span>
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[18px] border border-white/8 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Mínimo</p>
            <p className="mt-2 text-xl font-semibold text-white">{overview.summary.minPrice ? formatCurrencyBRL(overview.summary.minPrice) : "-"}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Máximo</p>
            <p className="mt-2 text-xl font-semibold text-white">{overview.summary.maxPrice ? formatCurrencyBRL(overview.summary.maxPrice) : "-"}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Mediana</p>
            <p className="mt-2 text-xl font-semibold text-white">{overview.summary.medianPrice ? formatCurrencyBRL(overview.summary.medianPrice) : "-"}</p>
          </div>
        </div>
      </details>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Série diária</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{fuelLabels[fuelType]} · {days} dias</h2>
          </div>
          <div className="flex gap-2">
            <ButtonLink href={`/auditoria/export?format=csv&scope=overview&fuel=${fuelType}&days=${days}` as Route} variant="secondary">
              <Download className="h-4 w-4" /> CSV
            </ButtonLink>
            <ButtonLink href={`/auditoria/export?format=pdf&scope=overview&fuel=${fuelType}&days=${days}` as Route} variant="secondary">
              <Download className="h-4 w-4" /> PDF
            </ButtonLink>
          </div>
        </div>
        <HistoryChart series={overview.series} />
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Alertas</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Padrões e indícios</h2>
          </div>
          <TriangleAlert className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>
        {overview.alerts.length === 0 ? (
          <EmptyStateCard
            title="Sem alertas relevantes neste recorte."
            description="A série existe, mas ainda não mostrou mudança brusca suficiente para destaque público."
            actionHref={"/auditoria/metodologia" as Route}
            actionLabel="Entender a metodologia"
            className="text-left"
          />
        ) : (
          <div className="space-y-3">
            {overview.alerts.map((alert) => (
              <div key={`${alert.kind}-${alert.stationId ?? alert.city ?? alert.title}`} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">{alert.title}</p>
                    <p className="mt-1 text-sm text-white/58">{alert.description}</p>
                  </div>
                  <Badge variant={alert.severity === "high" ? "danger" : alert.severity === "medium" ? "warning" : "outline"}>{alert.severity}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Cidades</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Cobertura por município</h2>
          </div>
          <MapPinned className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {overview.topCities.map((city) => {
            const slug = getAuditCitySlug(city.city);
            return (
              <Link key={city.city} href={`/auditoria/cidade/${slug}?fuel=${fuelType}&days=${days}` as Route} className="rounded-[22px] border border-white/8 bg-black/30 p-4 transition hover:border-white/18">
                <p className="text-base font-semibold text-white">{city.city}</p>
                <p className="mt-1 text-sm text-white/54">
                  {city.observations} observações · {city.lastReportedAt ? formatDateTimeBR(city.lastReportedAt) : "sem data"}
                </p>
                <p className="mt-3 text-2xl font-semibold text-white">{city.medianPrice ? formatCurrencyBRL(city.medianPrice) : "-"}</p>
              </Link>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Postos com série forte</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Histórico mais consistente</h2>
          </div>
          <ButtonLink href={"/auditoria/metodologia" as Route} variant="secondary">
            Metodologia <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
        <div className="space-y-3">
          {overview.topStations.length === 0 ? (
            <EmptyStateCard
              title="Ainda não há postos com série suficiente neste recorte."
              description="Amplie a janela ou troque o combustível para ver mais histórico."
              actionHref="/"
              actionLabel="Voltar ao mapa"
              className="text-left"
            />
          ) : (
            overview.topStations.map((station) => (
              <Link key={station.stationId} href={`/auditoria/posto/${station.stationId}?fuel=${fuelType}&days=${days}` as Route} className="flex items-center justify-between rounded-[22px] border border-white/8 bg-black/30 p-4 transition hover:border-white/18">
                <div>
                  <p className="font-medium text-white">{station.stationName}</p>
                  <p className="text-sm text-white/52">{station.city} · {station.observations} observações</p>
                </div>
                <p className="text-lg font-semibold text-white">{station.medianPrice ? formatCurrencyBRL(station.medianPrice) : "-"}</p>
              </Link>
            ))
          )}
        </div>
      </SectionCard>
    </AppShell>
  );
}
