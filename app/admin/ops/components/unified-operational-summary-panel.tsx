import Link from "next/link";
import type { Route } from "next";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TerritorialCoverageReadout } from "@/lib/ops/territorial-coverage";
import type { SeedingImpactReadout } from "@/lib/ops/territorial-seeding-impact";
import type { TerritoryWorkflowQueueReadout } from "@/lib/ops/territory-workflow";
import type { ProgressiveTrustOperationalReadout } from "@/lib/ops/progressive-trust-operations";
import type { EconomyTelemetryReadout } from "@/lib/ops/economy-telemetry";

type UnifiedStatus = "healthy" | "attention" | "problem";

interface UnifiedSignal {
  key: string;
  label: string;
  status: UnifiedStatus;
  summary: string;
  recommendation: string;
  href: Route;
  metricValue: number;
}

const statusLabels: Record<UnifiedStatus, string> = {
  healthy: "Saudável",
  attention: "Atenção",
  problem: "Problema"
};

function statusVariant(status: UnifiedStatus) {
  if (status === "problem") return "danger" as const;
  if (status === "attention") return "warning" as const;
  return "default" as const;
}

function statusTone(status: UnifiedStatus) {
  if (status === "problem") return "border-[color:var(--color-danger)]/25 bg-[color:var(--color-danger)]/6";
  if (status === "attention") return "border-[color:var(--color-accent)]/25 bg-[color:var(--color-accent)]/8";
  return "border-emerald-400/20 bg-emerald-400/8";
}

function statusRank(status: UnifiedStatus) {
  if (status === "problem") return 2;
  if (status === "attention") return 1;
  return 0;
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function buildCoverageSignal(readout: TerritorialCoverageReadout): UnifiedSignal {
  const neighborhoodTotal = Math.max(readout.summary.neighborhoods, 1);
  const stationTotal = Math.max(readout.summary.stations, 1);
  const emptyRatio = readout.summary.emptyZones / neighborhoodTotal;
  const staleRatio = readout.summary.stationsWithoutPrice / stationTotal;
  const status: UnifiedStatus = (emptyRatio >= 0.35 || staleRatio >= 0.45)
    ? "problem"
    : (emptyRatio >= 0.2 || staleRatio >= 0.3)
      ? "attention"
      : "healthy";

  return {
    key: "coverage",
    label: "Cobertura territorial",
    status,
    summary: `${readout.summary.emptyZones} bairros vazios · ${readout.summary.stationsWithoutPrice} postos sem preço recente`,
    recommendation: status === "problem"
      ? "Priorizar semeadura e curadoria nas zonas vazias"
      : status === "attention"
        ? "Densificar bairros fracos com semeadura guiada"
        : "Manter ritmo de cobertura nas zonas boas",
    href: "/admin/ops/cobertura-territorial" as Route,
    metricValue: Math.round((1 - emptyRatio) * 100)
  };
}

function buildSeedingSignal(readout: SeedingImpactReadout): UnifiedSignal {
  const total = Math.max(readout.summary.seedRequests, 1);
  const activeRate = percentage(readout.summary.seedActive, total);
  const duplicateRate = percentage(readout.summary.seedDuplicates, total);
  const reviewRate = percentage(readout.summary.seedNeedsReview, total);

  const status: UnifiedStatus = readout.summary.seedRequests === 0
    ? "attention"
    : (duplicateRate >= 25 || activeRate < 45)
      ? "problem"
      : (duplicateRate >= 15 || activeRate < 60 || reviewRate > 35)
        ? "attention"
        : "healthy";

  return {
    key: "seeding-impact",
    label: "Impacto da semeadura",
    status,
    summary: `${readout.summary.seedRequests} semeadas · ${activeRate}% ativas · ${duplicateRate}% duplicadas`,
    recommendation: status === "problem"
      ? "Reforcar deduplicacao e calibrar criacao em campo"
      : status === "attention"
        ? "Ajustar triagem de semeadura por bairro"
        : "Manter foco nas zonas com transicao fraca para boa",
    href: "/admin/ops/impacto-semeadura-territorial" as Route,
    metricValue: Math.round(activeRate - duplicateRate)
  };
}

function buildTerritorialQueueSignal(readout: TerritoryWorkflowQueueReadout): UnifiedSignal {
  const status: UnifiedStatus = (readout.summary.acompanhamentoAtrasado >= 6 || readout.summary.prioritiesToday >= 12)
    ? "problem"
    : (readout.summary.acompanhamentoAtrasado >= 3 || readout.summary.prioritiesToday >= 6 || readout.summary.bloqueado >= 8)
      ? "attention"
      : "healthy";

  return {
    key: "territorial-queue",
    label: "Fila territorial",
    status,
    summary: `${readout.summary.prioritiesToday} prioridades hoje · ${readout.summary.acompanhamentoAtrasado} atrasados`,
    recommendation: status === "problem"
      ? "Limpar atrasos e bloqueios antes de abrir nova frente"
      : status === "attention"
        ? "Fechar prioridades do dia e revisar donos"
        : "Manter rotina de acompanhamento com prazo curto",
    href: "/admin/ops/fila-territorial" as Route,
    metricValue: Math.max(0, 100 - (readout.summary.prioritiesToday * 4 + readout.summary.acompanhamentoAtrasado * 8))
  };
}

function buildProgressiveTrustSignal(readout: ProgressiveTrustOperationalReadout): UnifiedSignal {
  const status: UnifiedStatus = (readout.queue.pendingFastLane >= 12 || readout.impact.queueReductionRate < 15)
    ? "problem"
    : (readout.queue.pendingFastLane >= 6 || readout.impact.queueReductionRate < 30)
      ? "attention"
      : "healthy";

  return {
    key: "progressive-trust",
    label: "Confianca progressiva",
    status,
    summary: `Fase ${readout.rollout.phase} · reducao da fila ${readout.impact.queueReductionRate}% · fast-lane pendente ${readout.queue.pendingFastLane}`,
    recommendation: status === "problem"
      ? "Segurar expansao e destravar fast-lane"
      : status === "attention"
        ? "Manter fase atual com monitoramento curto"
        : "Manter rollout atual e preservar disciplina da fila",
    href: "/admin/ops" as Route,
    metricValue: Math.max(0, Math.round(readout.impact.queueReductionRate * 2 - readout.queue.pendingFastLane * 3))
  };
}

function buildModerationGuardrailSignal(readout: ProgressiveTrustOperationalReadout): UnifiedSignal {
  const errorRate = readout.impact.autoApprovedErrorRate;
  const status: UnifiedStatus = errorRate >= 8
    ? "problem"
    : errorRate >= 4
      ? "attention"
      : "healthy";

  return {
    key: "moderation-guardrails",
    label: "Guardrails da moderacao",
    status,
    summary: `Erro autoaprovado ${errorRate}% · alto risco pendente ${readout.queue.pendingHighRisk}`,
    recommendation: status === "problem"
      ? "Reforcar moderacao manual e revisar autoaprovacao"
      : status === "attention"
        ? "Segurar expansao e monitorar correcao por risco"
        : "Manter monitoramento da qualidade",
    href: "/admin/ops" as Route,
    metricValue: Math.max(0, 100 - Math.round(errorRate * 10))
  };
}

function buildEconomySignal(readout: EconomyTelemetryReadout): UnifiedSignal {
  return {
    key: "economy-opportunity",
    label: "Economia e oportunidade",
    status: readout.guardrails.overallStatus,
    summary: `CTR ${readout.totals.ctr}% · rota ${readout.totals.routeRate}% · retorno ${readout.totals.returnRate}%`,
    recommendation: readout.guardrails.recommendations[0] ?? "Manter leitura operacional da frente",
    href: "/admin/ops" as Route,
    metricValue: Math.max(0, Math.round(readout.totals.ctr * 4 + readout.totals.routeRate * 8 + readout.totals.returnRate * 2))
  };
}

function resolveOverallStatus(signals: UnifiedSignal[]) {
  return signals.some((signal) => signal.status === "problem")
    ? "problem"
    : signals.some((signal) => signal.status === "attention")
      ? "attention"
      : "healthy";
}

function resolveBottleneck(signals: UnifiedSignal[]) {
  return [...signals]
    .sort((left, right) => statusRank(right.status) - statusRank(left.status) || left.metricValue - right.metricValue)
    [0];
}

function resolveHealthiest(signals: UnifiedSignal[]) {
  return [...signals]
    .sort((left, right) => statusRank(left.status) - statusRank(right.status) || right.metricValue - left.metricValue)
    [0];
}

export function UnifiedOperationalSummaryPanel({
  coverageReadout,
  seedingReadout,
  territorialQueueReadout,
  progressiveTrustReadout,
  economyReadout,
}: {
  coverageReadout: TerritorialCoverageReadout;
  seedingReadout: SeedingImpactReadout;
  territorialQueueReadout: TerritoryWorkflowQueueReadout;
  progressiveTrustReadout: ProgressiveTrustOperationalReadout;
  economyReadout: EconomyTelemetryReadout;
}) {
  const signals = [
    buildCoverageSignal(coverageReadout),
    buildSeedingSignal(seedingReadout),
    buildTerritorialQueueSignal(territorialQueueReadout),
    buildProgressiveTrustSignal(progressiveTrustReadout),
    buildModerationGuardrailSignal(progressiveTrustReadout),
    buildEconomySignal(economyReadout),
  ];

  const overallStatus = resolveOverallStatus(signals);
  const bottleneck = resolveBottleneck(signals);
  const healthiest = resolveHealthiest(signals);
  const actionRecommendation = bottleneck.recommendation;

  return (
    <section className="space-y-4 rounded-[28px] border border-white/8 bg-[#111] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/34">Resumo operacional unificado</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Base, moderacao e economize em uma leitura unica</h2>
          <p className="mt-1 max-w-3xl text-sm text-white/54">Visao executiva e acionavel das frentes principais para decidir onde atacar primeiro, o que manter e qual acao puxar nesta semana.</p>
        </div>
        <Badge variant={statusVariant(overallStatus)}>{statusLabels[overallStatus]}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Gargalo principal da semana</p>
          <p className="mt-2 text-lg font-semibold text-white">{bottleneck.label}</p>
          <p className="mt-1 text-xs text-white/52">{bottleneck.summary}</p>
          <Badge variant={statusVariant(bottleneck.status)} className="mt-3">{statusLabels[bottleneck.status]}</Badge>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Frente mais saudavel</p>
          <p className="mt-2 text-lg font-semibold text-white">{healthiest.label}</p>
          <p className="mt-1 text-xs text-white/52">{healthiest.summary}</p>
          <Badge variant={statusVariant(healthiest.status)} className="mt-3">{statusLabels[healthiest.status]}</Badge>
        </div>
        <div className="rounded-[22px] border border-[color:var(--color-accent)]/25 bg-[color:var(--color-accent)]/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Acao recomendada</p>
          <p className="mt-2 text-lg font-semibold text-white">{actionRecommendation}</p>
          <p className="mt-1 text-xs text-white/52">Puxada a partir do gargalo desta semana para reduzir atrito operacional.</p>
          <Link href={bottleneck.href} className="mt-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
            Abrir frente
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {signals.map((signal) => (
          <div key={signal.key} className={cn("rounded-[22px] border p-4", statusTone(signal.status))}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">{signal.label}</p>
              <Badge variant={statusVariant(signal.status)}>{statusLabels[signal.status]}</Badge>
            </div>
            <p className="mt-2 text-xs text-white/56">{signal.summary}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/68">{signal.recommendation}</p>
            <Link href={signal.href} className="mt-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
              Abrir leitura
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
