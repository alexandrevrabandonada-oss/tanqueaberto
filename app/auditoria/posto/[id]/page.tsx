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
import { formatDateTimeBR, formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { fuelLabels } from "@/lib/format/labels";
import { getStationAuditDetail } from "@/lib/audit/queries";
import { getStationById } from "@/lib/data/queries";
import { getStationPublicName, hasPendingStationLocationReview } from "@/lib/quality/stations";
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

interface StationAuditPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StationAuditPage({ params, searchParams }: StationAuditPageProps) {
  const { id } = await params;
  const paramsResolved = (await searchParams) ?? {};
  const fuelType = parseFuel(paramsResolved.fuel);
  const days = parseDays(paramsResolved.days);
  const [station, detail] = await Promise.all([getStationById(id), getStationAuditDetail(id, fuelType, days)]);

  if (!station || !detail) {
    return (
      <AppShell>
        <SectionCard className="space-y-3">
          <h1 className="text-2xl font-semibold text-white">Posto não encontrado</h1>
          <p className="text-sm text-white/58">Esse cadastro não entrou na base pública ou ainda não tem série suficiente.</p>
          <ButtonLink href={"/auditoria" as Route} variant="secondary">Voltar ao observatório</ButtonLink>
        </SectionCard>
      </AppShell>
    );
  }

  const latestReport = detail.recentReports[0];

  return (
    <AppShell>
      <SectionCard className="space-y-4">
        <div className="space-y-2">
          <Badge>Histórico por posto</Badge>
          <h1 className="text-[2rem] font-semibold leading-none text-white">{getStationPublicName(station)}</h1>
          <p className="max-w-2xl text-sm text-white/62">Histórico longo, fotos vinculadas e leitura pública de preço com trilha de prova. Isso serve como observatório, não como conclusão jurídica.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-white/52">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Cobertura {Math.round(detail.summary.coverageRatio * 100)}%</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Confiança {detail.summary.confidenceLabel}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Tendência {detail.summary.trend}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">{station.city}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">{fuelLabels[fuelType]}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">{days} dias</span>
          {hasPendingStationLocationReview(station) && !latestReport ? <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Localização em revisão</span> : null}
        </div>
      </SectionCard>

      <SectionCard className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Cadastro</p>
            <p className="mt-1 text-sm text-white/62">{station.brand}</p>
            <p className="text-sm text-white/52">{station.address}, {station.neighborhood}, {station.city}</p>
          </div>
          <MapPinned className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>
      </SectionCard>

      <SectionCard className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Observações</p>
          <p className="mt-3 text-3xl font-semibold text-white">{detail.summary.observations}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Mínimo</p>
          <p className="mt-3 text-3xl font-semibold text-white">{detail.summary.minPrice ? formatCurrencyBRL(detail.summary.minPrice) : "-"}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Mediana</p>
          <p className="mt-3 text-3xl font-semibold text-white">{detail.summary.medianPrice ? formatCurrencyBRL(detail.summary.medianPrice) : "-"}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Última leitura</p>
          <p className="mt-3 text-sm font-semibold text-white">{latestReport ? formatRecencyLabel(latestReport.reportedAt) : "Sem dados"}</p>
          <p className="mt-1 text-xs text-white/52">{latestReport ? formatDateTimeBR(latestReport.reportedAt) : ""}</p>
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Histórico</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{fuelLabels[fuelType]} · {days} dias</h2>
          </div>
          <ButtonLink href={`/auditoria/export?format=pdf&scope=station&stationId=${station.id}&fuel=${fuelType}&days=${days}` as Route} variant="secondary">
            <Download className="h-4 w-4" /> PDF
          </ButtonLink>
        </div>
        <HistoryChart series={detail.series} />
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Sinais públicos</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Padrões e indícios</h2>
          </div>
          <TriangleAlert className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>
        {detail.alerts.length === 0 ? (
          <EmptyStateCard title="Sem alertas relevantes neste recorte." description="A série ainda não mostrou mudança brusca suficiente para destaque." actionHref={"/auditoria/metodologia" as Route} actionLabel="Entender a metodologia" className="text-left" />
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
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Histórico por combustível</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Resumo rápido das faixas</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {detail.fuelSummaries.map((summary) => (
            <div key={summary.fuelType} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
              <p className="text-sm font-medium text-white">{fuelLabels[summary.fuelType]}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{summary.medianPrice ? formatCurrencyBRL(summary.medianPrice) : "-"}</p>
              <p className="mt-1 text-xs text-white/52">{summary.observations} observações</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Observações recentes</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Fotos e horários</h2>
        </div>
        {detail.recentReports.length === 0 ? (
          <EmptyStateCard title="Sem observações recentes neste recorte." description="Tente ampliar a janela ou trocar o combustível." actionHref={"/auditoria" as Route} actionLabel="Voltar ao observatório" className="text-left" />
        ) : (
          <div className="space-y-3">
            {detail.recentReports.map((report) => (
              <div key={report.id} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{formatCurrencyBRL(report.price)} · {fuelLabels[report.fuelType]}</p>
                    <p className="text-sm text-white/50">{report.reporterNickname ?? "anônimo"} · {formatRecencyLabel(report.reportedAt)}</p>
                  </div>
                  <Badge variant={recencyToneToBadgeVariant(getRecencyTone(report.reportedAt))}>{formatRecencyLabel(report.reportedAt)}</Badge>
                </div>
                <div className="mt-3 text-xs text-white/46">{formatDateTimeBR(report.reportedAt)} · {report.sourceKind}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </AppShell>
  );
}
