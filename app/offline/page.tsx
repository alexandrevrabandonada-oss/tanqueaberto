import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/ui/section-card";

export default function OfflinePage() {
  return (
    <AppShell>
      <SectionCard className="space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/42">Offline</p>
        <h2 className="text-[1.8rem] font-semibold leading-none text-white">Sem conexao agora</h2>
        <p className="text-sm text-white/58">
          O app continua instalado. Assim que a internet voltar, o mapa e os envios retomam normalmente.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-accent)] px-5 py-3 text-sm font-semibold text-black"
        >
          Tentar novamente
        </Link>
      </SectionCard>
    </AppShell>
  );
}
