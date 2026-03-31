import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, Clock3, Pause, Sprout, Slash } from "lucide-react";

import { requireAdminUser } from "@/lib/auth/admin";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import {
  buildTerritoryWorkflowReturnTo,
  getTerritoryWorkflowQueueReadout,
  territoryWorkflowBlockLabel,
  territoryWorkflowBlockShortLabel,
  territoryWorkflowDueLabel,
  territoryWorkflowLabel,
  territoryWorkflowResponsibleLabel,
  territoryWorkflowStateTone,
  type TerritoryWorkflowRecord
} from "@/lib/ops/territory-workflow";
import { TerritoryWorkflowControls } from "@/components/admin/ops/territory-workflow-controls";

export const dynamic = "force-dynamic";

function territoryHref(path: string, city: string, neighborhood?: string | null) {
  const params = new URLSearchParams();
  params.set("city", city);
  if (neighborhood) params.set("neighborhood", neighborhood);
  params.set("territoryContext", "fila_operacional");
  const suffix = params.toString();
  return suffix ? (`${path}?${suffix}` as Route) : (path as Route);
}

function isOverdue(record: TerritoryWorkflowRecord) {
  return Boolean(record.dueAt && new Date(record.dueAt).getTime() < Date.now() && record.dueKind !== "sem_prazo");
}

function dueLabel(record: TerritoryWorkflowRecord) {
  return record.dueAt ? `${territoryWorkflowDueLabel(record.dueKind)} · ${new Date(record.dueAt).toLocaleDateString("pt-BR")}` : territoryWorkflowDueLabel(record.dueKind);
}

function followUpLabel(record: TerritoryWorkflowRecord) {
  const source = record.followUpAt || record.updatedAt;
  return new Date(source).toLocaleDateString("pt-BR") + ` · ${new Date(source).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function TerritoryCard({ record, returnTo }: { record: TerritoryWorkflowRecord; returnTo: string }) {
  const overdue = isOverdue(record);
  const stateLabel = overdue && record.workflowState === "em_acompanhamento" ? "Atrasado" : territoryWorkflowLabel(record.workflowState);

  return (
    <div className={`rounded-[22px] border p-4 ${overdue ? "border-red-500/20 bg-red-500/5" : "border-white/8 bg-black/25"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-white">{record.neighborhood || record.city}</p>
            <Badge variant={territoryWorkflowStateTone(record.workflowState) as any}>{stateLabel}</Badge>
            <Badge variant="outline">{record.responsibleName || territoryWorkflowResponsibleLabel(record.responsibleRole)}</Badge>
            <Badge variant="outline">{territoryWorkflowDueLabel(record.dueKind)}</Badge>
            {record.blockKind ? <Badge variant="outline">{territoryWorkflowBlockShortLabel(record.blockKind)}</Badge> : null}
          </div>
          <p className="text-sm text-white/54">{record.city}{record.neighborhood ? ` · ${record.neighborhood}` : ""}</p>
          <p className="text-[11px] text-white/42">{dueLabel(record)} · {followUpLabel(record)}</p>
          {record.note ? <p className="text-[11px] text-white/54">{record.note}</p> : null}
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Dono</p>
          <p className="text-sm font-semibold text-white">{record.responsibleName || territoryWorkflowResponsibleLabel(record.responsibleRole)}</p>
          <p className="text-[11px] text-white/40">{record.actorEmail || "sem autor"}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/44">
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{record.workflowState === "em_mutirao" ? "Mutirão em andamento" : record.workflowState === "em_acompanhamento" && overdue ? "Precisa reação" : "Operação leve"}</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{territoryWorkflowResponsibleLabel(record.responsibleRole)}</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{territoryWorkflowBlockLabel(record.blockKind)}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={territoryHref("/admin/ops/cobertura-territorial", record.city, record.neighborhood || undefined)} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">Ver cobertura</Link>
        <Link href={territoryHref("/admin/ops/qualidade", record.city, record.neighborhood || undefined)} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">Abrir curadoria</Link>
        <Link href={territoryHref("/admin/ops/station-editors", record.city, record.neighborhood || undefined)} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">Ver editores</Link>
        <Link href={territoryHref("/postos/sem-atualizacao", record.city, record.neighborhood || undefined)} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">Sem atualização</Link>
      </div>

      <div className="mt-4">
        <TerritoryWorkflowControls
          city={record.city}
          neighborhood={record.neighborhood}
          returnTo={returnTo}
          currentState={record}
          compact
        />
      </div>
    </div>
  );
}

function QueueSection({ title, subtitle, records, icon: Icon, emptyText, returnTo }: {
  title: string;
  subtitle: string;
  records: TerritoryWorkflowRecord[];
  icon: typeof Clock3;
  emptyText: string;
  returnTo: string;
}) {
  return (
    <SectionCard className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-[color:var(--color-accent)]" />
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Fila do dia</p>
          </div>
          <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-white/54">{subtitle}</p>
        </div>
        <Badge variant="outline">{records.length}</Badge>
      </div>

      <div className="space-y-3">
        {records.length === 0 ? <div className="rounded-[18px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">{emptyText}</div> : records.slice(0, 8).map((record) => <TerritoryCard key={record.territoryKey} record={record} returnTo={returnTo} />)}
      </div>
    </SectionCard>
  );
}

export default async function TerritorialWorkflowQueuePage() {
  await requireAdminUser();
  const queue = await getTerritoryWorkflowQueueReadout(200);
  const focus = queue.prioritiesToday[0] ?? queue.mutirao[0] ?? queue.acompanhamentoAtrasado[0] ?? queue.bloqueiosCurtos[0] ?? queue.concluidoRecentemente[0] ?? queue.records[0] ?? null;
  const returnTo = focus ? buildTerritoryWorkflowReturnTo("/admin/ops/fila-territorial", focus.city, focus.neighborhood || undefined, "fila_operacional") : "/admin/ops/fila-territorial";

  return (
    <div className="space-y-6 pb-20">
      <SectionCard className="space-y-4 border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-accent)]">Fila operacional territorial</p>
            <h1 className="text-2xl font-semibold text-white">Coordenação simples com dono e prazo</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-white/58">Use esta fila para puxar o próximo passo do mutirão, da curadoria e do acompanhamento sem criar um sistema de tarefas pesado.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/ops" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">Voltar ao OPS</Link>
            <Link href="/admin/ops/cobertura-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">Cobertura territorial</Link>
            <Link href="/admin/ops/impacto-semeadura-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">Impacto da semeadura</Link>
            <Link href="/admin/ops/historico-cobertura-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">Histórico territorial</Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {[
            { label: "Prioridades de hoje", value: queue.summary.prioritiesToday, note: "ações para abrir agora" },
            { label: "Em mutirão", value: queue.summary.emMutirao, note: "territórios em rua" },
            { label: "Acompanhamento atrasado", value: queue.summary.acompanhamentoAtrasado, note: "precisa reação" },
            { label: "Bloqueios curtos", value: queue.summary.bloqueado, note: "aguardando próxima peça" },
            { label: "Concluídos recentes", value: queue.summary.concluidoRecentemente, note: "fechados agora" },
            { label: "Station editors", value: queue.summary.stationEditorResponsible, note: "dono no campo" },
            { label: "Sem prazo", value: queue.summary.semPrazo, note: "sem pressão de data" }
          ].map((item) => (
            <div key={item.label} className="rounded-[18px] border border-white/8 bg-black/25 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
              <p className="mt-1 text-[11px] text-white/42">{item.note}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {focus ? (
        <SectionCard className="space-y-4 border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-accent)]">Próxima ação recomendada</p>
              <h2 className="text-lg font-semibold text-white">{focus.neighborhood || focus.city}</h2>
              <p className="text-sm text-white/58">{focus.blockKind ? territoryWorkflowBlockLabel(focus.blockKind) : focus.workflowState === "em_acompanhamento" && isOverdue(focus) ? "Acompanhamento atrasado: reação rápida." : focus.workflowState === "em_mutirao" ? "Puxe o mutirão e deixe o dono claro." : "Use o território mais quente como partida."}</p>
            </div>
            <Badge variant="outline">{focus.city}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={territoryHref("/admin/ops/cobertura-territorial", focus.city, focus.neighborhood || undefined)} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">Ver cobertura</Link>
            <Link href={territoryHref("/admin/ops/qualidade", focus.city, focus.neighborhood || undefined)} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">Abrir curadoria</Link>
            <Link href={territoryHref("/admin/ops/station-editors", focus.city, focus.neighborhood || undefined)} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/74 hover:bg-white/10">Ver editores</Link>
          </div>
          <TerritoryWorkflowControls city={focus.city} neighborhood={focus.neighborhood} returnTo={returnTo} currentState={focus} compact />
        </SectionCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <QueueSection title="Prioridades de hoje" subtitle="Bairros com prazo hoje, bloqueio curto ou acompanhamento atrasado." records={queue.prioritiesToday} icon={Clock3} emptyText="Nada urgente agora." returnTo={returnTo} />
        <QueueSection title="Territórios em mutirão" subtitle="Pontos em rua que precisam de dono claro e prazo definido." records={queue.mutirao} icon={Sprout} emptyText="Nenhum mutirão ativo no momento." returnTo={returnTo} />
        <QueueSection title="Acompanhamento atrasado" subtitle="Territórios que passaram do prazo combinado." records={queue.acompanhamentoAtrasado} icon={AlertTriangle} emptyText="Sem atrasos agora." returnTo={returnTo} />
        <QueueSection title="Bloqueios curtos" subtitle="Territórios aguardando semeadura, curadoria ou editor." records={queue.bloqueiosCurtos} icon={Slash} emptyText="Sem bloqueios curtos no momento." returnTo={returnTo} />
        <QueueSection title="Concluídos recentemente" subtitle="Territórios que podem sair da fila principal por enquanto." records={queue.concluidoRecentemente} icon={Pause} emptyText="Nenhum encerrado recente." returnTo={returnTo} />
      </div>

      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Leitura rápida</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Como usar a fila</h2>
          </div>
          <Badge variant="outline">operacional</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4 text-sm text-white/60">
            <p className="font-semibold text-white">Hoje</p>
            <p className="mt-1">Abra primeiro o que está vencendo hoje, bloqueado ou atrasado no acompanhamento.</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4 text-sm text-white/60">
            <p className="font-semibold text-white">Dono</p>
            <p className="mt-1">Use nome nominal quando existir. Senão, station_editor, curadoria ou operação/admin.</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4 text-sm text-white/60">
            <p className="font-semibold text-white">Prazo</p>
            <p className="mt-1">Hoje, esta semana ou sem prazo. Simples de ler e simples de puxar.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}