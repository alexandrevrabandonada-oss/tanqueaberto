"use client";

import { Check, X, AlertTriangle, Clock, Layers } from "lucide-react";
import Image from "next/image";
import { type ModerationBatch } from "@/lib/ops/moderation-batching";
import { moderateReportsBatchAction } from "@/app/admin/actions";
import { type FuelType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { fuelLabels } from "@/lib/format/labels";
import { cn } from "@/lib/utils";

interface BatchModerationPanelProps {
  batches: ModerationBatch[];
}

export function BatchModerationPanel({ batches }: BatchModerationPanelProps) {
  if (batches.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
           <Layers className="h-5 w-5 text-[color:var(--color-accent)]" />
           <div>
              <h2 className="text-xl font-bold text-white">Moderação em Lote</h2>
              <p className="text-sm text-white/50">Detectamos {batches.length} grupos de reports similares.</p>
           </div>
        </div>
        <Badge variant="accent" className="h-6">{batches.length} grupos</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {batches.map((batch) => (
          <SectionCard key={batch.id} className={cn("relative overflow-hidden border-white/8 bg-black/40", !batch.isSafe && "border-orange-500/20 bg-orange-500/5")}>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[color:var(--color-accent)]">{fuelLabels[batch.fuelType as FuelType]}</p>
                  <h3 className="text-lg font-bold text-white truncate max-w-[200px]">{batch.stationName}</h3>
                </div>
                <Badge variant={batch.isSafe ? "outline" : "warning"}>
                  {batch.reports.length} reports
                </Badge>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
                {batch.reports.map((report) => (
                  <div key={report.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10">
                    <Image 
                      src={report.photoUrl} 
                      alt="Miniatura" 
                      fill 
                      className="object-cover opacity-80"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-xl bg-white/5 p-3">
                <div>
                   <p className="text-[9px] uppercase tracking-widest text-white/40">Preço pautado</p>
                   <p className="text-xl font-black text-white">{formatCurrencyBRL(batch.avgPrice)}</p>
                </div>
                <div className="text-right">
                   <p className="text-[9px] uppercase tracking-widest text-white/40">Variância</p>
                   <p className={cn("text-lg font-bold", batch.isSafe ? "text-green-400" : "text-orange-400")}>
                      {batch.priceVariance.toFixed(1)}%
                   </p>
                </div>
              </div>

              {!batch.isSafe && (
                <div className="flex items-center gap-2 rounded-lg bg-orange-500/10 px-3 py-2 text-[10px] font-bold text-orange-400 uppercase tracking-tight">
                   <AlertTriangle className="h-3 w-3" />
                   Cuidado: Preços divergem no lote. Verifique individualmente.
                </div>
              )}

              <form action={moderateReportsBatchAction} className="flex gap-2">
                <input type="hidden" name="reportIds" value={batch.reports.map(r => r.id).join(",")} />
                <input type="hidden" name="moderationNote" value={`Aprovação em lote (${batch.reports.length} itens, variação ${batch.priceVariance.toFixed(2)}%)`} />
                
                <Button 
                  type="submit" 
                  name="decision" 
                  value="approved" 
                  disabled={!batch.isSafe}
                  className="flex-1 h-10 text-xs font-black bg-white text-black hover:bg-white/90"
                >
                  <Check className="h-4 w-4" />
                  APROVAR LOTE
                </Button>
                
                <Button 
                  type="submit" 
                  name="decision" 
                  value="rejected" 
                  variant="secondary"
                  className="h-10 px-4 border-red-500/20 text-red-400 hover:bg-red-500/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </form>
              
              <div className="flex items-center gap-3 text-[10px] text-white/30">
                 <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Janela de {batch.timeRangeMinutes}min</span>
                 <span>ID: {batch.id.slice(-8)}</span>
              </div>
            </div>
            
            {!batch.isSafe && (
              <div className="absolute top-0 right-0 h-16 w-16 translate-x-1/2 -translate-y-1/2 rotate-45 bg-orange-500/10" />
            )}
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
