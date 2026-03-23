import Link from "next/link";
import type { Route } from "next";
import { CalendarRange, Download, TriangleAlert } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyStateCard } from "@/components/state/empty-state-card";
import { getRecentAuditReportRuns } from "@/lib/audit/reports";
import { getRecentAuditAlertHistory } from "@/lib/audit/alerts-history";
import { fuelLabels } from "@/lib/format/labels";
import { formatDateTimeBR } from "@/lib/format/time";

export const dynamic = "force-dynamic";

export default async function AuditReportsPage() {
  const runs = await getRecentAuditReportRuns(24);
  const alerts = await getRecentAuditAlertHistory(24);

  return (
    <AppShell>
      <SectionCard className="space-y-4">
        <div className="space-y-2">
          <Badge>Beta fechado · memória pública</Badge>
          <h1 className="text-[2rem] font-semibold leading-none text-white">Relatórios gerados</h1>
          <p className="max-w-2xl text-sm text-white/62">
            Dossiês cívicos e alertas persistidos em linguagem pública. Se você quer comparar rápido, comece pela cidade; se quer aprofundar, abra a metodologia.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/auditoria" variant="secondary">
            Voltar para a auditoria
          </ButtonLink>
          <ButtonLink href="/auditoria/comparar" variant="secondary">
            Comparar cidades
          </ButtonLink>
        </div>
        <div className="flex items-center gap-3 rounded-[22px] border border-white/8 bg-black/30 px-4 py-3 text-sm text-white/50">
          <CalendarRange className="h-4 w-4 text-[color:var(--color-accent)]" />
          <span>Rotina semanal, mensal e por recorte temático</span>
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Fila publicada</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Dossiês disponíveis</h2>
          </div>
          <ButtonLink href={"/auditoria/comparar" as Route} variant="secondary">
            Comparar cidades <Download className="h-4 w-4" />
          </ButtonLink>
        </div>
        <div className="space-y-3">
          {runs.length === 0 ? (
            <EmptyStateCard
              title="Ainda não há dossiês publicados."
              description="Rode a rotina de geração para popular esta fila e começar a memória recorrente."
              actionHref={"/auditoria/comparar" as Route}
              actionLabel="Ir para comparação"
              className="text-left"
            />
          ) : (
            runs.map((run) => (
              <Link key={run.id} href={run.citySlug ? `/auditoria/cidade/${run.citySlug}?fuel=${run.fuelType}&days=${run.days}` as Route : "/auditoria" as Route} className="rounded-[22px] border border-white/8 bg-black/30 p-4 transition hover:border-white/18">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">{run.title}</p>
                    <p className="mt-1 text-sm text-white/54">{run.scopeType} · {run.scopeLabel} · {run.days} dias · {fuelLabels[run.fuelType]}</p>
                    <p className="mt-1 text-xs text-white/42">{formatDateTimeBR(run.generatedAt)} · {run.alertsCount} alertas · {run.visibilityStatus}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/74">{run.artifactFormat ?? "pdf"}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Alertas persistidos</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Memória de indícios</h2>
          </div>
          <TriangleAlert className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <EmptyStateCard
              title="Sem alertas persistidos ainda."
              description="Quando a rotina de dossiês rodar, os indícios passam a ficar registrados para revisão e histórico."
              actionHref={"/auditoria/metodologia" as Route}
              actionLabel="Ler metodologia"
              className="text-left"
            />
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                <p className="text-base font-semibold text-white">{alert.scopeLabel} · {alert.alertKind}</p>
                <p className="mt-1 text-sm text-white/58">{alert.cityName ?? alert.stationName ?? alert.groupSlug ?? "Recorte cívico"} · {fuelLabels[alert.fuelType]} · período {alert.periodDays} dias</p>
                <p className="mt-2 text-xs text-white/42">{alert.status} · intensidade {alert.intensity ?? "-"} · {formatDateTimeBR(alert.generatedAt)}</p>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </AppShell>
  );
}
