import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, CalendarSync, RadioTower, RefreshCcw, Sparkles } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { OpsMetricCard } from "@/components/admin/ops/ops-metric-card";
import { runAuditDossiersAction, runAuditRefreshAction, seedAuditGroupsAction } from "./actions";
import { requireAdminUser } from "@/lib/auth/admin";
import { getOperationalDashboard } from "@/lib/ops/reports";
import { fuelLabels } from "@/lib/format/labels";
import { formatDateTimeBR, formatRecencyLabel } from "@/lib/format/time";

export const dynamic = "force-dynamic";

function resolveNotice(searchParams?: Record<string, string | string[] | undefined>) {
  const notice = typeof searchParams?.notice === "string" ? searchParams.notice : "";
  const count = typeof searchParams?.count === "string" ? searchParams.count : null;

  if (notice === "refresh_ok") return "Refresh analítico concluído.";
  if (notice === "refresh_failed") return "Refresh analítico falhou.";
  if (notice === "dossiers_ok") return "Dossiês recorrentes gerados.";
  if (notice === "dossiers_failed") return "Geração de dossiês falhou.";
  if (notice === "groups_seeded") return `Grupos territoriais preenchidos${count ? ` (${count})` : ""}.`;
  if (notice === "groups_pending") return "Seed de grupos adiado: schema operacional ainda não aplicado ou sem correspondência suficiente.";
  return null;
}

export default async function AdminOpsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminUser();
  const params = (await searchParams) ?? {};
  const dashboard = await getOperationalDashboard(30);
  const banner = resolveNotice(params);

  return (
    <AppShell>
      <div className="space-y-4 pb-10 pt-1">
        <SectionCard className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Operação</p>
              <h1 className="text-[2rem] font-semibold leading-none text-white">Painel operacional</h1>
              <p className="max-w-2xl text-sm text-white/58">
                Rotina diária, dossiês recorrentes, cobertura e prioridades de coleta. Este é o lado do produto que organiza o ritmo da base.
              </p>
            </div>
            <Badge variant="warning">Ritmo em execução</Badge>
          </div>

          {banner ? <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/74">{banner}</div> : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <form action={runAuditRefreshAction}>
              <Button type="submit" className="w-full">
                <RefreshCcw className="h-4 w-4" />
                Rodar refresh
              </Button>
            </form>
            <form action={runAuditDossiersAction}>
              <Button type="submit" variant="secondary" className="w-full">
                <CalendarSync className="h-4 w-4" />
                Gerar dossiês
              </Button>
            </form>
            <form action={seedAuditGroupsAction}>
              <Button type="submit" variant="secondary" className="w-full border-[color:var(--color-accent)]/30 text-[color:var(--color-accent)]">
                <Sparkles className="h-4 w-4" />
                Preencher grupos
              </Button>
            </form>
          </div>
        </SectionCard>

        <SectionCard className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OpsMetricCard label="Cidades cobertas" value={dashboard.summary.citiesCovered} note="Recorte operacional atual" tone="accent" />
          <OpsMetricCard label="Observações recentes" value={dashboard.summary.recentObservations} note="Última janela de 30 dias" />
          <OpsMetricCard label="Cidades fracas" value={dashboard.summary.lowCoverageCities} note="Cobertura abaixo do mínimo desejado" tone="warning" />
          <OpsMetricCard label="Grupos vazios" value={dashboard.summary.emptyGroups} note="Corredores sem membros ainda" tone="danger" />
        </SectionCard>

        <SectionCard className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Última execução</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Refresh e dossiês</h2>
            <div className="mt-4 space-y-3 text-sm text-white/62">
              <p>Refresh: {dashboard.lastRefresh ? `${formatRecencyLabel(dashboard.lastRefresh.startedAt)} · ${dashboard.lastRefresh.status}` : "sem execução registrada"}</p>
              <p>Dossiês: {dashboard.lastDossiers ? `${formatRecencyLabel(dashboard.lastDossiers.startedAt)} · ${dashboard.lastDossiers.status}` : "sem execução registrada"}</p>
              <p>Observação: a rotina manual dispara as mesmas camadas que o cron usará em produção.</p>
            </div>
          </div>

          <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Cobertura operacional</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Sinal da base</h2>
            <div className="mt-4 space-y-2 text-sm text-white/62">
              <p>Combustíveis com baixa massa: {dashboard.summary.lowCoverageFuels}</p>
              <p>Postos sem leitura recente: {dashboard.summary.staleStations}</p>
              <p>Observação recente total: {dashboard.summary.recentObservations}</p>
              <p>Grupos ativos com cobertura: {dashboard.groups.filter((group) => group.members > 0).length}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Cobertura por cidade e combustível</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Onde a base ainda está fraca</h2>
            </div>
            <RadioTower className="h-5 w-5 text-[color:var(--color-accent)]" />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dashboard.coverageRows.slice(0, 12).map((row) => (
              <div key={`${row.citySlug}-${row.fuelType}`} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                <p className="text-base font-semibold text-white">{row.city}</p>
                <p className="mt-1 text-sm text-white/54">{fuelLabels[row.fuelType as keyof typeof fuelLabels] ?? row.fuelType}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{Math.round(row.coverageRatio * 100)}%</p>
                <p className="mt-1 text-xs text-white/42">{row.observations} observações · {row.coverageLabel} · {row.confidenceLabel}</p>
                <p className="mt-1 text-xs text-white/42">Última leitura {row.lastReportedAt ? formatDateTimeBR(row.lastReportedAt) : "sem data"}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Priorização de coleta</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Postos com mais necessidade de densificação</h2>
            </div>
            <AlertTriangle className="h-5 w-5 text-[color:var(--color-accent)]" />
          </div>
          <div className="space-y-3">
            {dashboard.priorityTargets.map((target) => (
              <div key={target.stationId} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">{target.stationName}</p>
                    <p className="mt-1 text-sm text-white/54">{target.city}{target.neighborhood ? ` · ${target.neighborhood}` : ""}</p>
                  </div>
                  <Badge variant={target.geoReviewStatus === "ok" ? "default" : target.geoReviewStatus === "pending" ? "warning" : "danger"}>{target.geoReviewStatus ?? "sem status"}</Badge>
                </div>
                <p className="mt-3 text-sm text-white/62">{target.reason}</p>
                <p className="mt-1 text-xs text-white/42">Prioridade {target.priorityScore} · {target.recentObservations} observações · {target.lastReportedAt ? formatRecencyLabel(target.lastReportedAt) : "sem leitura recente"}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Grupos territoriais</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Curadoria editorial inicial</h2>
            </div>
            <Link href="/auditoria/relatorios" className="text-sm text-[color:var(--color-accent)]">
              Ver relatórios públicos
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dashboard.groups.map((group) => (
              <div key={group.id} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                <p className="text-base font-semibold text-white">{group.name}</p>
                <p className="mt-1 text-sm text-white/54">{group.city ?? "recorte regional"} · {group.groupType}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{group.members}</p>
                <p className="mt-1 text-xs text-white/42">{group.coverageState}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Execução recente</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Últimas rodadas</h2>
            </div>
            <Link href="/admin" className="text-sm text-[color:var(--color-accent)]">
              Voltar para moderação
            </Link>
          </div>
          <div className="space-y-3">
            {dashboard.recentRuns.map((run) => (
              <div key={run.id} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">{run.jobType}</p>
                    <p className="mt-1 text-sm text-white/54">{run.status} · {run.cadence} · {formatDateTimeBR(run.startedAt)}</p>
                  </div>
                  <Badge variant={run.status === "success" ? "default" : run.status === "failed" ? "danger" : "warning"}>{run.status}</Badge>
                </div>
                {run.errorMessage ? <p className="mt-2 text-sm text-[color:var(--color-danger)]">{run.errorMessage}</p> : null}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
