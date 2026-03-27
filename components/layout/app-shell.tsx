import Link from "next/link";
import { Flame, MapPinned, MessageSquareMore } from "lucide-react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { BrandMark } from "@/components/brand/brand-mark";
import { VrAbandonadaBadge } from "@/components/brand/vr-abandonada-badge";
import { PwaStatusStrip } from "@/components/pwa/pwa-status-strip";
import { GlobalSubmitCta } from "@/components/layout/global-submit-cta";
import { isBetaClosed } from "@/lib/beta/gate";

import { type OperationalKillSwitches } from "@/lib/ops/kill-switches";

interface AppShellProps {
  children: React.ReactNode;
  killSwitches?: Partial<OperationalKillSwitches>;
  hideShellSubmitCta?: boolean;
}

export function AppShell({ children, killSwitches, hideShellSubmitCta = false }: AppShellProps) {
  const betaClosed = isBetaClosed();

  return (
    <div className="min-h-screen bg-[#050505] selection:bg-[color:var(--color-accent)] selection:text-black">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-full max-w-[1600px] opacity-40">
          <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-[color:var(--color-accent)]/10 blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-5%] h-[35%] w-[35%] rounded-full bg-indigo-500/5 blur-[100px]" />
        </div>
      </div>

      <div
        data-app-shell-frame="root"
        className="relative mx-auto flex min-h-screen w-full max-w-[560px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+12rem)] pt-3 transition-all duration-500 md:max-w-[920px] md:px-6 md:pb-32 lg:max-w-[1180px] lg:px-8 lg:pb-24 xl:max-w-[1540px] xl:px-10 xl:pb-20 2xl:max-w-[1760px] 2xl:px-12 2xl:pb-20"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(255,199,0,0.18),transparent_72%)]" />

        <header data-app-shell-header="root" className="relative z-10 mb-2.5 flex items-center justify-between gap-3 rounded-[28px] border border-white/8 bg-black/35 px-3 py-2 backdrop-blur-md lg:mb-3 lg:px-4 lg:py-2.5 xl:px-4 xl:py-2">
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

        <VrAbandonadaBadge compact className="relative z-10 mb-2.5 w-full lg:hidden" />

        {!hideShellSubmitCta && <GlobalSubmitCta placement="shell" label="Enviar preco agora" className="relative z-10 mb-4" />}

        {betaClosed ? (
          <div className="relative z-10 mb-3.5 rounded-[22px] border border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/10 px-4 py-3 text-sm text-white/72 backdrop-blur-md">
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
        <main className="relative z-10 flex-1 space-y-4 xl:space-y-5">{children}</main>

        <GlobalSubmitCta placement="dock" label="Enviar preco" />
        <BottomNav />
      </div>
    </div>
  );
}



