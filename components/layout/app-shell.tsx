import Link from "next/link";
import { Flame, Fuel, MapPinned } from "lucide-react";

import { BottomNav } from "@/components/layout/bottom-nav";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-4 pb-28 pt-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(255,199,0,0.18),transparent_72%)]" />
      <header className="relative z-10 mb-5 flex items-center justify-between rounded-[28px] border border-white/8 bg-black/35 px-4 py-3 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--color-accent)] text-black shadow-[0_0_32px_rgba(255,199,0,0.28)]">
            <Fuel className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/48">VR Abandonada</p>
            <h1 className="font-display text-lg leading-none text-white">Tanque Aberto</h1>
          </div>
        </Link>
        <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/6 px-3 py-2 text-xs text-white/70">
          <MapPinned className="h-3.5 w-3.5 text-[color:var(--color-accent)]" />
          Sul Fluminense
          <Flame className="h-3.5 w-3.5 text-[color:var(--color-danger)]" />
        </div>
      </header>
      <main className="relative z-10 flex-1 space-y-5">{children}</main>
      <BottomNav />
    </div>
  );
}
