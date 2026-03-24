'use client';

import { Activity, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { SystemHealthSignal } from "@/lib/ops/command-center-types";

interface SystemHealthPulseProps {
  signals: SystemHealthSignal[];
}

export function SystemHealthPulse({ signals }: SystemHealthPulseProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {signals.map((signal) => (
        <div 
          key={signal.id} 
          className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-2 h-2 rounded-full",
              signal.status === 'healthy' ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
              signal.status === 'degraded' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
              "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
            )} />
            <div>
              <p className="text-[10px] text-white/30 uppercase font-black tracking-widest leading-none mb-1">
                {signal.label}
              </p>
              <p className="text-xl font-mono font-bold tracking-tighter leading-none">
                {signal.value}
              </p>
            </div>
          </div>
          
          {signal.trend && (
             <div className={cn(
               "text-[10px] font-bold px-1.5 py-0.5 rounded",
               signal.trend === 'up' ? "bg-green-500/10 text-green-500" :
               signal.trend === 'down' ? "bg-red-500/10 text-red-500" :
               "bg-white/5 text-white/40"
             )}>
               {signal.trend.toUpperCase()}
             </div>
          )}
        </div>
      ))}
    </div>
  );
}
