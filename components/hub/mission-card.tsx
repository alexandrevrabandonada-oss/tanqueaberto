"use client";

import { SectionCard } from "@/components/ui/section-card";
import { type MissionState } from "@/hooks/use-mission";
import { MapPinned, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface MissionCardProps {
  mission: MissionState;
  stats: any;
}

export function MissionCard({ mission, stats }: MissionCardProps) {
  return (
    <Link href="/enviar">
      <SectionCard className="p-4 border-[color:var(--color-accent)]/20 bg-gradient-to-br from-[color:var(--color-accent)]/10 to-transparent hover:from-[color:var(--color-accent)]/15 transition-all group overflow-hidden relative">
        <div className="relative z-10 flex justify-between items-center">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[color:var(--color-accent)] text-black shadow-[0_0_15px_rgba(255,199,0,0.3)]">
                <MapPinned className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-[color:var(--color-accent)]">Missão em Curso</p>
                <h3 className="text-sm font-bold text-white">{mission.groupName}</h3>
              </div>
            </div>

            <div className="space-y-1.5">
               <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter">
                  <span className="text-white/40">Progresso</span>
                  <span className="text-[color:var(--color-accent)]">{stats.completed} / {stats.total}</span>
               </div>
               <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-[color:var(--color-accent)] transition-all duration-1000 shadow-[0_0_10px_rgba(255,199,0,0.4)]"
                    style={{ width: `${Math.round((stats.completed / stats.total) * 100)}%` }}
                  />
               </div>
            </div>
          </div>
          
          <div className="pl-4">
             <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5 group-hover:bg-[color:var(--color-accent)] group-hover:text-black transition-all">
                <ChevronRight className="w-5 h-5" />
             </div>
          </div>
        </div>

        {/* Decorative background logo */}
        <MapPinned className="absolute -bottom-4 -right-4 h-24 w-24 text-[color:var(--color-accent)]/5 -rotate-12 pointer-events-none" />
      </SectionCard>
    </Link>
  );
}
