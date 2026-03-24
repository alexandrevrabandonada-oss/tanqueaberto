'use client';

import { useState } from "react";
import { TrendingUp, TrendingDown, Eye, Check, X, MessageSquare, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { type RolloutRecommendation } from "@/lib/ops/rollout-engine";
import { processRolloutRecommendationAction } from "@/app/admin/ops/actions";

interface RolloutRecommendationListProps {
  recommendations: RolloutRecommendation[];
}

export function RolloutRecommendationList({ recommendations }: RolloutRecommendationListProps) {
  const [processing, setProcessing] = useState<string | null>(null);

  const handleAction = async (rec: RolloutRecommendation, action: 'accept' | 'reject') => {
    const notes = window.prompt(
      action === 'accept' 
        ? `Confirmar promoção/recuo para ${rec.city}? Deixe um comentário:` 
        : `Por que rejeitar a recomendação para ${rec.city}?`
    );

    if (notes === null) return;

    setProcessing(rec.id);
    try {
      await processRolloutRecommendationAction(
        rec.id, 
        rec.groupSlug, 
        action, 
        notes, 
        rec.suggestedStage
      );
    } catch (error) {
       console.error("Failed to process recommendation", error);
       alert("Erro ao processar decisão territorial.");
    } finally {
      setProcessing(null);
    }
  };

  if (recommendations.length === 0) {
    return (
      <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center opacity-40">
        <Check className="w-8 h-8 mb-3 text-green-500/50" />
        <p className="text-xs font-medium">Bomba estável. Sem recomendações de rollout pendentes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
           <MapPin className="w-4 h-4 text-emerald-500" />
           <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">Recomendações Territoriais</h3>
        </div>
        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full uppercase">
          {recommendations.length} pendentes
        </span>
      </div>

      <div className="grid gap-3">
        {recommendations.map((rec) => (
          <div 
            key={rec.id}
            className={cn(
              "bg-[#0d0d0d] border rounded-[2rem] p-5 transition-all duration-300",
              rec.suggestedAction === 'promote' ? "border-emerald-500/20 hover:border-emerald-500/40" :
              rec.suggestedAction === 'demote' ? "border-red-500/20 hover:border-red-500/40" :
              "border-white/5 hover:border-white/10"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                   {rec.suggestedAction === 'promote' ? (
                     <div className="bg-emerald-500/20 text-emerald-500 p-1.5 rounded-xl">
                       <TrendingUp className="w-3.5 h-3.5" />
                     </div>
                   ) : rec.suggestedAction === 'demote' ? (
                     <div className="bg-red-500/20 text-red-500 p-1.5 rounded-xl">
                       <TrendingDown className="w-3.5 h-3.5" />
                     </div>
                   ) : (
                     <div className="bg-blue-500/20 text-blue-500 p-1.5 rounded-xl">
                       <Eye className="w-3.5 h-3.5" />
                     </div>
                   )}
                   <div>
                     <span className="text-xs font-black text-white">{rec.city}</span>
                     <span className="text-[10px] text-white/30 ml-2 uppercase font-bold tracking-tight">{rec.groupSlug}</span>
                   </div>
                </div>
                
                <h4 className="text-sm font-bold text-white/90 mb-1">
                  {rec.suggestedAction === 'promote' ? 'Sugerir Promoção' : rec.suggestedAction === 'demote' ? 'Sugerir Recuo' : 'Monitorar'}
                </h4>
                <p className="text-[11px] text-white/40 leading-relaxed mb-4 italic">
                  &ldquo;{rec.reason}&rdquo;
                </p>

                <div className="flex flex-wrap gap-2">
                   <MetricBadge label="Cobertura" value={`${Math.round(rec.signals.coveragePercent)}%`} />
                   <MetricBadge label="Confiança" value={`${rec.confidence}%`} />
                   <MetricBadge label="Atividade" value={rec.signals.activityScore} />
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  disabled={!!processing}
                  onClick={() => handleAction(rec, 'accept')}
                  className={cn(
                    "w-24 py-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-[10px] font-black uppercase transition-all active:scale-95",
                    rec.suggestedAction === 'promote' ? "bg-emerald-600 hover:bg-emerald-500 text-white" :
                    rec.suggestedAction === 'demote' ? "bg-red-600 hover:bg-red-500 text-white" :
                    "bg-white/10 hover:bg-white/20 text-white"
                  )}
                >
                  {processing === rec.id ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-3 h-3" />}
                  Aceitar
                </button>
                <button
                  disabled={!!processing}
                  onClick={() => handleAction(rec, 'reject')}
                  className="w-24 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 border border-white/5 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase transition-all active:scale-95"
                >
                  <X className="w-3 h-3" />
                  Rejeitar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricBadge({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5">
      <span className="text-[9px] font-black text-white/20 uppercase tracking-tighter">{label}:</span>
      <span className="text-[10px] font-bold text-white/60">{value}</span>
    </div>
  );
}
