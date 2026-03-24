'use client';

import { Map as MapIcon, ArrowUpCircle, ArrowDownCircle, Info, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuditStationGroup } from "@/lib/audit/types";
import { updateGroupRolloutAction } from "@/app/admin/ops/actions";
import { useTransition } from "react";

interface TerritorialCommandPanelProps {
  groups: AuditStationGroup[];
}

export function TerritorialCommandPanel({ groups }: TerritorialCommandPanelProps) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = async (slug: string, newStatus: any, state: any) => {
    startTransition(async () => {
      await updateGroupRolloutAction(slug, { 
        releaseStatus: newStatus,
        operationalState: state,
        rolloutNotes: `Alteração rápida via Command Center`
      });
    });
  };

  return (
    <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-2">
          <MapIcon className="w-4 h-4 text-green-400" />
          Comando Territorial
        </h2>
        <div className="flex gap-2 text-[10px] text-white/30">
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Aberto</span>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Beta</span>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Teste</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {groups.map((group) => {
          const isReady = group.releaseStatus === 'ready';
          const isBeta = group.releaseStatus === 'validating';
          const isLimited = group.releaseStatus === 'limited';

          return (
            <div 
              key={group.id} 
              className={cn(
                "p-3 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between group/row transition-all",
                isReady ? "border-green-500/10 hover:border-green-500/30" :
                isBeta ? "border-blue-500/10 hover:border-blue-500/30" :
                "hover:border-white/10"
              )}
            >
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-0.5">
                   <p className="text-[11px] font-bold truncate leading-none">{group.name}</p>
                   <span className={cn(
                     "text-[8px] font-black px-1 py-0.5 rounded leading-none uppercase",
                     isReady ? "bg-green-500/20 text-green-400" :
                     isBeta ? "bg-blue-500/20 text-blue-400" :
                     isLimited ? "bg-amber-500/20 text-amber-400" :
                     "bg-white/10 text-white/40"
                   )}>
                     {group.releaseStatus || 'N/A'}
                   </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-white/20">
                  <span className="truncate">{group.city}</span>
                  <span className="text-[8px] opacity-30">•</span>
                  <span className="font-mono text-[9px] uppercase tracking-tighter">{group.operationalState || 'idle'}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-20 group-hover/row:opacity-100 transition-opacity">
                {group.releaseStatus !== 'ready' && (
                  <button 
                    disabled={isPending}
                    onClick={() => handleStatusChange(group.slug, 'ready', 'beta_open')}
                    className="p-1.5 text-green-500/50 hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                    title="Promover para Aberto"
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                  </button>
                )}
                
                {group.releaseStatus === 'ready' && (
                   <button 
                    disabled={isPending}
                    onClick={() => handleStatusChange(group.slug, 'validating', 'monitoring')}
                    className="p-1.5 text-amber-500/50 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                    title="Recuar para Beta"
                  >
                    <ArrowDownCircle className="w-4 h-4" />
                  </button>
                )}

                <button 
                  disabled={isPending}
                  className="p-1.5 text-white/20 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Configuração Detalhada"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
