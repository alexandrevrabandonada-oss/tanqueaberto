import Link from "next/link";
import type { Route } from "next";
import { Download, MapPinned, TriangleAlert } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { HistoryChart } from "@/components/audit/history-chart";
import { EmptyStateCard } from "@/components/state/empty-state-card";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatDateTimeBR } from "@/lib/format/time";
import { fuelLabels } from "@/lib/format/labels";
import { getCityAuditDetail } from "@/lib/audit/queries";
import { getAuditCityBySlug } from "@/lib/audit/cities";
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

interface CityAuditPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CityAuditPage({ params, searchParams }: CityAuditPageProps) {
  const { slug } = await params;
  const paramsResolved = (await searchParams) ?? {};
  const fuelType = parseFuel(paramsResolved.fuel);
  const days = parseDays(paramsResolved.days);
  const city = getAuditCityBySlug(slug);
  const detail = await getCityAuditDetail(slug, fuelType, days);

  if (!city || !detail) {
    return (
      <AppShell>
        <SectionCard className="space-y-3">
          <h1 className="text-2xl font-semibold text-white">Cidade não encontrada</h1>
          <p className="text-sm text-white/58">A revisão territorial ainda não criou uma série suficiente para esse recorte.</p>
          <ButtonLink href={"/auditoria" as Route} variant="secondary">Voltar ao observatório</ButtonLink>
        </SectionCard>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SectionCard className="space-y-4">
        <div className="space-y-2">
          <Badge>Histórico municipal</Badge>
          <h1 className="text-[2rem] font-semibold leading-none text-white">{detail.city}</h1>
          <p className="max-w-2xl text-sm text-white/62">Série pública por combustível, com foco em monitoramento popular e subsídio técnico para apuração. Sem conclusão automática.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-white/52">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Cobertura {Math.round(detail.summary.coverageRatio * 100)}%</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Confiança {detail.summary.confidenceLabel}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Tendência {detail.summary.trend}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">{fuelLabels[fuelType]}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">{days} dias</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">{detail.summary.observations} observações</span>
        </div>
      </SectionCard>

      <SectionCard className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Observações</p>
          <p className="mt-3 text-3xl font-semibold text-white">{detail.summary.observations}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Postos</p>
          <p className="mt-3 text-3xl font-semibold text-white">{detail.summary.stations}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Mínimo</p>
          <p className="mt-3 text-3xl font-semibold text-white">{detail.summary.minPrice ? formatCurrencyBRL(detail.summary.minPrice) : "-"}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Mediana</p>
          <p className="mt-3 text-3xl font-semibold text-white">{detail.summary.medianPrice ? formatCurrencyBRL(detail.summary.medianPrice) : "-"}</p>
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Série da cidade</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{fuelLabels[fuelType]}</h2>
          </div>
          <div className="flex gap-2">
            <ButtonLink href={`/auditoria/export?format=csv&scope=city&citySlug=${slug}&fuel=${fuelType}&days=${days}` as Route} variant="secondary">
              <Download className="h-4 w-4" /> CSV
            </ButtonLink>
            <ButtonLink href={`/auditoria/export?format=pdf&scope=city&citySlug=${slug}&fuel=${fuelType}&days=${days}` as Route} variant="secondary">
              <Download className="h-4 w-4" /> PDF
            </ButtonLink>
          </div>
        </div>
        <HistoryChart series={detail.series} />
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Alertas</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Padrões e indícios na cidade</h2>
          </div>
          <TriangleAlert className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>
        {detail.alerts.length === 0 ? (
          <EmptyStateCard title="Sem alertas relevantes neste recorte." description="Amplie a janela para observar séries mais longas." actionHref={"/auditoria/metodologia" as Route} actionLabel="Ler metodologia" className="text-left" />
        ) : (
          <div className="space-y-3">
            {detail.alerts.map((alert) => (
              <div key={`${alert.kind}-${alert.stationId ?? alert.city ?? alert.title}`} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                <p className="text-base font-semibold text-white">{alert.title}</p>
                <p className="mt-1 text-sm text-white/58">{alert.description}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Postos</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Maior consistência na cidade</h2>
          </div>
          <MapPinned className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>
        <div className="space-y-3">
          {detail.topStations.length === 0 ? (
            <EmptyStateCard title="Ainda não há postos com série forte neste recorte." description="A base pode ser pequena para este combustível ou janela." actionHref={"/auditoria" as Route} actionLabel="Voltar ao observatório" className="text-left" />
          ) : (
            detail.topStations.map((station) => (
              <Link key={station.stationId} href={`/auditoria/posto/${station.stationId}?fuel=${fuelType}&days=${days}` as Route} className="flex items-center justify-between rounded-[22px] border border-white/8 bg-black/30 p-4 transition hover:border-white/18">
                <div>
                  <p className="font-medium text-white">{station.stationName}</p>
                  <p className="text-sm text-white/52">{station.observations} observações</p>
                  <p className="text-xs text-white/42">{station.lastReportedAt ? formatDateTimeBR(station.lastReportedAt) : "sem data"}</p>
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
