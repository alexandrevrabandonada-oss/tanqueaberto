"use client";

import { SectionCard } from "@/components/ui/section-card";
import { SubmissionStatusLine } from "@/components/history/submission-status-line";
import { fuelLabels } from "@/lib/format/labels";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel } from "@/lib/format/time";
import { buildSubmissionQueueHref, getSubmissionQueueStatusLabel, type SubmissionQueueEntry } from "@/lib/queue/submission-queue";
import { type MySubmission } from "@/hooks/use-my-submissions";
import { MapPin, History, Smartphone, ChevronRight, Send, AlertTriangle, Trash2, Edit2, RotateCcw } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import { removeSubmissionQueueEntry } from "@/lib/queue/submission-queue";
import { Button } from "@/components/ui/button";

interface SubmissionStatusProps {
  submissions: MySubmission[];
  localQueue: SubmissionQueueEntry[];
}

export function SubmissionStatus({ submissions, localQueue }: SubmissionStatusProps) {
  const activeLocal = localQueue.filter(entry => entry.status !== "success");
  const hasActivity = submissions.length > 0 || activeLocal.length > 0;

  const handleDiscard = async (id: string) => {
    if (confirm("Tem certeza que deseja descartar este envio?")) {
      await removeSubmissionQueueEntry(id);
      window.location.reload(); // Quick refresh to update state
    }
  };

  if (!hasActivity) {
    return (
      <SectionCard className="py-12 flex flex-col items-center justify-center text-center opacity-40">
        <History className="h-8 w-8 mb-3 text-white/40" />
        <p className="text-xs font-bold uppercase tracking-widest text-white/60">Sem atividade recente</p>
        <p className="text-[10px] mt-1 italic text-white/30">Envie um preço para começar seu histórico.</p>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pendentes no Aparelho */}
      {activeLocal.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Smartphone className="h-3.5 w-3.5 text-blue-400" />
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Fila Local ({activeLocal.length})</h2>
          </div>
          <div className="grid gap-2">
            {activeLocal.map(entry => {
              const isError = entry.status === "failed" || entry.status === "photo_required" || entry.status === "expired";
              return (
                <SectionCard key={entry.id} className={cn(
                  "p-3 space-y-3 transition-all duration-300",
                  isError ? "border-rose-500/30 bg-rose-500/5" : "border-blue-500/20 bg-blue-500/5"
                )}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate text-white">{entry.stationName}</p>
                      <div className="flex items-center gap-2 text-[9px] mt-0.5">
                        <span className="font-bold text-white/50">{fuelLabels[entry.fuelType]}</span>
                        <span className="text-white/20">•</span>
                        <span className={cn(
                          "font-bold uppercase tracking-tighter text-[8px]",
                          isError ? "text-rose-400" : "text-blue-400"
                        )}>
                          {getSubmissionQueueStatusLabel(entry.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={buildSubmissionQueueHref(entry)} className="flex-1">
                      <Button variant={isError ? "primary" : "secondary"} className={cn(
                        "w-full text-[9px] h-7 font-black uppercase tracking-tighter gap-1.2",
                        !isError && "bg-blue-500/10 border-blue-500/20 text-blue-400"
                      )}>
                        {isError ? <RotateCcw className="w-2.5 h-2.5" /> : <Send className="w-2.5 h-2.5" />}
                        {isError ? "Refazer" : "Enviar"}
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleDiscard(entry.id)}
                      className="h-7 w-7 p-0 text-white/20 hover:text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </SectionCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Histórico Remoto */}
      {submissions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1 text-white/40">
            <History className="h-3.5 w-3.5" />
            <h2 className="text-[10px] font-bold uppercase tracking-widest">Recentes</h2>
          </div>
          <div className="grid gap-2">
            {submissions.slice(0, 5).map(sub => (
              <SectionCard key={sub.reportId} className="p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-white/40">
                      <MapPin className="h-2.5 w-2.5" />
                      <span className="text-[9px] font-medium truncate">{sub.stationName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white">
                      <span className="text-[10px] font-bold">{fuelLabels[sub.fuelType]}</span>
                      <span className="text-xs font-black">{formatCurrencyBRL(Number(sub.price))}</span>
                    </div>
                  </div>
                  <p className="text-[8px] text-white/20 uppercase font-black shrink-0">{formatRecencyLabel(sub.submittedAt)}</p>
                </div>
                
                <div className="mt-2">
                  <SubmissionStatusLine status={sub.status} />
                </div>
              </SectionCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
