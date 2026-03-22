import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Download, Scale, TriangleAlert } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyStateCard } from "@/components/state/empty-state-card";
import { getAuditCitySlug } from "@/lib/audit/cities";
import { getComparableCities, summarizeComparison } from "@/lib/audit/city-compare";
import { getRecentAuditAlertHistory } from "@/lib/audit/alerts-history";
import { getRecentAuditReportRuns } from "@/lib/audit/reports";
import { auditWindowFilters, fuelLabels, publicFuelFilters } from "@/lib/format/labels";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatDateTimeBR } from "@/lib/format/time";
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

interface ComparePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = (await searchParams) ?? {};
  const fuelType = parseFuel(params.fuel);
  const days = parseDays(params.days);
  const cities = await getComparableCities(fuelType, days);
  const summary = summarizeComparison(cities);
  const recentRuns = await getRecentAuditReportRuns(8);
  const recentAlerts = await getRecentAuditAlertHistory(8);

  return (
    <AppShell>
      <SectionCard className="space-y-5">
        <div className="space-y-2">
          <Badge>Comparação pública</Badge>
          <h1 className="text-[2rem] font-semibold leading-none text-white">Comparar cidades</h1>
          <p className="max-w-2xl text-sm text-white/62">
            Leitura comparativa por série histórica pública. Serve para ver onde o recorte ficou mais alto, mais disperso ou com cobertura mais fraca.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {publicFuelFilters.filter((item) => item.value !== "all").map((item) => (
            <Link
              key={item.value}
              href={`/auditoria/comparar?fuel=${item.value}&days=${days}` as Route}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${fuelType === item.value ? "bg-[color:var(--color-accent)] text-black" : "border border-white/10 bg-white/5 text-white/66"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {auditWindowFilters.map((item) => (
            <Link
              key={item.value}
              href={`/auditoria/comparar?fuel=${fuelType}&days=${item.value}` as Route}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${days === item.value ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white/66"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </SectionCard>

      <SectionCard className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Cidades comparadas</p>
          <p className="mt-3 text-3xl font-semibold text-white">{cities.length}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Líder do recorte</p>
          <p className="mt-3 text-xl font-semibold text-white">{summary.leadingCity ? summary.leadingCity.city : "-"}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Amplitude</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.spread !== null ? formatCurrencyBRL(summary.spread) : "-"}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Combustível</p>
          <p className="mt-3 text-xl font-semibold text-white">{fuelLabels[fuelType]}</p>
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Ranking municipal</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Mediana, amplitude e confiança</h2>
          </div>
          <Scale className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>
        <div className="space-y-3">
          {cities.length === 0 ? (
            <EmptyStateCard title="Sem dados suficientes para comparar." description="Amplie a janela ou troque o combustível para gerar a comparação." actionHref="/auditoria" actionLabel="Voltar ao observatório" className="text-left" />
          ) : (
            cities.map((city) => {
              const slug = getAuditCitySlug(city.city);
              return (
                <Link key={city.city} href={`/auditoria/cidade/${slug}?fuel=${fuelType}&days=${days}` as Route} className="rounded-[22px] border border-white/8 bg-black/30 p-4 transition hover:border-white/18">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{city.city}</p>
                      <p className="mt-1 text-sm text-white/54">{city.observations} observações · cobertura {city.coverageLabel} · confiança {city.confidenceLabel}</p>
                      <p className="mt-1 text-xs text-white/42">Tendência {city.trend} · última leitura {city.lastReportedAt ? formatDateTimeBR(city.lastReportedAt) : "sem data"}</p>
                    </div>
                    <p className="text-lg font-semibold text-white">{city.medianPrice ? formatCurrencyBRL(city.medianPrice) : "-"}</p>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-white/50 sm:grid-cols-3">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Mín {city.minPrice ? formatCurrencyBRL(city.minPrice) : "-"}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Máx {city.maxPrice ? formatCurrencyBRL(city.maxPrice) : "-"}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Amp {city.amplitude ? formatCurrencyBRL(city.amplitude) : "-"}</span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Dossiês recentes</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Relatórios programados e manuais</h2>
          </div>
          <ButtonLink href={"/auditoria/relatorios" as Route} variant="secondary">
            Ver todos <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {recentRuns.length === 0 ? (
            <EmptyStateCard title="Nenhum dossiê publicado ainda." description="Rode a rotina de geração para popular esta fila." actionHref={"/auditoria/relatorios" as Route} actionLabel="Abrir dossiês" className="text-left" />
          ) : (
            recentRuns.slice(0, 4).map((run) => (
              <Link key={run.id} href={run.citySlug ? `/auditoria/cidade/${run.citySlug}?fuel=${run.fuelType}&days=${run.days}` as Route : "/auditoria" as Route} className="rounded-[22px] border border-white/8 bg-black/30 p-4 transition hover:border-white/18">
                <p className="text-base font-semibold text-white">{run.title}</p>
                <p className="mt-1 text-sm text-white/54">{run.scopeType} · {run.scopeLabel} · {run.days} dias · {fuelLabels[run.fuelType]}</p>
                <p className="mt-2 text-xs text-white/42">{formatDateTimeBR(run.generatedAt)} · {run.alertsCount} alertas</p>
              </Link>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Alertas persistidos</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Memória pública dos indícios</h2>
          </div>
          <TriangleAlert className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>
        <div className="space-y-3">
          {recentAlerts.length === 0 ? (
            <EmptyStateCard title="Ainda não há histórico persistido de alertas." description="A rotina de geração vai preencher essa memória ao longo do tempo." actionHref={"/auditoria/metodologia" as Route} actionLabel="Ler metodologia" className="text-left" />
          ) : (
            recentAlerts.map((alert) => (
              <div key={alert.id} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                <p className="text-base font-semibold text-white">{alert.scopeLabel} · {alert.alertKind}</p>
                <p className="mt-1 text-sm text-white/58">{alert.cityName ?? alert.stationName ?? "Recorte cívico"} · {fuelLabels[alert.fuelType]} · período {alert.periodDays} dias</p>
                <p className="mt-2 text-xs text-white/42">{alert.status} · intensidade {alert.intensity ?? "-"} · {formatDateTimeBR(alert.generatedAt)}</p>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </AppShell>
  );
}
