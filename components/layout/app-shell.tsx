import Link from "next/link";
import { Flame, MapPinned, MessageSquareMore } from "lucide-react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { BrandMark } from "@/components/brand/brand-mark";
import { Fab } from "@/components/ui/fab";
import { brand } from "@/styles/design-tokens";
import { isBetaClosed } from "@/lib/beta/gate";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const betaClosed = isBetaClosed();

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-4 pb-28 pt-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(255,199,0,0.18),transparent_72%)]" />
      <header className="relative z-10 mb-5 flex items-center justify-between rounded-[26px] border border-white/8 bg-black/35 px-3 py-2.5 backdrop-blur-md">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-white/8 bg-black/35 shadow-[0_0_0_6px_rgba(255,199,0,0.05)]">
            <BrandMark variant="symbol" className="h-7 w-7" decorative />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/46">{brand.initiative}</p>
            <h1 className="truncate font-display text-[1.05rem] leading-none text-white">{brand.name}</h1>
          </div>
        </Link>
        <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/6 px-3 py-2 text-[11px] text-white/70">
          <MapPinned className="h-3.5 w-3.5 text-[color:var(--color-accent)]" />
          Sul Fluminense
          <Flame className="h-3.5 w-3.5 text-[color:var(--color-danger)]" />
        </div>
      </header>
      {betaClosed ? (
        <div className="relative z-10 mb-4 rounded-[22px] border border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/10 px-4 py-3 text-sm text-white/78 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/46">Beta fechado</p>
              <p className="text-sm text-white/72">Convite controlado, feedback ativo e cobertura em expansão.</p>
            </div>
            <Link href="/feedback" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/72">
              <MessageSquareMore className="h-4 w-4" />
              Feedback
            </Link>
          </div>
        </div>
      ) : null}
      <main className="relative z-10 flex-1 space-y-5">{children}</main>
      <Fab />
      <BottomNav />
    </div>
  );
}
