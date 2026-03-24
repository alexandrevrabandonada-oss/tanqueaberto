"use client";

import { SectionCard } from "@/components/ui/section-card";
import { SubmissionStatusLine } from "@/components/history/submission-status-line";
import { fuelLabels } from "@/lib/format/labels";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel } from "@/lib/format/time";
import { buildSubmissionQueueHref, getSubmissionQueueStatusLabel, type SubmissionQueueEntry } from "@/lib/queue/submission-queue";
import { type MySubmission } from "@/hooks/use-my-submissions";
import { MapPin, History, Smartphone, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SubmissionStatusProps {
  submissions: MySubmission[];
  localQueue: SubmissionQueueEntry[];
}

export function SubmissionStatus({ submissions, localQueue }: SubmissionStatusProps) {
  const activeLocal = localQueue.filter(entry => entry.status !== "success");
  const hasActivity = submissions.length > 0 || activeLocal.length > 0;

  if (!hasActivity) {
    return (
      <SectionCard className="py-12 flex flex-col items-center justify-center text-center opacity-40">
        <History className="h-8 w-8 mb-3" />
        <p className="text-xs font-bold uppercase tracking-widest">Sem atividade recente</p>
        <p className="text-[10px] mt-1 italic">Envie um preço para começar seu histórico.</p>
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
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">No Aparelho ({activeLocal.length})</h2>
          </div>
          <div className="grid gap-2">
            {activeLocal.map(entry => (
              <Link key={entry.id} href={buildSubmissionQueueHref(entry)}>
                <SectionCard className="p-3 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors flex justify-between items-center group">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold truncate">{entry.stationName}</p>
                    <div className="flex items-center gap-2 text-[9px] text-blue-300/60">
                      <span>{fuelLabels[entry.fuelType]}</span>
                      <span>•</span>
                      <span>{getSubmissionQueueStatusLabel(entry.status)}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-blue-400 transition-colors" />
                </SectionCard>
              </Link>
            ))}
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
