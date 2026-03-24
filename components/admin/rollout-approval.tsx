"use client";

import { useState } from "react";
import { Zap, Target, ArrowUpRight, ArrowDownRight, Check, X, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { handleRolloutApproval } from "@/app/admin/ops/rollout-actions";
import { type RolloutRecommendation } from "@/lib/ops/rollout-engine";
import { cn } from "@/lib/utils";

interface RolloutApprovalProps {
  recommendations: RolloutRecommendation[];
}

export function RolloutApproval({ recommendations }: RolloutApprovalProps) {
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  if (recommendations.length === 0) return null;

  const handleApply = async (rec: RolloutRecommendation) => {
    setPendingIds(prev => [...prev, rec.groupId]);
    try {
      await handleRolloutApproval(
        rec.groupId,
        rec.recommendedState,
        'automated',
        rec.reason
      );
    } catch (err) {
      console.error("Failed to apply rollout change", err);
    } finally {
      setPendingIds(prev => prev.filter(id => id !== rec.groupId));
    }
  };

  return (
    <SectionCard className="space-y-6 border-l-4 border-l-blue-500 bg-blue-500/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Promoção Territorial Sugerida</h2>
        </div>
        <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
          {recommendations.length} {recommendations.length === 1 ? 'sugestão' : 'sugestões'}
        </Badge>
      </div>

      <div className="grid gap-4">
        {recommendations.map((rec) => {
          // Status order for comparison: hidden < limited < validating < ready
          const statusOrder: Record<string, number> = { 
            hidden: 0, 
            captura_interna: 0,
            limited: 1, 
            validacao_beta: 2,
            validating: 2,
            ready: 3,
            publicado: 3,
            monitoramento: 4,
            rollback: -1
          };
          const isImproving = statusOrder[rec.recommendedState] > statusOrder[rec.currentStatus];
          const isPending = pendingIds.includes(rec.groupId);

          return (
            <div 
              key={rec.groupId}
              className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-white/20"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white">{rec.name}</h3>
                    {isImproving ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-rose-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-white/40 uppercase tracking-wider">{rec.currentStatus}</span>
                    <span className="text-white/20">→</span>
                    <span className={cn(
                      "font-bold uppercase tracking-wider",
                      isImproving ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {rec.recommendedState}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="primary" 
                    className="h-8 gap-2 bg-blue-600 hover:bg-blue-500 text-xs px-3"
                    onClick={() => handleApply(rec)}
                    disabled={isPending}
                  >
                    {isPending ? <Zap className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    {isImproving ? "Promover" : "Recuar"}
                  </Button>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <X className="h-4 w-4 text-white/40" />
                  </Button>
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-white/70">
                <p className="font-semibold text-white/90 mb-1 flex items-center gap-1">
                  <Info className="h-3 w-3 text-blue-400" /> Motivo:
                </p>
                {rec.reason}
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                 <div className="flex flex-col">
                    <span className="text-[10px] text-white/30 uppercase">Aprovados (7d)</span>
                    <span className="text-xs font-mono text-white/70">{rec.metrics.approvedCount}</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] text-white/30 uppercase">SLA (h)</span>
                    <span className="text-xs font-mono text-white/70">{rec.metrics.slaHours.toFixed(1)}h</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] text-white/30 uppercase">Cobertura</span>
                    <span className="text-xs font-mono text-emerald-400">{(rec.metrics.coveragePct * 100).toFixed(0)}%</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] text-white/30 uppercase">Abandono</span>
                    <span className="text-xs font-mono text-white/70">{(rec.metrics.abandonmentRate * 100).toFixed(0)}%</span>
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
