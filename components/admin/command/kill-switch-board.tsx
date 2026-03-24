'use client';

import { Shield, Zap, Info } from "lucide-react";
import { KillSwitchToggle } from "@/app/admin/ops/components/kill-switch-toggle";
import { OperationalKillSwitches } from "@/lib/ops/kill-switches";

interface KillSwitchBoardProps {
  killSwitches: OperationalKillSwitches;
}

export function KillSwitchBoard({ killSwitches }: KillSwitchBoardProps) {
  return (
    <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden h-full">
      <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" />
          Mesa de Kill Switches
        </h2>
        <Zap className="w-3 h-3 text-amber-500/50" />
      </div>
      <div className="p-4 space-y-3">
        <KillSwitchToggle 
          label="Missão de Rua" 
          description="Bloqueia início de novas missões."
          switchKey="disable_mission_mode"
          active={killSwitches.disable_mission_mode}
        />
        <KillSwitchToggle 
          label="Sugestões Auto" 
          description="Desativa motor de recomendação."
          switchKey="disable_auto_suggestions"
          active={killSwitches.disable_auto_suggestions}
        />
        <KillSwitchToggle 
          label="Widgets Pesados" 
          description="Remove componentes intensos."
          switchKey="disable_heavy_territorial_widgets"
          active={killSwitches.disable_heavy_territorial_widgets}
        />
        <KillSwitchToggle 
          label="PWA Prompts" 
          description="Esconde banners de instalação."
          switchKey="disable_pwa_prompts"
          active={killSwitches.disable_pwa_prompts}
        />
        <KillSwitchToggle 
          label="Fast Lane Mod" 
          description="Trava prioridade de moderação."
          switchKey="disable_fast_lane"
          active={killSwitches.disable_fast_lane}
        />
        
        <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex gap-3 items-start">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-blue-200/50 leading-relaxed italic">
            Alterações refletem em tempo real no app via revalidação de cache.
          </p>
        </div>
      </div>
    </div>
  );
}
