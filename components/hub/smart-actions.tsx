"use client";

import { SectionCard } from "@/components/ui/section-card";
import { Zap, Send, Map as MapIcon, RotateCcw } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SmartActionsProps {
  localCount: number;
  hasMission: boolean;
  approvedCount: number;
}

export function SmartActions({ localCount, hasMission, approvedCount }: SmartActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
       {localCount > 0 ? (
          <Link href="/enviar" className="col-span-2">
            <SectionCard className="p-4 border-amber-500/40 bg-amber-500/10 flex items-center justify-between group active:scale-[0.98] transition-all">
               <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500 text-black">
                     <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-amber-500">Pendências</p>
                    <p className="text-sm font-bold">Reenviar {localCount} {localCount === 1 ? 'preço' : 'preços'}</p>
                  </div>
               </div>
               <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
            </SectionCard>
          </Link>
       ) : hasMission ? (
          <Link href="/enviar" className="col-span-2">
            <SectionCard className="p-4 border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent)]/10 flex items-center justify-between group active:scale-[0.98] transition-all">
               <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[color:var(--color-accent)] text-black">
                     <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-[color:var(--color-accent)]">Em Curso</p>
                    <p className="text-sm font-bold">Continuar Missão</p>
                  </div>
               </div>
               <Zap className="w-5 h-5 text-[color:var(--color-accent)] animate-pulse" />
            </SectionCard>
          </Link>
       ) : (
          <>
            <Link href="/enviar">
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
            <Link href="/">
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
          </>
       )}
    </div>
  );
}
