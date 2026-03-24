"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { type AuditStationGroup } from "@/lib/audit/types";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Pause, 
  Play, 
  Activity,
  ChevronRight,
  ShieldCheck,
  Info,
  Sparkles,
  CheckCircle,
  XCircle
} from "lucide-react";
import { 
  updateGroupRolloutAction, 
  acceptRolloutRecommendationAction, 
  rejectRolloutRecommendationAction 
} from "../actions";

interface RolloutControlProps {
  group: AuditStationGroup;
}

export function RolloutControl({ group }: RolloutControlProps) {
  const [isPending, startTransition] = useTransition();

  const [rolloutReason, setRolloutReason] = useState("");

  const handleStatusChange = (status: AuditStationGroup["releaseStatus"]) => {
    startTransition(() => {
      void updateGroupRolloutAction(group.slug, { 
        releaseStatus: status,
        rolloutNotes: rolloutReason ? `[MANUAL] ${rolloutReason}` : group.rolloutNotes ?? undefined
      });
      setRolloutReason("");
    });
  };

  const handleOpsStateChange = (state: AuditStationGroup["operationalState"]) => {
    startTransition(() => {
      void updateGroupRolloutAction(group.slug, { operationalState: state });
    });
  };

  const handleAcceptRecommendation = () => {
    if (!group.recommendedState) return;
    startTransition(() => {
      void acceptRolloutRecommendationAction(group.slug, group.recommendedState!, rolloutReason);
      setRolloutReason("");
    });
  };

  const handleRejectRecommendation = () => {
    startTransition(() => {
      void rejectRolloutRecommendationAction(group.slug, rolloutReason);
      setRolloutReason("");
    });
  };

  const statusColors = {
    ready: "text-green-400 bg-green-500/10 border-green-500/20",
    validating: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    limited: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    hidden: "text-white/30 bg-white/5 border-white/10"
  };

  // Parse metrics from notes if they exist (formatted as [MOTOR] reason | Confiança: ... | Sinais: ...)
  const motorSignals = group.rolloutNotes?.includes("[MOTOR]") 
    ? group.rolloutNotes.split("| Sinais: ")[1] 
    : null;

  return (
    <div className={cn(
      "p-4 rounded-2xl border bg-white/[0.02] border-white/5 space-y-4 transition-all duration-300",
      isPending && "opacity-70 grayscale shadow-inner"
    )}>
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-sm tracking-tight truncate">{group.name}</h4>
            <span className={cn(
               "text-[9px] uppercase font-black px-1.5 py-0.5 rounded border leading-none",
               statusColors[group.releaseStatus]
            )}>
              {group.releaseStatus}
            </span>
          </div>
          <p className="text-[10px] text-white/40 truncate">{group.city || "Região não definida"}</p>
        </div>
        
        <div className="flex gap-1">
          <button 
            onClick={() => handleStatusChange("ready")}
            title="Promover para READY"
            className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-green-500/20 hover:text-green-400"
          >
            <ArrowUpCircle className="w-4 h-4" />
          </button>
           <button 
            onClick={() => handleStatusChange("limited")}
            title="Recuar para LIMITED"
            className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-red-500/20 hover:text-red-400"
          >
            <ArrowDownCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
         <input 
            type="text"
            placeholder="Motivo da alteração territorial..."
            value={rolloutReason}
            onChange={(e) => setRolloutReason(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/30"
         />
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
        <div className="space-y-1.5">
           <span className="text-[9px] text-white/20 uppercase font-bold tracking-widest">Estado Operacional</span>
           <div className="flex flex-wrap gap-1">
              <StateBtn 
                active={group.operationalState === "beta_open"} 
                onClick={() => handleOpsStateChange("beta_open")}
                label="BETA" 
                icon={<Play className="w-2.5 h-2.5" />}
              />
              <StateBtn 
                active={group.operationalState === "monitoring"} 
                onClick={() => handleOpsStateChange("monitoring")}
                label="MONIT" 
                icon={<Activity className="w-2.5 h-2.5" />}
              />
              <StateBtn 
                active={group.operationalState === "rollback"} 
                onClick={() => handleOpsStateChange("rollback")}
                label="RECALL" 
                icon={<ArrowDownCircle className="w-2.5 h-2.5" />}
                variant="danger"
              />
           </div>
        </div>

        <div className="space-y-1.5 pl-2 border-l border-white/5">
           <span className="text-[9px] text-white/20 uppercase font-bold tracking-widest">Visibilidade</span>
           <div className="flex gap-2 items-center h-full">
              <button 
                onClick={() => startTransition(() => { void updateGroupRolloutAction(group.slug, { isPublished: !group.isPublished }); })}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                  group.isPublished 
                    ? "bg-green-500/20 text-green-400 border border-green-500/20" 
                    : "bg-white/5 text-white/40 border border-white/10"
                )}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {group.isPublished ? "PÚBLICO" : "INTERNO"}
              </button>
           </div>
        </div>
      </div>
      
      {group.recommendedState && group.recommendedState !== group.releaseStatus && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-3">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-500">
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Recomendação Territorial</span>
              </div>
              {motorSignals && (
                <div className="flex items-center gap-1 text-[9px] font-black text-amber-500/40">
                   <Activity className="w-3 h-3" />
                   {motorSignals}
                </div>
              )}
           </div>
           
           <p className="text-[11px] font-medium leading-relaxed">
             O motor sugere <span className="font-black underline uppercase">{group.recommendedState}</span> para este território.
           </p>

           {group.rolloutNotes?.includes("[MOTOR]") && (
             <div className="bg-black/20 rounded-lg p-2 flex gap-2 items-start">
               <Info className="w-3 h-3 text-amber-500/40 mt-0.5 shrink-0" />
               <p className="text-[9px] text-white/40 leading-normal">{group.rolloutNotes.split("|")[0].replace("[MOTOR]", "").trim()}</p>
             </div>
           )}

           <div className="flex gap-2 font-black uppercase tracking-tighter">
              <button 
                onClick={handleAcceptRecommendation}
                disabled={isPending}
                className="flex-1 bg-amber-500 text-black px-3 py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Aceitar
              </button>
              <button 
                onClick={handleRejectRecommendation}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg text-[10px] border border-white/10 text-white/40 hover:bg-white/5 disabled:opacity-50"
              >
                 Ignorar
              </button>
           </div>
        </div>
      )}

      {!group.recommendedState && group.rolloutNotes && (
        <div className="bg-white/5 rounded-lg p-2 flex gap-2 items-start">
           <Info className="w-3 h-3 text-white/30 mt-0.5 shrink-0" />
           <p className="text-[9px] text-white/40 leading-normal line-clamp-2">{group.rolloutNotes}</p>
        </div>
      )}
    </div>
  );
}

function StateBtn({ active, onClick, label, icon, variant = "normal" }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-1.5 py-1 rounded-md text-[9px] font-black tracking-tighter transition-all",
        active 
          ? variant === "danger" 
            ? "bg-red-500 text-white" 
            : "bg-white/90 text-black" 
          : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
