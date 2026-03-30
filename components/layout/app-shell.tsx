import type { Route } from "next";
import Link from "next/link";
import { Flame, MapPinned, MessageSquareMore } from "lucide-react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { BrandMark } from "@/components/brand/brand-mark";
import { VrAbandonadaBadge } from "@/components/brand/vr-abandonada-badge";
import { PwaStatusStrip } from "@/components/pwa/pwa-status-strip";
import { GlobalSubmitCta } from "@/components/layout/global-submit-cta";
import { PerformanceModeSync } from "@/components/layout/performance-mode-sync";
import { isBetaClosed } from "@/lib/beta/gate";
import { getBuildInfo } from "@/lib/runtime/build-info";

import { type OperationalKillSwitches } from "@/lib/ops/kill-switches";

interface AppShellProps {
  children: React.ReactNode;
  killSwitches?: Partial<OperationalKillSwitches>;
  hideShellSubmitCta?: boolean;
  globalSubmitCta?: {
    href: Route;
    label: string;
    note: string;
  } | null;
}

export function AppShell({ children, killSwitches, hideShellSubmitCta = false, globalSubmitCta = null }: AppShellProps) {
  const betaClosed = isBetaClosed();
  const buildInfo = getBuildInfo();
  const showBuildStamp = buildInfo.env !== "production";

  return (
    <div className="min-h-screen bg-[#050505] selection:bg-[color:var(--color-accent)] selection:text-black">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden hidden md:block" data-low-perf-hide="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-full max-w-[1600px] opacity-40" data-low-perf-hide="true">
          <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-[color:var(--color-accent)]/10 blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-5%] h-[35%] w-[35%] rounded-full bg-indigo-500/5 blur-[100px]" />
        </div>
      </div>

      <div
        data-app-shell-frame="root"
        className="relative mx-auto flex min-h-screen w-full max-w-[560px] flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+8.5rem)] pt-2 transition-all duration-500 md:max-w-[920px] md:px-6 md:pb-28 lg:max-w-[1180px] lg:px-8 lg:pb-24 xl:max-w-[1540px] xl:px-10 xl:pb-20 2xl:max-w-[1760px] 2xl:px-12 2xl:pb-20"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-56 bg-[radial-gradient(circle_at_top,rgba(255,199,0,0.18),transparent_72%)] md:block" data-low-perf-hide="true" />

        <header data-app-shell-header="root" className="relative z-10 mb-1.5 flex items-center justify-between gap-2.5 rounded-[24px] border border-white/8 bg-black/28 px-3 py-1.5 md:mb-2.5 md:rounded-[28px] md:gap-3 md:bg-black/35 md:px-3 md:py-2 md:backdrop-blur-md lg:mb-3 lg:px-4 lg:py-2.5 xl:px-4 xl:py-2">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <BrandMark variant="logo-horizontal" className="h-8 w-auto max-w-[170px] sm:max-w-[210px]" decorative />
          </Link>
          <div className="flex items-center gap-2 lg:flex-col lg:items-end">
            <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/6 px-3 py-1.5 text-[11px] text-white/70">
              <MapPinned className="h-3.5 w-3.5 text-[color:var(--color-accent)]" />
              <span className="hidden sm:inline">Sul Fluminense</span>
              <span className="font-bold sm:hidden">SF</span>
              <Flame className="h-3.5 w-3.5 text-[color:var(--color-danger)]" />
            </div>
            <VrAbandonadaBadge compact className="hidden lg:inline-flex" />
          </div>
        </header>

        <VrAbandonadaBadge compact className="relative z-10 mb-2 hidden w-full md:block lg:hidden" />

        {!hideShellSubmitCta && globalSubmitCta ? (
          <GlobalSubmitCta
            placement="shell"
            href={globalSubmitCta.href}
            label={globalSubmitCta.label}
            note={globalSubmitCta.note}
            className="relative z-10 mb-3 md:mb-4"
          />
        ) : null}

        {betaClosed ? (
          <div className="relative z-10 mb-3 rounded-[20px] border border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/10 px-3.5 py-2.5 text-sm text-white/72 md:mb-3.5 md:px-4 md:py-3 md:backdrop-blur-md">
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

        <PerformanceModeSync />
        <PwaStatusStrip killSwitches={killSwitches} />

        {showBuildStamp ? (
          <div className="relative z-10 mb-2.5 flex items-center justify-end md:mb-3">
            <div
              data-build-stamp="root"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/42 md:backdrop-blur-md"
            >
              <span>{buildInfo.label}</span>
            </div>
          </div>
        ) : null}

        <main className="relative z-10 flex-1 space-y-3 md:space-y-4 xl:space-y-5">{children}</main>

        <BottomNav />
      </div>
    </div>
  );
}


