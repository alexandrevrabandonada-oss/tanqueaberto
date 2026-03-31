import type { Route } from "next";
import Link from "next/link";
import { Clock3, Map, Send, UserCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const items: Array<{ href: Route; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { href: "/", label: "Mapa", icon: Map },
  { href: "/atualizacoes", label: "Atualizações", icon: Clock3 },
  { href: "/enviar", label: "Enviar", icon: Send },
  { href: "/hub", label: "Meu Hub", icon: UserCircle }
];

export function BottomNav({ activePath = "" }: { activePath?: string }) {

  return (
    <nav
      data-bottom-nav="root"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[1100] border-t border-white/10 bg-black/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-18px_40px_rgba(0,0,0,0.45)] supports-[padding:max(0px)]:pb-[max(0.5rem,env(safe-area-inset-bottom))] md:px-4 md:pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:border-t-0 lg:bg-transparent lg:px-0 lg:pb-4 lg:pt-0 lg:shadow-none xl:left-1/2 xl:right-auto xl:bottom-5 xl:w-[min(1120px,calc(100vw-2rem))] xl:-translate-x-1/2 xl:border-0 xl:px-0 xl:pb-0 xl:pt-0"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-[560px] rounded-[24px] bg-black/95 md:max-w-[860px] lg:max-w-[980px] lg:rounded-[26px] lg:border lg:border-white/10 lg:px-2 lg:py-2 lg:shadow-2xl xl:max-w-none xl:rounded-full xl:border xl:border-white/10 xl:bg-black/72 xl:px-2 xl:py-2 xl:shadow-[0_18px_50px_rgba(0,0,0,0.34)] xl:backdrop-blur-md 2xl:px-3">
        <ul className="grid grid-cols-4 gap-1 md:gap-2 xl:gap-2.5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? activePath === "/" : activePath === href || activePath.startsWith(`${href}/`);
            const isPrimary = href === "/enviar";

            return (
              <li key={href} className="min-w-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  draggable={false}
                  className={cn(
                    "flex min-h-14 w-full touch-manipulation flex-col items-center justify-center gap-1 rounded-[18px] px-2 py-2 text-[11px] font-medium text-white/56 transition active:scale-[0.98] md:min-h-13 md:px-3 md:text-[11.5px] lg:flex-row lg:gap-2 lg:px-3 lg:text-[12px] xl:min-h-11 xl:rounded-full xl:px-4 xl:py-2 xl:text-[12px] xl:tracking-[0.06em]",
                    isPrimary && !active && "border border-[color:var(--color-accent)]/18 bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)] shadow-[0_0_0_1px_rgba(255,199,0,0.14)]",
                    isPrimary && active && "bg-[color:var(--color-accent)] font-bold text-black shadow-[0_0_0_1px_rgba(255,199,0,0.2)] lg:font-black",
                    !isPrimary && active && "bg-[color:var(--color-accent)] font-bold text-black shadow-[0_0_0_1px_rgba(255,199,0,0.2)] lg:font-black"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0 xl:h-[15px] xl:w-[15px]", isPrimary && !active && "text-[color:var(--color-accent)]", active && "text-black")} />
                  <span className={cn("truncate xl:uppercase xl:tracking-widest", isPrimary && !active && "font-semibold")}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
