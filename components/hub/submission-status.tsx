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
    <div className="space-y-6">
      {/* Pendentes no Aparelho */}
      {activeLocal.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Smartphone className="h-4 w-4 text-blue-400" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">Fila Local ({activeLocal.length})</h2>
          </div>
          <div className="grid gap-2">
            {activeLocal.map(entry => {
              const isError = entry.status === "failed" || entry.status === "photo_required" || entry.status === "expired";
              return (
                <SectionCard key={entry.id} className={cn(
                  "p-4 space-y-3 transition-all duration-300",
                  isError ? "border-rose-500/30 bg-rose-500/5 shadow-[0_0_15px_rgba(244,63,94,0.05)]" : "border-blue-500/20 bg-blue-500/5"
                )}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate text-white">{entry.stationName}</p>
                      <div className="flex items-center gap-2 text-[10px] mt-0.5">
                        <span className="font-bold text-white/50">{fuelLabels[entry.fuelType]}</span>
                        <span className="text-white/20">•</span>
                        <span className={cn(
                          "font-bold uppercase tracking-tighter text-[9px]",
                          isError ? "text-rose-400" : "text-blue-400"
                        )}>
                          {getSubmissionQueueStatusLabel(entry.status)}
                        </span>
                      </div>
                    </div>
                    {isError && (
                      <div className="bg-rose-500 text-white p-1 rounded-full">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link href={buildSubmissionQueueHref(entry)} className="flex-1">
                      <Button variant={isError ? "primary" : "secondary"} className={cn(
                        "w-full text-[10px] h-8 font-black uppercase tracking-tighter gap-1.5",
                        !isError && "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
                      )}>
                        {isError ? <RotateCcw className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                        {isError ? "Reenviar" : "Tentar Agora"}
                      </Button>
                    </Link>
                    <div className="flex gap-2">
                       <Link href={buildSubmissionQueueHref(entry).split('#')[0] as Route} className="flex-1">
                          <Button variant="secondary" className="w-full text-[10px] h-8 font-black uppercase tracking-tighter border-white/10 bg-white/5 text-white/40 hover:bg-white/10">
                            <Edit2 className="w-3 h-3" />
                            Revisar
                          </Button>
                       </Link>
                       <Button 
                         variant="ghost" 
                         onClick={() => handleDiscard(entry.id)}
                         className="h-8 w-8 p-0 text-white/20 hover:text-rose-400 hover:bg-rose-500/10"
                       >
                         <Trash2 className="w-3.5 h-3.5" />
                       </Button>
                    </div>
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
          <div className="flex items-center gap-2 px-1">
            <History className="h-4 w-4 text-white/40" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">Atividade Recente</h2>
          </div>
          <div className="grid gap-3">
            {submissions.map(sub => (
              <SectionCard key={sub.reportId} className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-white/60">
                      <MapPin className="h-3 w-3" />
                      <span className="text-[10px] font-medium truncate max-w-[150px]">{sub.stationName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white">
                      <span className="text-xs font-bold">{fuelLabels[sub.fuelType]}</span>
                      <span className="text-md font-black">{formatCurrencyBRL(Number(sub.price))}</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-white/20 uppercase font-black">{formatRecencyLabel(sub.submittedAt)}</p>
                </div>
                
                <SubmissionStatusLine status={sub.status} />

                {sub.moderationNote && (
                  <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-2 text-[9px] text-orange-200/70 italic leading-snug">
                    &quot;{sub.moderationNote}&quot;
                  </div>
                )}
              </SectionCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
