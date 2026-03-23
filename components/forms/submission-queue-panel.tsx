"use client";

import { useMemo } from "react";
import { Clock3, RotateCcw, Trash2, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { fuelLabels } from "@/lib/format/labels";
import { formatRecencyLabel } from "@/lib/format/time";
import { getSubmissionQueueStatusLabel, type SubmissionQueueEntry } from "@/lib/queue/submission-queue";
import { cn } from "@/lib/utils";

interface SubmissionQueuePanelProps {
  items: SubmissionQueueEntry[];
  online: boolean;
  className?: string;
  onRetry: (item: SubmissionQueueEntry) => void;
  onReview: (item: SubmissionQueueEntry) => void;
  onDiscard: (item: SubmissionQueueEntry) => void;
}

export function SubmissionQueuePanel({ items, online, className, onRetry, onReview, onDiscard }: SubmissionQueuePanelProps) {
  const summary = useMemo(() => ({
    total: items.length,
    withPhoto: items.filter((item) => item.hasPhoto).length,
    needsPhoto: items.filter((item) => !item.hasPhoto).length
  }), [items]);

  if (items.length === 0) {
    return (
      <SectionCard className={cn("space-y-3 border-dashed border-white/10 bg-black/18", className)}>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Envios pendentes</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Nada na fila agora</h3>
        </div>
        <p className="text-sm text-white/58">Se o envio cair no meio do caminho, ele fica guardado neste aparelho para reenviar depois.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Envios pendentes</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Guardados neste aparelho</h3>
          <p className="mt-1 text-sm text-white/58">{online ? "A rede voltou. Você pode reenviar agora ou revisar antes." : "Sem rede agora. Os envios ficam guardados até a conexão voltar."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{summary.total} pendência{summary.total > 1 ? "s" : ""}</Badge>
          <Badge variant="outline">{summary.withPhoto} com foto</Badge>
          <Badge variant={summary.needsPhoto > 0 ? "warning" : "outline"}>{summary.needsPhoto} sem foto</Badge>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const isSuccess = item.status === "success";
          const isExpired = item.status === "expired";
          const isPhotoRequired = item.status === "photo_required";
          const isReady = item.status === "ready" || (online && item.hasPhoto && !isSuccess && !isExpired);

          return (
            <div 
              key={item.id} 
              className={cn(
                "rounded-[22px] border p-4 transition-colors",
                isSuccess ? "border-green-500/20 bg-green-500/5" :
                isExpired ? "border-white/5 bg-black/10 opacity-60" :
                isPhotoRequired ? "border-orange-500/20 bg-orange-500/5" :
                "border-white/8 bg-black/30"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{item.stationName}</p>
                  <p className="text-sm text-white/54">{item.neighborhood ? `${item.neighborhood}, ` : ""}{item.city}</p>
                </div>
                <Badge 
                  variant={
                    isSuccess ? "accent" : 
                    isExpired ? "secondary" : 
                    isPhotoRequired ? "danger" : 
                    isReady ? "default" : "warning"
                  }
                >
                  {getSubmissionQueueStatusLabel(item.status)}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/58">
                <Badge variant="outline">{fuelLabels[item.fuelType]}</Badge>
                <Badge variant="outline">{item.price}</Badge>
                <Badge variant="outline">{formatRecencyLabel(item.updatedAt)}</Badge>
                {item.hasPhoto ? (
                  <Badge variant="outline" className="border-green-500/20 text-green-400">Foto preservada</Badge>
                ) : (
                  <Badge variant="warning">A foto precisa ser refeita</Badge>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-white/52">
                {isSuccess ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Clock3 className="h-3.5 w-3.5" />}
                {isSuccess ? "Enviado com sucesso!" : item.lastErrorLabel ?? (isReady ? "Pronto para reenviar agora." : "Guardado. Reenviaremos assim que houver sinal.")}
              </div>

              {!isSuccess && !isExpired && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={isReady ? "primary" : "secondary"}
                    onClick={() => onRetry(item)}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {isReady ? "Tentar agora" : "Tentar de novo"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onReview(item)}
                  >
                    Revisar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onDiscard(item)}
                    className="text-white/40 hover:text-[color:var(--color-danger)]"
                  >
                    <Trash2 className="h-4 w-4" />
                    Descartar
                  </Button>
                </div>
              )}
              
              {isPhotoRequired && (
                <p className="mt-2 text-xs text-orange-400/80">A foto local sumiu ou expirou. Clique em Revisar para tirar outra.</p>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}


