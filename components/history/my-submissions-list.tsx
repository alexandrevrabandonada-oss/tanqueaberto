"use client";

import { useSubmissionHistory } from "./submission-history-context";
import { SubmissionStatusLine } from "./submission-status-line";
import { SectionCard } from "@/components/ui/section-card";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { fuelLabels } from "@/lib/format/labels";
import { formatRecencyLabel } from "@/lib/format/time";
import { MapPin, History } from "lucide-react";

export function MySubmissionsList() {
  const { submissions, isLoaded } = useSubmissionHistory();

  if (!isLoaded || submissions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <History className="h-5 w-5 text-white/42" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/42">Meus Envios Recentes</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {submissions.map((sub) => (
          <SectionCard key={sub.reportId} className="group relative overflow-hidden p-4 transition-all hover:bg-white/[0.03]">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-white/60">
                    <MapPin className="h-3 w-3" />
                    <span className="text-xs font-medium truncate max-w-[150px]">{sub.stationName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <span className="text-sm font-bold">{fuelLabels[sub.fuelType]}</span>
                    <span className="text-lg font-black">{formatCurrencyBRL(Number(sub.price))}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/30 uppercase font-bold">{formatRecencyLabel(sub.submittedAt)}</p>
                </div>
              </div>

              <SubmissionStatusLine 
                status={sub.status} 
                submittedAt={sub.submittedAt}
                moderatedAt={sub.status !== 'pending' ? sub.updatedAt : null}
                className="mt-1" 
              />

              {sub.moderationNote && (
                <div className="mt-2 rounded-xl bg-orange-500/10 border border-orange-500/20 p-2 text-[10px] text-orange-200/80 italic">
                  &quot;{sub.moderationNote}&quot;
                </div>
              )}
            </div>
            
            {/* Subtle progress glow based on status */}
            <div className={`absolute bottom-0 left-0 h-[2px] transition-all duration-1000 ${
              sub.status === "approved" ? "bg-green-500 w-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" :
              sub.status === "rejected" || sub.status === "flagged" ? "bg-red-500 w-full" :
              "bg-yellow-500 w-[50%]"
            }`} />
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
