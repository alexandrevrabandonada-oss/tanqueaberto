import Link from "next/link";
import type { Route } from "next";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TerritorialCoverageReadout } from "@/lib/ops/territorial-coverage";
import type { TerritoryWorkflowQueueReadout } from "@/lib/ops/territory-workflow";
import type { ProgressiveTrustOperationalReadout } from "@/lib/ops/progressive-trust-operations";
import type { EconomyTelemetryReadout } from "@/lib/ops/economy-telemetry";
import type { QualityMetrics } from "@/lib/data/quality-queries";

type PlaybookStatus = "healthy" | "attention" | "problem";

interface PlaybookItem {
  title: string;
  status: PlaybookStatus;
  metric: string;
  look: string;
  action: string;
  href: Route;
  hrefLabel: string;
}

interface PlaybookAlert {
  title: string;
  status: PlaybookStatus;
  now: string;
  action: string;
  href: Route;
  hrefLabel: string;
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function statusVariant(status: PlaybookStatus) {
  if (status === "problem") return "danger" as const;
  if (status === "attention") return "warning" as const;
  return "default" as const;
}

function statusLabel(status: PlaybookStatus) {
  if (status === "problem") return "Problema";
  if (status === "attention") return "Atenção";
  return "Saudável";
}

function statusTone(status: PlaybookStatus) {
  if (status === "problem") return "border-[color:var(--color-danger)]/25 bg-[color:var(--color-danger)]/6";
  if (status === "attention") return "border-[color:var(--color-accent)]/25 bg-[color:var(--color-accent)]/8";
  return "border-emerald-400/20 bg-emerald-400/8";
}

function buildQueueStatus(readout: TerritoryWorkflowQueueReadout): PlaybookStatus {
  if (readout.summary.acompanhamentoAtrasado >= 6 || readout.summary.prioritiesToday >= 12 || readout.summary.bloqueado >= 10) {
    return "problem";
  }
  if (readout.summary.acompanhamentoAtrasado >= 3 || readout.summary.prioritiesToday >= 6 || readout.summary.bloqueado >= 5) {
    return "attention";
  }
  return "healthy";
}

function buildProgressiveTrustStatus(readout: ProgressiveTrustOperationalReadout): PlaybookStatus {
  if (readout.impact.autoApprovedErrorRate >= 8 || readout.queue.pendingFastLane >= 12 || readout.queue.pendingHighRisk >= 10) {
    return "problem";
  }
  if (readout.impact.autoApprovedErrorRate >= 4 || readout.queue.pendingFastLane >= 6 || readout.queue.pendingHighRisk >= 5) {
    return "attention";
  }
  return "healthy";
}

function buildCoverageStatus(readout: TerritorialCoverageReadout, queueReadout: TerritoryWorkflowQueueReadout): PlaybookStatus {
  const neighborhoodTotal = Math.max(readout.summary.neighborhoods, 1);
  const stationTotal = Math.max(readout.summary.stations, 1);
  const emptyRatio = readout.summary.emptyZones / neighborhoodTotal;
  const staleRatio = readout.summary.stationsWithoutPrice / stationTotal;

  if (emptyRatio >= 0.35 || staleRatio >= 0.45 || queueReadout.summary.prioritiesToday >= 12) {
    return "problem";
  }
  if (emptyRatio >= 0.2 || staleRatio >= 0.3 || queueReadout.summary.prioritiesToday >= 6) {
    return "attention";
  }
  return "healthy";
}

function buildDuplicateStatus(qualityMetrics: QualityMetrics, coverageReadout: TerritorialCoverageReadout): PlaybookStatus {
  const duplicateRate = percentage(qualityMetrics.potentialPhotoReuses, qualityMetrics.totalReports);

  if (qualityMetrics.potentialPhotoReuses >= 3 || coverageReadout.summary.duplicateSignals >= 20 || duplicateRate >= 5) {
    return "problem";
  }
  if (qualityMetrics.potentialPhotoReuses >= 1 || coverageReadout.summary.duplicateSignals >= 8 || duplicateRate >= 2) {
    return "attention";
  }
  return "healthy";
}

function PlaybookColumn({
  frequency,
  title,
  note,
  items,
}: {
  frequency: string;
  title: string;
  note: string;
  items: PlaybookItem[];
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">{frequency}</p>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-white/52">{note}</p>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.title} className={cn("rounded-[20px] border p-4", statusTone(item.status))}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
            </div>
            <p className="mt-2 text-xs text-white/58">{item.metric}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/38">Olhar</p>
            <p className="mt-1 text-sm text-white/62">{item.look}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/38">Ação</p>
            <p className="mt-1 text-sm text-white/78">{item.action}</p>
            <Link href={item.href} className="mt-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
              {item.hrefLabel}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertCard({ alert }: { alert: PlaybookAlert }) {
  return (
    <div className={cn("rounded-[20px] border p-4", statusTone(alert.status))}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white">{alert.title}</p>
        <Badge variant={statusVariant(alert.status)}>{statusLabel(alert.status)}</Badge>
      </div>
      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/38">Agora</p>
      <p className="mt-1 text-sm text-white/62">{alert.now}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/38">Se piorar</p>
      <p className="mt-1 text-sm text-white/78">{alert.action}</p>
      <Link href={alert.href} className="mt-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
        {alert.hrefLabel}
      </Link>
    </div>
  );
}

export function OperationalPlaybookPanel({
  queueReadout,
  progressiveTrustReadout,
  economyReadout,
  coverageReadout,
  qualityMetrics,
}: {
  queueReadout: TerritoryWorkflowQueueReadout;
  progressiveTrustReadout: ProgressiveTrustOperationalReadout;
  economyReadout: EconomyTelemetryReadout;
  coverageReadout: TerritorialCoverageReadout;
  qualityMetrics: QualityMetrics;
}) {
  const queueStatus = buildQueueStatus(queueReadout);
  const progressiveTrustStatus = buildProgressiveTrustStatus(progressiveTrustReadout);
  const coverageStatus = buildCoverageStatus(coverageReadout, queueReadout);
  const duplicateStatus = buildDuplicateStatus(qualityMetrics, coverageReadout);
  const economyStatus = economyReadout.guardrails.overallStatus;

  const dailyItems: PlaybookItem[] = [
    {
      title: "Fila territorial",
      status: queueStatus,
      metric: `${queueReadout.summary.prioritiesToday} prioridades hoje · ${queueReadout.summary.acompanhamentoAtrasado} atrasados · ${queueReadout.summary.bloqueado} bloqueios`,
      look: "Abra prioridades do dia, atrasados e bloqueios curtos antes de puxar frente nova.",
      action: queueStatus === "problem" ? "Zere atraso e bloqueio primeiro. Defina dono e prazo curto no que estiver travando." : "Feche a fila do dia antes de abrir mais território.",
      href: "/admin/ops/fila-territorial" as Route,
      hrefLabel: "Abrir fila territorial",
    },
    {
      title: "Moderação / fast-lane / alto risco",
      status: progressiveTrustStatus,
      metric: `${progressiveTrustReadout.queue.pendingFastLane} fast-lane pendente · ${progressiveTrustReadout.queue.pendingHighRisk} alto risco · erro autoaprovado ${progressiveTrustReadout.impact.autoApprovedErrorRate}%`,
      look: "Olhe pendência de fast-lane antes de deixar alto risco envelhecer na fila.",
      action: progressiveTrustStatus === "problem" ? "Segure expansão, limpe fast-lane e revise o lote de alto risco no admin." : "Mantenha fast-lane curta e alto risco sob reação rápida.",
      href: "/admin?status=pending" as Route,
      hrefLabel: "Abrir moderação",
    },
  ];

  const twiceWeekItems: PlaybookItem[] = [
    {
      title: "Deduplicação / renomeação popular",
      status: duplicateStatus,
      metric: `${qualityMetrics.potentialPhotoReuses} reuso de foto · ${coverageReadout.summary.duplicateSignals} sinais de duplicidade · ${qualityMetrics.priceConflicts} conflitos`,
      look: "Abra qualidade para vincular duplicados, limpar nome popular confuso e fechar o que polui a base.",
      action: duplicateStatus === "problem" ? "Puxe deduplicação antes de semear de novo e corrija nome popular onde estiver embaralhando leitura." : "Faça uma passada curta de curadoria para evitar acúmulo silencioso.",
      href: "/admin/ops/qualidade" as Route,
      hrefLabel: "Abrir qualidade",
    },
    {
      title: "Economize / oportunidade",
      status: economyStatus,
      metric: `CTR ${economyReadout.totals.ctr}% · rota ${economyReadout.totals.routeRate}% · retorno ${economyReadout.totals.returnRate}%`,
      look: "Olhe se a frente ainda abre clique, rota e retorno em vez de só virar leitura bonita.",
      action: economyStatus === "problem" ? "Reforce atualização de preço útil e pare de empilhar superfície fraca." : "Mantenha a frente viva só onde ela ainda ajuda decisão real.",
      href: "/admin/ops#resumo-operacional-unificado" as Route,
      hrefLabel: "Abrir resumo unificado",
    },
  ];

  const weeklyItems: PlaybookItem[] = [
    {
      title: "Resumo operacional unificado",
      status: [queueStatus, progressiveTrustStatus, economyStatus, coverageStatus, duplicateStatus].includes("problem")
        ? "problem"
        : [queueStatus, progressiveTrustStatus, economyStatus, coverageStatus, duplicateStatus].includes("attention")
          ? "attention"
          : "healthy",
      metric: `${coverageReadout.summary.emptyZones} bairros vazios · fila reduzida ${progressiveTrustReadout.impact.queueReductionRate}% · ${economyReadout.guardrails.recommendations[0] ?? "sem recomendação extra"}`,
      look: "Use a semana para escolher um gargalo só, o dono principal e o corte que sai da pauta.",
      action: "Feche a pauta semanal a partir do gargalo principal, não da soma de todos os painéis.",
      href: "/admin/ops#resumo-operacional-unificado" as Route,
      hrefLabel: "Abrir resumo",
    },
    {
      title: "Guardrails da confiança progressiva",
      status: progressiveTrustStatus,
      metric: `fase ${progressiveTrustReadout.rollout.phase} · fila salva ${progressiveTrustReadout.impact.queueReductionRate}% · carga poupada ${progressiveTrustReadout.impact.moderationLoadSaved}`,
      look: "Reveja se a fase atual ainda está ajudando a operação ou só jogando ruído para frente.",
      action: progressiveTrustStatus === "problem" ? "Congele ampliação da fase e volte ao básico: fast-lane curta, alto risco visível e erro sob controle." : "Mantenha a fase atual só se o ganho de fila continuar real.",
      href: "/admin/ops#confianca-progressiva" as Route,
      hrefLabel: "Abrir confiança progressiva",
    },
  ];

  const alerts: PlaybookAlert[] = [
    {
      title: "Se confiança progressiva entrar em atenção/problema",
      status: progressiveTrustStatus,
      now: `${progressiveTrustReadout.queue.pendingFastLane} fast-lane pendente e erro autoaprovado em ${progressiveTrustReadout.impact.autoApprovedErrorRate}%.`,
      action: "Pare expansão, limpe fast-lane, puxe alto risco no admin e só depois reavalie autoaprovação.",
      href: "/admin?status=pending" as Route,
      hrefLabel: "Abrir moderação",
    },
    {
      title: "Se economize perder tração",
      status: economyStatus,
      now: `CTR em ${economyReadout.totals.ctr}%, rota em ${economyReadout.totals.routeRate}% e retorno em ${economyReadout.totals.returnRate}%.`,
      action: "Enxugue superfície fraca e reforce só os recortes com preço útil, rota e retorno reais.",
      href: "/admin/ops#resumo-operacional-unificado" as Route,
      hrefLabel: "Abrir leitura",
    },
    {
      title: "Se cobertura territorial travar",
      status: coverageStatus,
      now: `${coverageReadout.summary.emptyZones} bairros vazios e ${coverageReadout.summary.stationsWithoutPrice} postos sem preço recente.`,
      action: "Abra cobertura e fila territorial. Puxe semeadura guiada onde o bairro segue vazio e feche atraso antes de expandir.",
      href: "/admin/ops/cobertura-territorial" as Route,
      hrefLabel: "Abrir cobertura",
    },
    {
      title: "Se duplicidade voltar a subir",
      status: duplicateStatus,
      now: `${qualityMetrics.potentialPhotoReuses} reusos de foto e ${coverageReadout.summary.duplicateSignals} sinais de duplicidade no recorte atual.`,
      action: "Faça passada curta em qualidade para vincular duplicados e limpar nome popular antes que isso contamine a operação territorial.",
      href: "/admin/ops/qualidade" as Route,
      hrefLabel: "Abrir qualidade",
    },
  ];

  return (
    <section id="playbook-operacional-ops" className="space-y-4 rounded-[28px] border border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/7 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--color-accent)]">Playbook operacional curto</p>
          <h2 className="mt-1 text-xl font-semibold text-white">O painel já existe. O que faltava era rito.</h2>
          <p className="mt-1 max-w-3xl text-sm text-white/58">Use este bloco como rotina curta de operação semanal: olhar o sinal certo, puxar a frente certa e encerrar a rodada sem abrir trabalho novo desnecessário.</p>
        </div>
        <Badge variant="warning">rito semanal</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <PlaybookColumn frequency="Todo dia" title="Abrir, limpar, reagir" note="Rotina de começo e fim do turno." items={dailyItems} />
        <PlaybookColumn frequency="2x por semana" title="Podar ruído que volta" note="Passada curta para qualidade e oportunidade." items={twiceWeekItems} />
        <PlaybookColumn frequency="Toda semana" title="Fechar pauta e manter fase" note="Escolha o gargalo e preserve disciplina." items={weeklyItems} />
      </div>

      <div className="space-y-3 rounded-[24px] border border-white/8 bg-black/20 p-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Quando bater alerta</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Ação curta por tipo de problema</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {alerts.map((alert) => <AlertCard key={alert.title} alert={alert} />)}
        </div>
      </div>
    </section>
  );
}