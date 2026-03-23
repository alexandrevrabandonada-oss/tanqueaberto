"use client";

import { useMemo } from "react";
import { Clock3, RotateCcw, Trash2 } from "lucide-react";

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
          return (
            <div key={item.id} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{item.stationName}</p>
                  <p className="text-sm text-white/54">{item.neighborhood ? `${item.neighborhood}, ` : ""}{item.city}</p>
                </div>
                <Badge variant={item.hasPhoto ? "default" : "warning"}>{getSubmissionQueueStatusLabel(item.status)}</Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/58">
                <Badge variant="outline">{fuelLabels[item.fuelType]}</Badge>
                <Badge variant="outline">{item.price}</Badge>
                <Badge variant="outline">{formatRecencyLabel(item.updatedAt)}</Badge>
                {item.hasPhoto ? <Badge variant="outline">Foto guardada</Badge> : <Badge variant="warning">A foto precisa ser refeita</Badge>}
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-white/52">
                <Clock3 className="h-3.5 w-3.5" />
                {item.lastErrorLabel ?? "Pronto para reenviar quando quiser."}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    onRetry(item);
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  {online && item.hasPhoto ? "Tentar agora" : "Reabrir envio"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    onReview(item);
                  }}
                >
                  Revisar antes
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    onDiscard(item);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Descartar
                </Button>
              </div>
              <p className="mt-2 text-xs text-white/42">Se a foto sumiu, você precisa tirar outra antes de reenviar.</p>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}


