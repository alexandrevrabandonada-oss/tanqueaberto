import { ArrowRight, History, MessageSquare, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface RolloutLog {
  id: string;
  group_id: string;
  previous_state: string;
  new_state: string;
  change_kind: 'automated' | 'manual_override';
  reason: string;
  created_at: string;
  audit_station_groups?: {
    name: string;
  };
}

interface RolloutHistoryPanelProps {
  logs: RolloutLog[];
}

export function RolloutHistoryPanel({ logs }: RolloutHistoryPanelProps) {
  if (logs.length === 0) {
    return (
      <div className="bg-white/5 border border-white/5 rounded-2xl p-8 text-center">
        <History className="w-8 h-8 text-white/10 mx-auto mb-2" />
        <p className="text-xs text-white/40">Nenhum histórico de rollout registrado.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-2 text-sm">
          <History className="w-4 h-4 text-blue-400" />
          Histórico Territorial
        </h2>
      </div>
      <div className="p-4 space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar">
        {logs.map((log) => (
          <div key={log.id} className="relative pl-6 border-l border-white/10 space-y-2">
            <div className={cn(
               "absolute -left-[5px] top-0 w-2 h-2 rounded-full border border-[#111]",
               log.change_kind === 'automated' ? "bg-amber-500" : "bg-blue-500"
            )} />
            
            <div className="flex justify-between items-start gap-4">
               <div>
                  <h4 className="text-[11px] font-black uppercase tracking-tight text-white/80">
                    {log.audit_station_groups?.name || "Recorte Desconhecido"}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-bold text-white/40 uppercase">{log.previous_state}</span>
                    <ArrowRight className="w-2.5 h-2.5 text-white/20" />
                    <span className="text-[9px] font-black text-white uppercase">{log.new_state}</span>
                  </div>
               </div>
               <span className="text-[8px] text-white/20 font-mono">
                 {new Date(log.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </span>
            </div>

            <div className="bg-white/[0.03] rounded-lg p-2 flex gap-2 items-start">
               {log.change_kind === 'automated' ? (
                 <Info className="w-3 h-3 text-amber-500/40 mt-0.5 shrink-0" />
               ) : (
                 <MessageSquare className="w-3 h-3 text-blue-500/40 mt-0.5 shrink-0" />
               )}
               <p className="text-[10px] text-white/50 leading-normal italic line-clamp-2">
                 {log.reason}
               </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
