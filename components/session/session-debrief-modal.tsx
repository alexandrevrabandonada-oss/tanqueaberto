"use client";

import React, { useState } from "react";
import { Check, X, Zap, Navigation, SignalLow, MapPin, Smile, Ghost, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStreetSession, SessionSummary } from "@/hooks/use-street-session";
import { useTestMode } from "@/hooks/use-test-mode";
import { useMySubmissions } from "@/hooks/use-my-submissions";
import { useLocationHardening } from "@/hooks/use-location-hardening";
import { submitQuickFeedbackAction } from "@/app/admin/ops/actions";
import { trackProductEvent } from "@/lib/telemetry/client";

interface FeedbackOption {
  id: string;
  label: string;
  icon: React.ElementType;
  type: string;
  color: string;
}

const FEEDBACK_OPTIONS: FeedbackOption[] = [
  { id: "fluid", label: "Tudo Fluido", icon: Zap, type: "fluid", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  { id: "gps", label: "GPS Ruim", icon: Navigation, type: "gps_issue", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  { id: "slow", label: "App Lento", icon: Ghost, type: "perf_issue", color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20" },
  { id: "network", label: "Rede Instável", icon: SignalLow, type: "network_issue", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  { id: "confusing", label: "Posto Confuso", icon: MapPin, type: "ux_issue", color: "text-rose-400 bg-rose-400/10 border-rose-400/20" },
];

export function SessionDebriefModal() {
  const { showDebrief, lastSummary, clearDebrief } = useStreetSession();
  const { isTester } = useTestMode();
  const { reporterNickname } = useMySubmissions();
  const { location } = useLocationHardening();
  const [selected, setSelected] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!showDebrief || !lastSummary) return null;

  const handleFeedback = async (option: FeedbackOption) => {
    setSelected(option.id);
    setIsSubmitting(true);

    const payload = {
      feedbackType: option.type,
      message: `Session Debrief: ${option.label}`,
      pagePath: "/",
      testerNickname: reporterNickname || "anon-beta",
      sessionId: lastSummary.id,
      metadata: {
        summary: lastSummary,
        gpsAccuracy: location?.accuracy,
        gpsTrust: location?.trustStatus,
        isTester
      }
    };

    const result = await submitQuickFeedbackAction(payload);
    
    if (result.success) {
      void trackProductEvent({
        eventType: "session_feedback_submitted" as any,
        pagePath: "/",
        payload: { type: option.type, sessionId: lastSummary.id }
      });
      setSubmitted(true);
      setTimeout(() => {
        clearDebrief();
      }, 2000);
    }
    
    setIsSubmitting(false);
  };

  const durationMin = Math.round(lastSummary.durationMs / 60000);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-[32px] p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        
        {/* Close button */}
        <button 
          onClick={clearDebrief}
          className="absolute top-4 right-4 p-2 text-white/20 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="py-12 text-center space-y-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-black uppercase italic text-white tracking-tight">Valeu, Coletor!</h2>
            <p className="text-sm text-white/40 px-6">Feedback registrado. Isso ajuda a calibrar o Bomba Aberta para a sua região.</p>
          </div>
        ) : (
          <>
            <div className="mb-6 space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Resumo da Missão</span>
              </div>
              <h2 className="text-2xl font-black uppercase italic text-white leading-none">Coleta Finalizada</h2>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-white">{lastSummary.stationsSeenCount}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">Postos Vistos</span>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-[color:var(--color-accent)]">{lastSummary.gapsFilledCount}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">Lances Fechados</span>
              </div>
              <div className="col-span-2 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-3 flex items-center justify-center gap-3">
                <Smile className="h-4 w-4 text-indigo-400" />
                <span className="text-[11px] font-bold text-indigo-300/80 italic">
                  Você operou por {durationMin} min no asfalto hoje.
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/50 px-1">Como foi a experiência?</h3>
              <div className="grid grid-cols-1 gap-2">
                {FEEDBACK_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    disabled={isSubmitting}
                    onClick={() => handleFeedback(opt)}
                    className={cn(
                      "flex items-center justify-between w-full h-12 px-4 rounded-2xl border transition-all active:scale-[0.98] disabled:opacity-50",
                      opt.color,
                      selected === opt.id ? "ring-2 ring-white/20" : ""
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <opt.icon className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase tracking-wide">{opt.label}</span>
                    </div>
                    {isSubmitting && selected === opt.id ? (
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check className={cn("h-4 w-4 opacity-0 transition-opacity", selected === opt.id && "opacity-100")} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-8 text-[9px] text-center text-white/20 font-medium uppercase tracking-[0.15em]">
              Bomba Aberta {isTester ? "Tester Mode" : "Beta Mode"} 4.0
            </p>
          </>
        )}
      </div>
    </div>
  );
}
