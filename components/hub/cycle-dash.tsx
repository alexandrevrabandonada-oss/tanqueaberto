"use client";

import { SectionCard } from "@/components/ui/section-card";
import { Smartphone, History, ShieldCheck, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CycleDashProps {
  approvedCount: number;
  pendingCount: number;
  localCount: number;
  hasMission: boolean;
}

export function CycleDash({ approvedCount, pendingCount, localCount, hasMission }: CycleDashProps) {
  const steps = [
    { 
      id: 'local', 
      label: 'No aparelho', 
      count: localCount, 
      icon: <Smartphone className="w-3 h-3" />,
      color: localCount > 0 ? "text-blue-400 border-blue-500/30 bg-blue-500/10" : "text-white/20 border-white/5"
    },
    { 
      id: 'pending', 
      label: 'Moderação', 
      count: pendingCount, 
      icon: <History className="w-3 h-3" />,
      color: pendingCount > 0 ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-white/20 border-white/5"
    },
    { 
      id: 'approved', 
      label: 'Aprovados', 
      count: approvedCount, 
      icon: <ShieldCheck className="w-3 h-3" />,
      color: approvedCount > 0 ? "text-green-400 border-green-500/30 bg-green-500/10" : "text-white/20 border-white/5"
    }
  ];

  return (
    <SectionCard className="p-4 bg-black/40 border-white/5 overflow-hidden relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30">Ciclo do Coletor</h3>
        {hasMission && (
          <div className="flex items-center gap-1 text-[9px] font-bold text-[color:var(--color-accent)] animate-pulse">
            <div className="w-1 h-1 rounded-full bg-[color:var(--color-accent)]" />
            Missão Ativa
          </div>
        )}
      </div>

      <div className="relative">
        {/* Connector Line */}
        <div className="absolute top-[18px] left-8 right-8 h-[1px] bg-white/5 -z-0" />
        
        <div className="flex justify-between items-start relative z-10">
          {steps.map((step, i) => (
            <div key={step.id} className="flex flex-col items-center gap-2 group">
              <div className={cn(
                "w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-500",
                step.color
              )}>
                {step.icon}
              </div>
              <div className="text-center">
                <p className={cn(
                  "text-[14px] font-bold transition-colors",
                  step.count > 0 ? "text-white" : "text-white/20"
                )}>{step.count}</p>
                <p className="text-[8px] uppercase font-black tracking-tighter text-white/30 whitespace-nowrap">{step.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
