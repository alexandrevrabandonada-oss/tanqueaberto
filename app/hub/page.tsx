"use client";

import { AppShell } from "@/components/layout/app-shell";
import { CollectorHub } from "@/components/hub/collector-hub";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function HubPage() {
  return (
    <AppShell>
      <div className="space-y-6 pb-20">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Meu Hub</h1>
          <p className="text-white/50 text-xs mt-1">Seu impacto e progresso no Bomba Aberta.</p>
        </header>

        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 grayscale opacity-30">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="text-xs font-medium uppercase tracking-widest">Sincronizando dados...</p>
          </div>
        }>
          <CollectorHub />
        </Suspense>
      </div>
    </AppShell>
  );
}
