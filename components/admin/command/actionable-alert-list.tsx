'use client';

import { AlertTriangle, Zap, CheckCircle2, ChevronRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { OperationalAlert } from "@/lib/ops/alerts";

interface ActionableAlertListProps {
  alerts: OperationalAlert[];
}

export function ActionableAlertList({ alerts }: ActionableAlertListProps) {
  return (
    <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-2">
          <AlertTriangle className={cn(
            "w-4 h-4",
            alerts.some(a => a.severity === 'critical') ? "text-red-500 animate-pulse" : "text-amber-400"
          )} />
          Alertas Acionáveis
        </h2>
        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/70">
          {alerts.length} ativos
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {alerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
            <p className="text-sm font-medium">Nenhuma regressão ativa.</p>
            <p className="text-[11px]">Sistema operando dentro dos parâmetros.</p>
          </div>
        ) : (
          alerts.map((alert, i) => (
            <div 
              key={i} 
              className={cn(
                "group p-4 rounded-2xl border transition-all duration-300",
                alert.severity === 'critical' 
                  ? "bg-red-500/[0.03] border-red-500/20 hover:border-red-500/40" 
                  : "bg-amber-500/[0.03] border-amber-500/20 hover:border-amber-500/40"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm",
                    alert.severity === 'critical' ? "bg-red-500 text-white" : "bg-amber-500 text-black"
                  )}>
                    {alert.severity}
                  </span>
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-tighter">
                    {alert.module || 'Geral'}
                  </span>
                </div>
                <span className="text-[10px] text-white/20">
                  {alert.alertKind}
                </span>
              </div>
              
              <h3 className="text-sm font-bold leading-snug mb-1">{alert.message}</h3>
              
              {alert.city && (
                <div className="flex items-center gap-1.5 text-[10px] text-white/40 mb-3">
                  <MapPin className="w-3 h-3" />
                  <span>{alert.city} {alert.scopeId && `(${alert.scopeId})`}</span>
                </div>
              )}

              {alert.cause && (
                <p className="text-[10px] text-white/40 leading-relaxed mb-4">
                  <span className="text-white/20 font-bold uppercase mr-1">Causa:</span>
                  {alert.cause}
                </p>
              )}

              {alert.suggestedAction && (
                <button className={cn(
                  "w-full p-2.5 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold transition-all",
                  alert.severity === 'critical'
                    ? "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/10"
                    : "bg-amber-500 text-black hover:bg-amber-600 shadow-lg shadow-amber-500/10"
                )}>
                  <Zap className="w-3 h-3 fill-current" />
                  {alert.suggestedAction}
                  <ChevronRight className="w-3 h-3 ml-auto opacity-50" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
