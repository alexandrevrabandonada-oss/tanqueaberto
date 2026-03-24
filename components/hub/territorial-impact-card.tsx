'use client';

import { Map, Trophy, Target, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollectorTerritorialImpact } from "@/lib/ops/recorte-activity";
import Link from "next/link";

interface TerritorialImpactCardProps {
  impact: CollectorTerritorialImpact;
}

export function TerritorialImpactCard({ impact }: TerritorialImpactCardProps) {
  if (!impact.primaryNeighborhood) return null;

  const density = Math.round(impact.territoryDensity);

  return (
    <div className="bg-[#111] border border-white/5 rounded-3xl p-5 overflow-hidden relative group">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-8 opacity-5 -mr-4 -mt-4 transition-transform group-hover:scale-110">
        <Map className="w-24 h-24" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Target className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 leading-none">Seu Domínio</h3>
            <p className="text-sm font-bold text-white leading-tight mt-1">{impact.primaryNeighborhood}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
           <div>
              <p className="text-[9px] text-white/20 uppercase font-bold mb-1">Impacto</p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-mono font-black tracking-tighter">{impact.stationsTouchedCount}</span>
                <span className="text-[9px] text-white/40 uppercase font-black tracking-tighter">postos</span>
              </div>
           </div>
           <div>
              <p className="text-[9px] text-white/20 uppercase font-bold mb-1">Presença</p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-mono font-black tracking-tighter text-blue-400">{density}%</span>
              </div>
           </div>
           <div className="border-l border-white/10 pl-3">
              <p className="text-[9px] text-[color:var(--color-accent)] uppercase font-bold mb-1 leading-none">Lacunas Fechadas</p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-mono font-black tracking-tighter text-[color:var(--color-accent)]">{impact.gapsClosedCount}</span>
              </div>
           </div>
        </div>

        {impact.remainingGaps > 0 ? (
          <Link 
            href={`/historico?city=${impact.primaryCity}&neighborhood=${impact.primaryNeighborhood}` as any}
            className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors active:scale-[0.98]"
          >
            <div className="flex items-center gap-2 text-[11px]">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-white/60">Ainda faltam <span className="text-white font-bold">{impact.remainingGaps} postos</span> aqui.</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-white/30" />
          </Link>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-green-500/5 border border-green-500/10 text-[11px] text-green-400/80 font-medium italic">
            <Trophy className="w-3.5 h-3.5" />
            Bairro totalmente iluminado por você!
          </div>
        )}
      </div>
    </div>
  );
}
