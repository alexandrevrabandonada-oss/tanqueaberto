"use client";

import { SectionCard } from "@/components/ui/section-card";
import { Zap, Send, Map as MapIcon, RotateCcw, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { trackProductEvent } from "@/lib/telemetry/client";

interface SmartActionsProps {
  localCount: number;
  hasMission: boolean;
  approvedCount: number;
  hasErrors: boolean;
  totalReports: number;
}

export function SmartActions({ localCount, hasMission, approvedCount, hasErrors, totalReports }: SmartActionsProps) {
  const handleTrack = (action: string) => {
    void trackProductEvent({
      eventType: "hub_action_clicked",
      pagePath: "/hub",
      pageTitle: "Meu Hub",
      payload: { action }
    });
  };

  return (
    <div className="grid grid-cols-1 gap-3">
       {hasErrors ? (
          <Link href="/enviar" onClick={() => handleTrack("resubmit_pendency")}>
            <SectionCard className="p-5 border-rose-500/40 bg-rose-500/10 flex items-center justify-between group active:scale-[0.98] transition-all">
               <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-2xl bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                     <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-rose-400">Atenção Necessária</p>
                    <p className="text-base font-bold">Corrigir {localCount} {localCount === 1 ? 'pendência' : 'pendências'}</p>
                  </div>
               </div>
               <ArrowRight className="w-5 h-5 text-rose-500 group-hover:translate-x-1 transition-transform" />
            </SectionCard>
          </Link>
       ) : localCount > 0 ? (
          <Link href="/enviar" onClick={() => handleTrack("send_stored")}>
            <SectionCard className="p-5 border-blue-500/40 bg-blue-500/10 flex items-center justify-between group active:scale-[0.98] transition-all">
               <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-2xl bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                     <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-blue-400">Fila Local</p>
                    <p className="text-base font-bold">Enviar {localCount} {localCount === 1 ? 'preço guardado' : 'preços guardados'}</p>
                  </div>
               </div>
               <ArrowRight className="w-5 h-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
            </SectionCard>
          </Link>
       ) : hasMission ? (
          <Link href="/enviar" onClick={() => handleTrack("resume_mission")}>
            <SectionCard className="p-5 border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent)]/10 flex items-center justify-between group active:scale-[0.98] transition-all">
               <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-2xl bg-[color:var(--color-accent)] text-black shadow-[0_0_20px_rgba(255,199,0,0.3)]">
                     <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-[color:var(--color-accent)]">Operação Ativa</p>
                    <p className="text-base font-bold">Continuar Missão de Rua</p>
                  </div>
               </div>
               <ArrowRight className="w-5 h-5 text-[color:var(--color-accent)] group-hover:translate-x-1 transition-transform" />
            </SectionCard>
          </Link>
        ) : totalReports === 0 ? (
           <Link href="/" onClick={() => handleTrack("first_step_click")}>
             <SectionCard className="p-5 border-blue-500/40 bg-blue-500/10 flex items-center justify-between group active:scale-[0.98] transition-all">
                <div className="flex items-center gap-4">
                   <div className="p-2.5 rounded-2xl bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                      <Zap className="w-5 h-5 flex-shrink-0" />
                   </div>
                   <div>
                     <p className="text-[11px] font-black uppercase tracking-widest text-blue-400 leading-none mb-1">Onboarding Ativo</p>
                     <p className="text-base font-bold leading-tight">Iluminar meu primeiro posto</p>
                   </div>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
             </SectionCard>
           </Link>
        ) : (
           <div className="grid grid-cols-2 gap-3">
             <Link href="/enviar" onClick={() => handleTrack("new_submission")}>
               <SectionCard className="p-4 border-white/10 bg-white/5 flex flex-col gap-3 group active:scale-[0.95] transition-all">
                   <div className="p-2 w-fit rounded-xl bg-white/10 text-white/70 group-hover:bg-[color:var(--color-accent)] group-hover:text-black transition-colors">
                      <Send className="w-4 h-4" />
                   </div>
                   <div>
                     <p className="text-[11px] font-black uppercase tracking-widest text-white/30 group-hover:text-[color:var(--color-accent)] transition-colors">Novo Envio</p>
                     <p className="text-xs font-bold leading-tight">Postos sem preço</p>
                   </div>
               </SectionCard>
             </Link>
             <Link href="/" onClick={() => handleTrack("explore_map")}>
               <SectionCard className="p-4 border-white/10 bg-white/5 flex flex-col gap-3 group active:scale-[0.95] transition-all">
                   <div className="p-2 w-fit rounded-xl bg-white/10 text-white/70 group-hover:bg-blue-400 group-hover:text-black transition-colors">
                      <MapIcon className="w-4 h-4" />
                   </div>
                   <div>
                     <p className="text-[11px] font-black uppercase tracking-widest text-white/30 group-hover:text-blue-400 transition-colors">Explorar</p>
                     <p className="text-xs font-bold leading-tight">Mapa por cidade</p>
                   </div>
               </SectionCard>
             </Link>
           </div>
        )}
    </div>
  );
}
