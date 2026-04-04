import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatDateTimeBR, formatRecencyLabel } from "@/lib/format/time";
import type { ProgressiveTrustOperationalReadout, ProgressiveTrustQueueItem } from "@/lib/ops/progressive-trust-operations";

const routingLabels = {
  review_normal: "Revisão normal",
  fast_lane: "Fast-lane",
  auto_approved: "Autoaprovado"
} as const;

const riskLabels = {
  low: "Risco baixo",
  medium: "Risco moderado",
  high: "Risco alto"
} as const;

function ReportList({ title, description, items }: { title: string; description: string; items: ProgressiveTrustQueueItem[] }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs text-white/46">{description}</p>
        </div>
        <Badge variant="secondary">{items.length}</Badge>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-4 text-sm text-white/54">Sem itens agora.</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-[20px] border border-white/8 bg-black/25 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{item.stationName}</p>
                  <p className="text-xs text-white/42">{item.neighborhood}, {item.city}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{formatCurrencyBRL(item.price)}</p>
                  <p className="text-[11px] text-white/42">{formatRecencyLabel(item.reportedAt)}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-blue-500/20 text-blue-300">{item.contributorTrustLevel}</Badge>
                <Badge variant="outline" className="border-white/10 text-white/70">{riskLabels[item.submissionRiskLevel]}</Badge>
                <Badge variant="accent">{routingLabels[item.submissionRouting]}</Badge>
              </div>

              <p className="mt-3 text-xs text-white/62">Motivo da rota: {item.routeReason}</p>
              <p className="mt-1 text-xs text-white/48">Risco principal: {item.riskReason}</p>
              <p className="mt-1 text-xs text-white/40">Histórico curto: {item.historySummary.length > 0 ? item.historySummary.join(" · ") : "Sem resumo agregado"}</p>
              {item.correctionAfterAutoApproval ? (
                <p className="mt-1 text-xs text-red-300">Corrigido depois em {item.correctedAt ? formatDateTimeBR(item.correctedAt) : "momento não salvo"}.</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/admin/reports/${item.id}`} className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 hover:bg-white/10">
                  Abrir report
                </Link>
                <Link href={`/postos/${item.stationId}`} className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 hover:bg-white/10">
                  Ver posto
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RateTable({ title, items }: { title: string; items: ProgressiveTrustOperationalReadout["ratesByTrust"] }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-black/25 px-3 py-2">
            <div>
              <p className="text-sm text-white">{item.label}</p>
              <p className="text-[11px] text-white/40">{item.corrected} corrigidos em {item.total} autoaprovados</p>
            </div>
            <p className="text-sm font-semibold text-white">{item.correctionRate}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressiveTrustOperationsPanel({ readout }: { readout: ProgressiveTrustOperationalReadout }) {
  return (
    <section className="space-y-4 rounded-[28px] border border-white/8 bg-[#111] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/34">Operação da confiança</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Fila, impacto e qualidade do progressive trust</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/54">Leitura dos últimos {readout.windowDays} dias. O foco é reduzir fila com fast-lane e manter autoaprovação limitada, corrigível e auditável.</p>
        </div>
        <Badge variant="secondary">Atualizado {formatRecencyLabel(readout.generatedAt)}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Review normal</p>
          <p className="mt-2 text-2xl font-semibold text-white">{readout.totals.reviewNormal}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Fast-lane</p>
          <p className="mt-2 text-2xl font-semibold text-white">{readout.totals.fastLane}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Autoaprovados</p>
          <p className="mt-2 text-2xl font-semibold text-white">{readout.totals.autoApproved}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Corrigidos depois</p>
          <p className="mt-2 text-2xl font-semibold text-white">{readout.totals.correctedAutoApproved}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Redução estimada da fila</p>
          <p className="mt-2 text-2xl font-semibold text-white">{readout.impact.queueReductionRate}%</p>
          <p className="mt-1 text-xs text-white/42">{readout.impact.queueReductionEstimate} pendências evitadas por autoaprovação limitada</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Tempo médio fast-lane</p>
          <p className="mt-2 text-2xl font-semibold text-white">{readout.impact.avgFastLaneApprovalMinutes} min</p>
          <p className="mt-1 text-xs text-white/42">erro dos autoaprovados: {readout.impact.autoApprovedErrorRate}%</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Fila total agora</p>
          <p className="mt-2 text-2xl font-semibold text-white">{readout.queue.pendingTotal}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Fast-lane pendente</p>
          <p className="mt-2 text-2xl font-semibold text-white">{readout.queue.pendingFastLane}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Alto risco pendente</p>
          <p className="mt-2 text-2xl font-semibold text-white">{readout.queue.pendingHighRisk}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Carga manual ainda aberta</p>
          <p className="mt-2 text-2xl font-semibold text-white">{readout.queue.pendingReviewNormal}</p>
          <p className="mt-1 text-xs text-white/42">fast-lane no período: {readout.impact.fastLaneReviewShare}% do volume recente</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportList title="Fast-lane pendente" description="Itens que deveriam andar primeiro na revisão curta." items={readout.pendingFastLaneItems} />
        <ReportList title="Alto risco pendente" description="Casos sensíveis que não podem escapar da revisão humana reforçada." items={readout.pendingHighRiskItems} />
        <ReportList title="Autoaprovados recentes" description="Publicados automaticamente no período com trilha de explainability." items={readout.recentAutoApprovedItems} />
        <ReportList title="Autoaprovados corrigidos depois" description="Casos em que a publicação automática precisou de correção posterior." items={readout.correctedAutoApprovedItems} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
        <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
          <p className="text-sm font-semibold text-white">Principais motivos de queda para revisão normal</p>
          <div className="mt-4 space-y-2">
            {readout.topReviewReasons.length === 0 ? (
              <div className="rounded-[16px] border border-white/8 bg-black/25 px-3 py-4 text-sm text-white/54">Sem motivos agregados agora.</div>
            ) : (
              readout.topReviewReasons.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-black/25 px-3 py-2">
                  <p className="text-sm text-white/74">{item.label}</p>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))
            )}
          </div>
        </div>

        <RateTable title="Taxa de correção por faixa de confiança" items={readout.ratesByTrust} />
        <RateTable title="Taxa de correção por faixa de risco" items={readout.ratesByRisk} />
      </div>

      <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
        <p className="text-sm font-semibold text-white">Regressão de qualidade por rollout</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {readout.phaseImpact.length === 0 ? (
            <div className="rounded-[18px] border border-white/8 bg-black/25 px-3 py-4 text-sm text-white/54">Sem histórico suficiente por fase.</div>
          ) : (
            readout.phaseImpact.map((phase) => (
              <div key={`${phase.phase}-${phase.label}`} className="rounded-[20px] border border-white/8 bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Fase {phase.phase}</p>
                <p className="mt-2 text-lg font-semibold text-white">{phase.label}</p>
                <p className="mt-3 text-sm text-white/68">{phase.totalReports} reports no período</p>
                <p className="mt-1 text-sm text-white/68">{phase.autoApproved} autoaprovados</p>
                <p className="mt-1 text-sm text-white/68">{phase.correctedAutoApproved} corrigidos depois</p>
                <p className="mt-2 text-sm font-semibold text-white">Taxa de correção: {phase.correctionRate}%</p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}