"use client";

import React, { useState } from "react";
import { useTestMode } from "@/hooks/use-test-mode";
import { Bug, X, Send, AlertTriangle, Terminal, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function TestModeIndicator() {
  const { isActive, isTester, reportBug } = useTestMode();
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isTester || !isActive) return null;

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    setIsSending(true);
    await reportBug(feedback);
    setIsSending(false);
    setSent(true);
    setFeedback("");
    setTimeout(() => {
      setSent(false);
      setIsOpen(false);
    }, 2000);
  };

  return (
    <>
      {/* Mini Badge Floating */}
      <div 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-[100] cursor-pointer group"
      >
        <div className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-full shadow-lg border border-indigo-400/50 hover:bg-indigo-500 transition-all active:scale-95 animate-pulse">
          <FlaskConical className="h-3.5 w-3.5" />
          <span className="text-[10px] font-black uppercase tracking-widest leading-none">Beta Test</span>
        </div>
      </div>

      {/* Modal / Overlay for rapid feedback */}
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-zinc-900 border border-indigo-500/30 rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-indigo-500/20 p-2 text-indigo-400">
                  <Bug className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase italic tracking-tight">Reportar Atrito</h3>
                  <p className="text-[10px] text-white/40">Modo de Teste Ativo</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {sent ? (
              <div className="py-8 text-center space-y-3">
                <div className="inline-flex rounded-full bg-green-500/20 p-3 text-green-400">
                  <Send className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-white uppercase italic">Feedback Enviado!</p>
                <p className="text-xs text-white/40 leading-relaxed px-4">
                  Obrigado, tester. Seus metadados de sessão foram anexados.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Relate bugs, lentidão ou confusão visual..."
                  className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white placeholder:text-white/20 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none resize-none"
                />

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 flex flex-col gap-1">
                    <p className="text-[8px] font-black uppercase text-white/20 tracking-widest flex items-center gap-1">
                      <Terminal className="h-3 w-3" /> Logs Ativos
                    </p>
                    <p className="text-[10px] text-indigo-400 font-mono">Verbose On</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 flex flex-col gap-1">
                    <p className="text-[8px] font-black uppercase tracking-widest flex items-center gap-1 text-orange-400/60">
                      <AlertTriangle className="h-3 w-3" /> QA Mode
                    </p>
                    <p className="text-[10px] text-white/40">Beta Amp.</p>
                  </div>
                </div>

                <Button 
                  onClick={handleSubmit}
                  disabled={isSending || !feedback.trim()}
                  className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase italic text-sm tracking-wide transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isSending ? "Enviando..." : "Enviar Agora"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
