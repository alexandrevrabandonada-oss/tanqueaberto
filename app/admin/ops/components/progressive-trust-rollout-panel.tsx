"use client";

import { useTransition } from "react";
import { Shield, ToggleLeft, ToggleRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ProgressiveTrustRollout } from "@/lib/ops/progressive-trust";
import type { OperationalKillSwitches } from "@/lib/ops/kill-switches";
import { toggleKillSwitchAction, setProgressiveTrustFlagAction, setProgressiveTrustPhaseAction } from "../actions";

interface ProgressiveTrustRolloutPanelProps {
  rollout: ProgressiveTrustRollout;
  killSwitches: OperationalKillSwitches;
}

const phases = [
  { value: 1 as const, label: "Fase 1", description: "Shadow mode sem efeito operacional" },
  { value: 2 as const, label: "Fase 2", description: "Fast-lane ativa e revisão humana curta" },
  { value: 3 as const, label: "Fase 3", description: "Autoaprovação limitada e auditável" },
];

function ControlToggle({
  label,
  description,
  active,
  effective,
  onToggle,
  disabled,
}: {
  label: string;
  description: string;
  active: boolean;
  effective: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "flex items-center justify-between gap-4 rounded-[22px] border px-4 py-3 text-left transition",
        active ? "border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/10" : "border-white/8 bg-black/20",
        disabled ? "opacity-60 cursor-wait" : "hover:border-white/16"
      )}
    >
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-1 text-xs text-white/48">{description}</p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/34">Configurado: {active ? "ligado" : "desligado"} · Efetivo: {effective ? "ligado" : "desligado"}</p>
      </div>
      {active ? <ToggleRight className="h-8 w-8 text-[color:var(--color-accent)]" /> : <ToggleLeft className="h-8 w-8 text-white/32" />}
    </button>
  );
}

export function ProgressiveTrustRolloutPanel({ rollout, killSwitches }: ProgressiveTrustRolloutPanelProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-[28px] border border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/7 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--color-accent)]">Confiança progressiva</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Rollout operacional legível</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/56">Fase, fast-lane, autoaprovação e kill switch ficam controláveis aqui, sem depender de config obscura.</p>
        </div>
        <div className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs uppercase tracking-[0.18em]",
          rollout.killSwitchActive ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-white/10 bg-black/20 text-white/70"
        )}>
          <Shield className="h-4 w-4" />
          {rollout.killSwitchActive ? "Kill switch ativo" : "Motor operacional ativo"}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {phases.map((phase) => (
          <button
            key={phase.value}
            type="button"
            onClick={() => startTransition(async () => { await setProgressiveTrustPhaseAction(phase.value); })}
            disabled={isPending}
            className={cn(
              "rounded-[22px] border px-4 py-4 text-left transition",
              rollout.phase === phase.value ? "border-[color:var(--color-accent)] bg-black/30 text-white" : "border-white/8 bg-black/20 text-white/72 hover:border-white/16",
              isPending && "cursor-wait opacity-70"
            )}
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/36">{phase.label}</p>
            <p className="mt-2 text-base font-semibold">{phase.description}</p>
            <p className="mt-2 text-xs text-white/46">{rollout.phase === phase.value ? "fase atual" : "clique para tornar atual"}</p>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <ControlToggle
          label="Fast-lane"
          description="Mantém revisão curta para N2/N3 com risco controlado."
          active={rollout.configuredFastLaneEnabled}
          effective={rollout.fastLaneEnabled}
          disabled={isPending}
          onToggle={() => startTransition(async () => { await setProgressiveTrustFlagAction("fastLaneEnabled", !rollout.configuredFastLaneEnabled); })}
        />
        <ControlToggle
          label="Autoaprovação"
          description="Continua limitada; só entra em efeito operacional na Fase 3 e sem kill switch geral."
          active={rollout.configuredAutoApprovalEnabled}
          effective={rollout.autoApprovalEnabled}
          disabled={isPending}
          onToggle={() => startTransition(async () => { await setProgressiveTrustFlagAction("autoApprovalEnabled", !rollout.configuredAutoApprovalEnabled); })}
        />
        <ControlToggle
          label="Kill switch"
          description="Derruba o motor para revisão humana total sem novo deploy."
          active={killSwitches.disable_progressive_trust}
          effective={killSwitches.disable_progressive_trust}
          disabled={isPending}
          onToggle={() => startTransition(async () => { await toggleKillSwitchAction("disable_progressive_trust", !killSwitches.disable_progressive_trust); })}
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Fase atual</p>
          <p className="mt-2 text-lg font-semibold text-white">{rollout.phase}</p>
          <p className="mt-1 text-xs text-white/46">{rollout.label}</p>
        </div>
        <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Fast-lane efetiva</p>
          <p className="mt-2 text-lg font-semibold text-white">{rollout.fastLaneEnabled ? "Ligada" : "Desligada"}</p>
          <p className="mt-1 text-xs text-white/46">kill switch rápido: {killSwitches.disable_fast_lane ? "ativo" : "inativo"}</p>
        </div>
        <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Autoaprovação efetiva</p>
          <p className="mt-2 text-lg font-semibold text-white">{rollout.autoApprovalEnabled ? "Ligada" : "Desligada"}</p>
          <p className="mt-1 text-xs text-white/46">permanece auditável e restrita</p>
        </div>
        <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Modo de segurança</p>
          <p className="mt-2 text-lg font-semibold text-white">{rollout.shadowMode ? "Review-only" : "Operacional"}</p>
          <p className="mt-1 text-xs text-white/46">fase 2 segue como caminho principal quando não há override</p>
        </div>
      </div>
    </section>
  );
}