import { setTerritoryWorkflowStateAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  territoryWorkflowBlockLabel,
  territoryWorkflowBlockShortLabel,
  territoryWorkflowDueLabel,
  territoryWorkflowDueShortLabel,
  territoryWorkflowLabel,
  territoryWorkflowResponsibleLabel,
  territoryWorkflowResponsibleShortLabel,
  territoryWorkflowStateTone,
  type TerritoryWorkflowBlockKind,
  type TerritoryWorkflowDueKind,
  type TerritoryWorkflowRecord,
  type TerritoryWorkflowResponsibleRole,
  type TerritoryWorkflowState
} from "@/lib/ops/territory-workflow";

interface TerritoryWorkflowControlsProps {
  city: string;
  neighborhood?: string | null;
  returnTo: string;
  currentState?: TerritoryWorkflowRecord | null;
  compact?: boolean;
}

const WORKFLOW_OPTIONS: Array<{ value: TerritoryWorkflowState; label: string; description: string }> = [
  { value: "em_mutirao", label: "Em mutirão", description: "Território em trabalho de campo." },
  { value: "em_acompanhamento", label: "Em acompanhamento", description: "Território está estável, mas segue no radar." },
  { value: "concluido_por_enquanto", label: "Concluído por enquanto", description: "Território útil, pode pausar agora." }
];

const RESPONSIBLE_OPTIONS: Array<{ value: TerritoryWorkflowResponsibleRole; label: string; description: string }> = [
  { value: "station_editor", label: "Station editor", description: "Quem vai semear ou corrigir no campo." },
  { value: "curadoria", label: "Curadoria", description: "Quem revisa e fecha a qualidade do território." },
  { value: "operacao_admin", label: "Operação/Admin", description: "Coordenação e apoio do dia." }
];

const DUE_OPTIONS: Array<{ value: TerritoryWorkflowDueKind; label: string; description: string }> = [
  { value: "hoje", label: "Hoje", description: "Precisa andar agora." },
  { value: "esta_semana", label: "Esta semana", description: "Entra na fila desta rodada." },
  { value: "sem_prazo", label: "Sem prazo", description: "Sem pressão de data." }
];

const BLOCK_OPTIONS: Array<{ value: TerritoryWorkflowBlockKind; label: string; description: string }> = [
  { value: "aguardando_semeadura", label: "Aguardando semeadura", description: "Precisa virar base no campo." },
  { value: "aguardando_curadoria", label: "Aguardando curadoria", description: "Pede revisão antes de avançar." },
  { value: "aguardando_editor", label: "Aguardando editor", description: "Falta a pessoa do território." },
  { value: "sem_prioridade_agora", label: "Sem prioridade agora", description: "Pode ficar em espera curta." }
];

function HiddenFields({ city, neighborhood, returnTo }: { city: string; neighborhood?: string | null; returnTo: string }) {
  return (
    <>
      <input type="hidden" name="city" value={city} />
      <input type="hidden" name="neighborhood" value={neighborhood ?? ""} />
      <input type="hidden" name="returnTo" value={returnTo} />
    </>
  );
}

export function TerritoryWorkflowControls({ city, neighborhood, returnTo, currentState, compact = false }: TerritoryWorkflowControlsProps) {
  const sizeClass = compact ? "space-y-3 rounded-[18px] border border-white/8 bg-black/20 p-3" : "space-y-4 rounded-[22px] border border-white/8 bg-black/20 p-4";
  const gridClass = compact ? "grid gap-2 md:grid-cols-3" : "grid gap-3 md:grid-cols-3";
  const buttonClass = "h-auto w-full flex-col items-start rounded-[18px] px-3 py-3 text-left";
  const responsible = currentState?.responsibleRole ?? "operacao_admin";
  const responsibleName = currentState?.responsibleName ?? "";
  const dueKind = currentState?.dueKind ?? "sem_prazo";
  const blockKind = currentState?.blockKind ?? "";

  return (
    <div className={sizeClass}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Rotina do território</p>
          <p className="text-sm font-semibold text-white">Marcar próximo passo</p>
          <p className="text-[11px] text-white/44">Dono, prazo, nota e bloqueio curto, sem virar tarefa pesada.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={territoryWorkflowStateTone(currentState?.workflowState) as any}>{territoryWorkflowLabel(currentState?.workflowState)}</Badge>
          <Badge variant="outline">{responsibleName || territoryWorkflowResponsibleShortLabel(responsible)}</Badge>
          <Badge variant="outline">{territoryWorkflowDueShortLabel(dueKind)}</Badge>
          <Badge variant="outline">{territoryWorkflowBlockShortLabel(blockKind || null)}</Badge>
        </div>
      </div>

      <form action={setTerritoryWorkflowStateAction} className="space-y-3">
        <HiddenFields city={city} neighborhood={neighborhood} returnTo={returnTo} />
        <div className={gridClass}>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/36">Responsável</span>
            <select
              name="responsibleRole"
              defaultValue={responsible}
              className="h-11 w-full rounded-[14px] border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
            >
              {RESPONSIBLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-black text-white">
                  {option.label}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-white/42">{territoryWorkflowResponsibleLabel(responsible)}</span>
          </label>

          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/36">Nome do dono</span>
            <input
              name="responsibleName"
              type="text"
              defaultValue={responsibleName}
              placeholder="Opcional"
              className="h-11 w-full rounded-[14px] border border-white/10 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-white/30"
            />
            <span className="text-[11px] text-white/42">Pessoa, não só papel.</span>
          </label>

          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/36">Prazo</span>
            <select
              name="dueKind"
              defaultValue={dueKind}
              className="h-11 w-full rounded-[14px] border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
            >
              {DUE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-black text-white">
                  {option.label}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-white/42">{territoryWorkflowDueLabel(dueKind)}</span>
          </label>
        </div>

        <div className={gridClass}>
          <label className="space-y-1 md:col-span-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/36">Nota curta</span>
            <input
              name="note"
              type="text"
              placeholder="Ex.: mutirão amanhã"
              className="h-11 w-full rounded-[14px] border border-white/10 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-white/30"
            />
            <span className="text-[11px] text-white/42">Opcional, só para lembrar a operação.</span>
          </label>

          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/36">Bloqueio curto</span>
            <select
              name="blockKind"
              defaultValue={blockKind}
              className="h-11 w-full rounded-[14px] border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
            >
              <option value="" className="bg-black text-white">Sem bloqueio</option>
              {BLOCK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-black text-white">
                  {option.label}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-white/42">{territoryWorkflowBlockLabel(blockKind || null)}</span>
          </label>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          {WORKFLOW_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="submit"
              name="workflowState"
              value={option.value}
              variant={currentState?.workflowState === option.value ? "accent" : "secondary"}
              className={buttonClass}
            >
              <span className="text-[10px] uppercase tracking-[0.18em]">{option.label}</span>
              <span className="text-[11px] font-medium normal-case tracking-normal text-white/74">{option.description}</span>
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/42">
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{territoryWorkflowDueLabel(dueKind)}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{territoryWorkflowResponsibleLabel(responsible)}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{responsibleName || neighborhood || city}</span>
        </div>
      </form>
    </div>
  );
}