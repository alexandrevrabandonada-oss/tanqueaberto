"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InstallPromptCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="flex flex-col gap-3 rounded-[24px] border border-blue-500/20 bg-blue-500/5 p-5 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
          <Download className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Instalar Bomba Aberta</h3>
          <p className="text-xs text-white/50 leading-tight">Acesse preços e lacunas de forma mais rápida, direto da sua tela inicial.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button 
          onClick={handleInstall}
          className="h-10 flex-1 bg-blue-600 text-[11px] font-black uppercase tracking-wider text-white"
        >
          INSTALAR AGORA
        </Button>
        <Button 
          variant="secondary"
          onClick={() => setIsVisible(false)}
          className="h-10 px-4 text-xs font-bold"
        >
          Depois
        </Button>
      </div>
    </div>
  );
}
