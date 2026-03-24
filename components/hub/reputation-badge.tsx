"use client";

import { ShieldCheck, Trophy, AlertCircle, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrustStage } from "@/lib/ops/collector-trust";

interface ReputationBadgeProps {
  stage: TrustStage;
  score: number;
}

export function ReputationBadge({ stage, score }: ReputationBadgeProps) {
  const configs: Record<TrustStage, { label: string, icon: any, color: string, bg: string, message: string }> = {
    'novo': {
      label: 'Novo Coletor',
      icon: <Info className="w-3 h-3" />,
      color: 'text-white/40',
      bg: 'bg-white/5 border-white/10',
      message: 'Comece a enviar para subir sua reputação.'
    },
    'confiável': {
      label: 'Confiável',
      icon: <ShieldCheck className="w-3 h-3" />,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      message: 'Seus envios estão ajudando muito a comunidade!'
    },
    'muito_confiável': {
      label: 'Muito Confiável',
      icon: <Trophy className="w-3 h-3" />,
      color: 'text-green-400',
      bg: 'bg-green-500/10 border-green-500/20',
      message: 'Elite! Suas fotos e preços são referência de qualidade.'
    },
    'em_revisão': {
      label: 'Em Revisão',
      icon: <AlertCircle className="w-3 h-3" />,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      message: 'Alguns envios divergiram. Revise sua precisão.'
    },
    'bloqueado': {
      label: 'Bloqueado',
      icon: <AlertCircle className="w-3 h-3" />,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
      message: 'Acesso restrito por recorrência de erros.'
    }
  };

  const config = configs[stage] || configs['novo'];

  return (
    <div className={cn(
      "p-3 rounded-2xl border flex items-start gap-3 transition-all duration-500",
      config.bg
    )}>
      <div className={cn("mt-0.5 shrink-0", config.color)}>
        {config.icon}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
           <span className={cn("text-[9px] font-black uppercase tracking-widest", config.color)}>
             {config.label}
           </span>
           <div className="flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded text-[8px] font-bold text-white/40">
              <Sparkles className="w-2.5 h-2.5" />
              Score: {score}
           </div>
        </div>
        <p className="text-[11px] font-medium text-white/60 leading-tight">
          {config.message}
        </p>
      </div>
    </div>
  );
}
