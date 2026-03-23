import { AlertTriangle, CalendarSync, Download, RadioTower, RefreshCcw, Sparkles, UserPlus, ShieldAlert, Activity, Check, X, Ban, LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { OpsMetricCard } from "@/components/admin/ops/ops-metric-card";
import { BetaInviteManager } from "@/components/admin/ops/beta-invite-manager";
import { StationEditorialQueue } from "@/components/admin/ops/station-editorial-queue";
import { BetaFeedbackTriage } from "@/components/admin/ops/beta-feedback-triage";
import { CityReadinessPanel } from "@/components/admin/ops/city-readiness-panel";
import { BetaOpsSignals } from "@/components/admin/ops/beta-ops-signals";
import { EditorialGapPanel } from "@/components/admin/ops/editorial-gap-panel";
import { GroupReadinessPanel } from "@/components/admin/ops/group-readiness-panel";
import { 
  runAuditDossiersAction, 
  runAuditRefreshAction, 
  seedAuditGroupsAction 
} from "./actions";
import { requireAdminUser } from "@/lib/auth/admin";
import { getBetaFeedbackSummary } from "@/lib/beta/feedback";
import { getActiveStations } from "@/lib/data/queries";
import { getBetaOpsInsights } from "@/lib/ops/insights";
import { getStationEditorialReviewQueue } from "@/lib/quality/stations";
import { getCityReadinessRows, getGroupReadinessRows } from "@/lib/ops/readiness";
import { getEditorialGapDashboard } from "@/lib/ops/editorial-gaps";
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
  if (notice === "invite_created") return "Código de convite gerado com sucesso.";
  if (notice === "invite_failed") return "Falha ao gerar código de convite.";
  if (notice === "invite_disabled") return "Código de convite desativado.";
  if (notice === "triage_ok") return "Triagem de feedback atualizada.";
  return null;
}

interface AdminOpsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminOpsPage({ searchParams }: AdminOpsPageProps) {
  await requireAdminUser();
  const params = (await searchParams) ?? {};
  const [opsInsights, readinessRows, groupReadinessRows, stations, editorialGaps] = await Promise.all([
    getBetaOpsInsights(), 
    getCityReadinessRows(30), 
    getGroupReadinessRows(30),
    getActiveStations(), 
    getEditorialGapDashboard(14)
  ]);
  const editorialQueue = getStationEditorialReviewQueue(stations);
  const { dashboard, inviteSummary, daily, alerts } = opsInsights;
  const feedback = await getBetaFeedbackSummary(14);
  const banner = resolveNotice(params);

  return (
    <AppShell>
      <div className="space-y-4 pb-10 pt-1">
        <SectionCard className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Operação Beta</p>
              <h1 className="text-[2rem] font-semibold leading-none text-white">Painel operacional</h1>
              <p className="max-w-2xl text-sm text-white/58">
                Gestão de convites, triagem de feedback e alertas automáticos. Automatizando o beta para ser leve e reativo.
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
                <Link href="/admin/ops/export?kind=readiness" className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white/72 hover:border-[color:var(--color-accent)] hover:text-white">
                  <Download className="h-3.5 w-3.5" />
                  CSV readiness
                </Link>
                <Link href="/admin/ops/export?kind=gaps" className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white/72 hover:border-[color:var(--color-accent)] hover:text-white">
                  <Download className="h-3.5 w-3.5" />
                  CSV lacunas
                </Link>
              </div>
            </div>
          </div>

          {banner ? <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/74">{banner}</div> : null}

          <BetaOpsSignals alerts={alerts} />
          <GroupReadinessPanel rows={groupReadinessRows} />
          <CityReadinessPanel rows={readinessRows} />
          <EditorialGapPanel data={editorialGaps} />
          <StationEditorialQueue items={editorialQueue} />

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

        <SectionCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Hoje</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Resumo operacional</h2>
            </div>
            <LayoutDashboard className="h-4 w-4 text-white/42" />
          </div>
          <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <OpsMetricCard label="Testers hoje" value={daily.testersActiveToday} note="Únicos por IP" tone="accent" />
            <OpsMetricCard label="Iniciaram envio" value={daily.submissionsStartedToday} note="Volume de hoje" />
            <OpsMetricCard label="Envios concluídos" value={daily.submissionsCompletedToday} note="Volume de hoje" />
            <OpsMetricCard label="Feedback hoje" value={daily.feedbackReceivedToday} note="Volume de hoje" tone="warning" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {daily.topDropoffStep && (
              <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">Maior abandono hoje</p>
                <p className="mt-2 text-lg font-semibold text-white">{daily.topDropoffStep}</p>
                <p className="text-sm text-white/58">{daily.topDropoffLost} perdidos neste fluxo hoje.</p>
              </div>
            )}
            {daily.topConfusingScreen && (
              <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">Tela com mais feedback hoje</p>
                <p className="mt-2 text-lg font-semibold text-white">{daily.topConfusingScreen}</p>
                <p className="text-sm text-white/58">{daily.topConfusingScreenCount} retornos nesta tela hoje.</p>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Convites</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Gestão de acesso</h2>
            </div>
            <UserPlus className="h-5 w-5 text-white/42" />
          </div>
          <BetaInviteManager summary={inviteSummary} />
        </SectionCard>

        <SectionCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Triage & Feedback</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Triagem de tester</h2>
            </div>
            <Activity className="h-5 w-5 text-white/42" />
          </div>
          <BetaFeedbackTriage feedback={feedback} />
        </SectionCard>

        <SectionCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Monitoramento Base</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Funil, Cobertura e Prioridades</h2>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <OpsMetricCard label="Abriu home" value={dashboard.observability.funnel.homeOpened} note="7 dias" tone="accent" />
            <OpsMetricCard label="Usou busca" value={dashboard.observability.funnel.searchUsed} note="7 dias" />
            <OpsMetricCard label="Clicou em posto" value={dashboard.observability.funnel.stationClicked} note="7 dias" />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Cidades Fracas (Oportunidade)</p>
              <div className="mt-4 space-y-2">
                {daily.weakCities.map((city: { city: string; count: number; coverageLabel: string; confidenceLabel: string }) => (
                  <div key={city.city} className="flex items-center justify-between rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm">
                    <span className="text-white font-medium">{city.city}</span>
                    <span className="text-white/42">{city.coverageLabel} · {city.count} obs</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Eventos Críticos</p>
              <div className="mt-4 space-y-2">
                {dashboard.observability.recentEvents.filter((e: { severity: string }) => e.severity === "error" || e.severity === "warning").slice(0, 5).map((event: { id: string; eventType: string; severity: string; createdAt: string; reason: string | null }) => (
                  <div key={event.id} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className={event.severity === "error" ? "text-[color:var(--color-danger)]" : "text-[color:var(--color-warning)]"}>{event.eventType}</span>
                      <span className="text-white/24">{formatRecencyLabel(event.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-white/58">{event.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}




