import Link from "next/link";
import { Flame, MapPinned, MessageSquareMore } from "lucide-react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { BrandMark } from "@/components/brand/brand-mark";
import { PwaStatusStrip } from "@/components/pwa/pwa-status-strip";
import { Fab } from "@/components/ui/fab";
import { brand } from "@/styles/design-tokens";
import { isBetaClosed } from "@/lib/beta/gate";

import { type OperationalKillSwitches } from "@/lib/ops/kill-switches";

interface AppShellProps {
  children: React.ReactNode;
  killSwitches?: Partial<OperationalKillSwitches>;
}

export function AppShell({ children, killSwitches }: AppShellProps) {
  const betaClosed = isBetaClosed();

  return (
    <div className="min-h-screen bg-[#050505] selection:bg-[color:var(--color-accent)] selection:text-black">
      {/* Background treatment for large screens */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1440px] h-full opacity-40">
           <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[color:var(--color-accent)]/10 blur-[120px] rounded-full" />
           <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-indigo-500/5 blur-[100px] rounded-full" />
        </div>
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] md:max-w-[640px] lg:max-w-[720px] flex-col px-4 pb-28 pt-4 transition-all duration-500">
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
            <span className="hidden sm:inline">Sul Fluminense</span>
            <span className="sm:hidden font-bold">SF</span>
            <Flame className="h-3.5 w-3.5 text-[color:var(--color-danger)]" />
          </div>
        </header>

        {betaClosed ? (
          <div className="relative z-10 mb-4 rounded-[22px] border border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/10 px-4 py-3 text-sm text-white/72 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/46">Beta fechado</p>
                <p className="text-sm text-white/72">Convite controlado e feeback ativo.</p>
              </div>
              <Link href="/feedback" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/72">
                <MessageSquareMore className="h-4 w-4" />
                <span className="hidden sm:inline">Feedback</span>
              </Link>
            </div>
          </div>
        ) : null}

        <PwaStatusStrip killSwitches={killSwitches} />
        <main className="relative z-10 flex-1 space-y-5">{children}</main>
        
        {/* Floating elements will be updated separately to handle their own positioning */}
        <Fab />
        <BottomNav />
      </div>
    </div>
  );
}
