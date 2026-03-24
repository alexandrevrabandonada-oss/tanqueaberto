"use client";

import React, { useEffect, useState } from "react";
import { Shield, Star, Award, Zap, Clock, CheckCircle2 } from "lucide-react";
import { useMySubmissions } from "@/hooks/use-my-submissions";
import { getUtilityStatusAction } from "@/app/actions/user";
import type { UtilityStatus, CollectorTrust } from "@/lib/ops/collector-trust";
import { cn } from "@/lib/utils";

interface UtilityStatusCardProps {
  unreadCount?: number;
}

export function UtilityStatusCard({ unreadCount = 0 }: UtilityStatusCardProps) {
  const { reporterNickname } = useMySubmissions();
  const [data, setData] = useState<{ trust: CollectorTrust; status: UtilityStatus } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStatus() {
      // For anonymous users, we'd need their IP hash from a client-side utility
      // For now, if we have nickname, we fetch. If not, we show default 'iniciante'
      const result = await getUtilityStatusAction(reporterNickname, null);
      if (result) {
        setData(result);
      }
      setLoading(false);
    }
    loadStatus();
  }, [reporterNickname]);

  if (loading) return (
    <div className="h-32 w-full animate-pulse rounded-[28px] bg-white/5 border border-white/10" />
  );

  const status = data?.status || {
    role: 'iniciante',
    label: 'Coletor Iniciante',
    description: 'Começando a jornada de transparência territorial.',
    nextStep: 'Realize seu primeiro envio para validar o status.',
    color: 'blue'
  };

  const trust = data?.trust;

  const colorMap: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    green: "text-green-400 bg-green-500/10 border-green-500/20",
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  const iconMap: Record<string, React.ReactNode> = {
    iniciante: <Zap className="h-5 w-5" />,
    ativo: <Award className="h-5 w-5" />,
    senior: <Shield className="h-5 w-5" />,
    revisão: <Clock className="h-5 w-5" />,
    bloqueado: <Shield className="h-5 w-5" />,
  };

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/12 bg-black/40 p-5 shadow-2xl backdrop-blur-xl">
      {/* Background Glow */}
      <div className={cn(
        "absolute -right-12 -top-12 h-32 w-32 rounded-full blur-[60px] opacity-20",
        status.color === 'blue' && "bg-blue-500",
        status.color === 'green' && "bg-green-500",
        status.color === 'indigo' && "bg-indigo-500",
        status.color === 'amber' && "bg-amber-500",
      )} />

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest mb-3",
            colorMap[status.color]
          )}>
            {iconMap[status.role]}
            {status.label}
          </div>
          <p className="text-sm font-semibold text-white/90 leading-tight pr-4">
            {status.description}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
           <div className="relative">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Utilidade</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                   <Star className="h-3.5 w-3.5 text-amber-500" />
                   <span className="text-lg font-black text-white">{trust?.streakDays || 0}d</span>
                </div>
              </div>
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-[9px] font-black text-black shadow-lg shadow-[color:var(--color-accent)]/20 animate-bounce">
                  {unreadCount}
                </div>
              )}
           </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3">
          <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-1">Impacto</p>
          <div className="flex items-center gap-2 text-white">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span className="text-xs font-bold">{trust?.approvedReports || 0} Lacunas Fechadas</span>
          </div>
        </div>
        
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3">
           <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-1">Próximo Nível</p>
           <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mt-2">
              <div 
                className="h-full bg-[color:var(--color-accent)] transition-all duration-1000" 
                style={{ width: `${Math.min(100, (trust?.score || 50))}%` }} 
              />
           </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[color:var(--color-accent)]/10 border border-[color:var(--color-accent)]/20 p-3">
        <div className="rounded-full bg-[color:var(--color-accent)] p-1">
           <Zap className="h-3 w-3 text-black" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase text-[color:var(--color-accent)] tracking-widest">Status de Ação</p>
          <p className="text-[11px] font-bold text-white/80">{status.nextStep}</p>
        </div>
      </div>
    </div>
  );
}
