import { 
  getKillSwitches 
} from "@/lib/ops/kill-switches";
import { 
  getAuditGroups 
} from "@/lib/audit/groups";
import { 
  getCommandCenterHistory, 
  getCommandCenterState 
} from "../ops/actions";
import { 
  Zap, 
  Shield, 
  Activity, 
  Map as MapIcon, 
  History,
  AlertTriangle,
  Monitor,
  Radio,
  Sparkles
} from "lucide-react";
import { SystemHealthPulse } from "@/components/admin/command/system-health-pulse";
import { KillSwitchBoard } from "@/components/admin/command/kill-switch-board";
import { ActionableAlertList } from "@/components/admin/command/actionable-alert-list";
import { TerritorialCommandPanel } from "@/components/admin/command/territorial-command-panel";
import { RolloutRecommendationList } from "@/components/admin/command/rollout-recommendation-list";
import { OperationalSynthesis } from "@/components/admin/command/operational-synthesis";
import { CommandCenterScrollbar } from "@/components/admin/command/scrollbar-styles";
import { TriggerRolloutButton } from "../ops/components/trigger-rollout-button";
import { cn } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export default async function CommandCenterPage() {
  const [
    groups, 
    history, 
    ccState
  ] = await Promise.all([
    getAuditGroups(),
    getCommandCenterHistory(20),
    getCommandCenterState()
  ]);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 pb-20 font-sans selection:bg-blue-500/30">
      {/* HEADER DE COMANDO */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Radio className="w-5 h-5 text-blue-500 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">Command Center</h1>
              <p className="text-[10px] text-white/30 font-mono uppercase tracking-[0.2em] mt-1">Bomba Aberta Beta Ops / Real-time War Room</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
             <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Queue Pressure</p>
             <div className="flex items-center justify-end gap-2">
                <span className={cn(
                  "text-2xl font-mono font-black tracking-tighter leading-none",
                  ccState.moderationQueueCount > 20 ? "text-amber-500" : "text-white"
                )}>{ccState.moderationQueueCount}</span>
                <span className="text-[10px] text-white/50 uppercase font-bold">Pending</span>
             </div>
          </div>
          <div className="h-10 w-px bg-white/10" />
          <TriggerRolloutButton />
        </div>
      </header>

      {/* PULSO DE SAÚDE & SÍNTESE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 items-start">
        <div className="lg:col-span-4">
           <SystemHealthPulse signals={ccState.healthSignals} />
        </div>
        <div className="lg:col-span-8">
           <OperationalSynthesis synthesis={ccState.synthesis} />
        </div>
      </div>

      {/* GRID OPERACIONAL PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-320px)] min-h-[600px]">
        
        {/* COLUNA ESQUERDA: CONTROLE TERRITORIAL (3 cols) */}
        <div className="lg:col-span-3 h-full overflow-hidden flex flex-col gap-6">
          <div className="flex-1 overflow-hidden">
             <TerritorialCommandPanel groups={groups} />
          </div>
          <div className="h-48 overflow-hidden">
             <KillSwitchBoard killSwitches={ccState.killSwitches} />
          </div>
        </div>

        {/* COLUNA CENTRAL: ALERTAS & RECOMENDAÇÕES (6 cols) */}
        <div className="lg:col-span-6 h-full overflow-hidden flex flex-col gap-8">
          <div className="flex-1 overflow-hidden">
             <ActionableAlertList alerts={ccState.activeAlerts} />
          </div>
          <div className="flex-1 overflow-hidden border-t border-white/5 pt-8">
             <RolloutRecommendationList recommendations={ccState.territorialRecommendations} />
          </div>
        </div>

        {/* COLUNA DIREITA: LIVE FEED (3 cols) */}
        <div className="lg:col-span-3 h-full flex flex-col gap-8">
          
          <div className="h-1/2 bg-[#111] border border-white/5 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2 text-xs uppercase tracking-widest text-white/40">
                <History className="w-3 h-3" />
                Live Feed
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {history.map((log: any, i: number) => (
                <div key={i} className="flex gap-3 items-start border-l border-white/10 pl-4 py-0.5 relative group">
                  <div className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full bg-white/10 border border-[#050505] group-hover:bg-blue-500/50 transition-colors" />
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium leading-tight text-white/70 group-hover:text-white transition-colors">
                      {log.message}
                    </p>
                    <div className="flex gap-2 items-center">
                      <span className="text-[9px] text-white/20 font-mono">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[8px] bg-white/5 px-1 rounded text-white/30 uppercase font-black">
                        {log.actor_id}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <CommandCenterScrollbar />
    </div>
  );
}
