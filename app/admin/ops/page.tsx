import Link from "next/link";
import { AlertTriangle, CalendarSync, Download, RadioTower, RefreshCcw, Sparkles } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { OpsMetricCard } from "@/components/admin/ops/ops-metric-card";
import { runAuditDossiersAction, runAuditRefreshAction, seedAuditGroupsAction } from "./actions";
import { requireAdminUser } from "@/lib/auth/admin";
import { getOperationalDashboard } from "@/lib/ops/reports";
import { getBetaFeedbackSummary } from "@/lib/beta/feedback";
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

interface AdminOpsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminOpsPage({ searchParams }: AdminOpsPageProps) {
  await requireAdminUser();
  const params = (await searchParams) ?? {};
  const dashboard = await getOperationalDashboard(30);
  const feedback = await getBetaFeedbackSummary(14);
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
                Rotina diária, dossiês recorrentes, cobertura, prioridades de coleta e sinais de abuso ou erro. Este é o lado do produto que organiza o ritmo da base.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="warning">Ritmo em execução</Badge>
              <div className="flex flex-wrap justify-end gap-2 text-sm">
                <Link href="/admin/ops/export?kind=feedback" className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white/72 hover:border-[color:var(--color-accent)] hover:text-white">
                  <Download className="h-3.5 w-3.5" />
                  CSV feedback
                </Link>
                <Link href="/admin/ops/export?kind=events" className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white/72 hover:border-[color:var(--color-accent)] hover:text-white">
                  <Download className="h-3.5 w-3.5" />
                  CSV eventos
                </Link>
              </div>
            </div>
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

        <SectionCard className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <OpsMetricCard label="Envios" value={dashboard.observability.summary.submissions} note="Últimos 7 dias" tone="accent" />
          <OpsMetricCard label="Aprovações" value={dashboard.observability.summary.approvals} note="Últimos 7 dias" />
          <OpsMetricCard label="Rejeições" value={dashboard.observability.summary.rejections} note="Últimos 7 dias" />
          <OpsMetricCard label="Bloqueios" value={dashboard.observability.summary.blockedSubmissions} note="Rate limit e validação" tone="warning" />
          <OpsMetricCard label="Erros de upload" value={dashboard.observability.summary.uploadErrors} note="Últimos 7 dias" tone="danger" />
          <OpsMetricCard label="Erros de auth" value={dashboard.observability.summary.authErrors} note="Últimos 7 dias" tone="danger" />
        </SectionCard>

        <SectionCard className="grid gap-3 sm:grid-cols-4">
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
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Funil do beta</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Entrada, busca, posto e envio</h2>
            </div>
            <Badge variant="warning">7 dias</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <OpsMetricCard label="Abriu home" value={dashboard.observability.funnel.homeOpened} note="Primeira entrada" tone="accent" />
            <OpsMetricCard label="Usou busca" value={dashboard.observability.funnel.searchUsed} note="Busca por posto, bairro ou cidade" />
            <OpsMetricCard label="Clicou em posto" value={dashboard.observability.funnel.stationClicked} note="Mapa, lista ou card" />
            <OpsMetricCard label="Abriu envio" value={dashboard.observability.funnel.submitOpened} note="A tela de envio foi aberta" />
            <OpsMetricCard label="Iniciou envio" value={dashboard.observability.funnel.submissionStarted} note="Primeiro gesto do formulário" />
            <OpsMetricCard label="Envio concluído" value={dashboard.observability.funnel.submissionAccepted} note="Entrou na moderação" tone="accent" />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Abandono entre etapas</p>
              <div className="mt-4 space-y-2 text-sm text-white/62">
                {dashboard.observability.funnel.dropoffBetweenSteps.map((step) => (
                  <div key={`${step.from}-${step.to}`} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-white">{step.from} → {step.to}</span>
                      <span>{Math.round(step.rate * 100)}% · {step.lost} perdidos</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Telas mais acionadas</p>
              <div className="mt-4 space-y-2 text-sm text-white/62">
                {dashboard.observability.topScreens.slice(0, 6).map((item) => (
                  <div key={item.screen} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-white">{item.screen}</span>
                      <span>{item.count}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/42">Último sinal {formatDateTimeBR(item.lastAt)}</p>
                  </div>
                ))}
              </div>
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
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Observabilidade mínima</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Erros, bloqueios e volume</h2>
            </div>
            <Badge variant="warning">7 dias</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            <OpsMetricCard label="Jobs com erro" value={dashboard.observability.summary.cronErrors} note="Refresh e dossiês falhos" tone="danger" />
            <OpsMetricCard label="Execuções manuais" value={dashboard.observability.summary.manualRuns} note="Rodadas disparadas no painel" />
            <OpsMetricCard label="Cidades com volume" value={dashboard.observability.summary.cityVolume} note="Leitura recente de envios" />
            <OpsMetricCard label="Combustíveis com volume" value={dashboard.observability.summary.fuelVolume} note="Cobertura por tipo" />
            <OpsMetricCard label="Bloqueios" value={dashboard.observability.summary.blockedSubmissions} note="Spam, validação ou rate limit" tone="warning" />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Volume por cidade</p>
              <div className="mt-4 space-y-3">
                {dashboard.observability.byCity.slice(0, 6).map((row) => (
                  <div key={row.city} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/66">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-white">{row.city}</span>
                      <span>{row.count} envios</span>
                    </div>
                    <p className="mt-1 text-xs text-white/44">Aprovados {row.approved} · Pendentes {row.pending} · Rejeitados {row.rejected}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Eventos recentes</p>
              <div className="mt-4 space-y-3">
                {dashboard.observability.recentEvents.slice(0, 6).map((event) => (
                  <div key={event.id} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/66">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-white">{event.eventType}</span>
                      <span className="text-xs text-white/42">{formatDateTimeBR(event.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/44">{event.reason ?? "sem motivo"} · {event.city ?? "sem cidade"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Ações administrativas recentes</p>
            <div className="mt-4 space-y-3">
              {dashboard.observability.recentAdminActions.slice(0, 6).map((action) => (
                <div key={action.id} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/66">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-white">{action.actionKind}</span>
                    <span className="text-xs text-white/42">{formatDateTimeBR(action.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/44">{action.note ?? action.actorEmail ?? "sem nota"}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Feedback beta</p>
              <h2 className="mt-1 text-xl font-semibold text-white">O que testers estão apontando</h2>
            </div>
            <Badge variant="warning">{feedback.total} retornos</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
            {feedback.byType.map((item) => (
              <div key={item.feedbackType} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/66">
                <p className="font-medium text-white">{item.feedbackType}</p>
                <p className="mt-1 text-xs text-white/44">{item.count} ocorrências</p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Por tela</p>
              <div className="mt-4 space-y-2">
                {feedback.byScreen.map((item) => (
                  <div key={item.screenGroup} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/66">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-white">{item.screenGroup}</span>
                      <span>{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Por status</p>
              <div className="mt-4 space-y-2">
                {feedback.byStatus.map((item) => (
                  <div key={item.triageStatus} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/66">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-white">{item.triageStatus}</span>
                      <span>{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Tags automáticas</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {feedback.byTag.map((item) => (
                  <Badge key={item.tag} variant="outline">
                    {item.tag} · {item.count}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Top páginas com feedback</p>
            <div className="mt-4 space-y-3">
              {feedback.byPage.slice(0, 5).map((item) => (
                <div key={item.pagePath} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/66">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-white">{item.pagePath}</span>
                    <span>{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Feedback recente</p>
            <div className="mt-4 space-y-3">
              {feedback.recent.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/66">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-white">{item.feedbackType}</span>
                    <span className="text-xs text-white/42">{formatDateTimeBR(item.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/44">{item.pagePath} · {item.city ?? "sem cidade"}</p>
                  <p className="mt-2 text-sm text-white/58 line-clamp-3">{item.message}</p>
                </div>
              ))}
            </div>
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
