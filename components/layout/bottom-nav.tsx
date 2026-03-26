"use client";

import { usePathname } from "next/navigation";
import { Clock3, Map, Send, UserCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const items: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { href: "/", label: "Mapa", icon: Map },
  { href: "/atualizacoes", label: "Atualizações", icon: Clock3 },
  { href: "/enviar", label: "Enviar", icon: Send },
  { href: "/hub", label: "Meu Hub", icon: UserCircle }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav data-bottom-nav="root" className="fixed inset-x-0 bottom-0 z-[1000] border-t border-white/10 bg-black/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-18px_40px_rgba(0,0,0,0.45)] lg:border-t-0 lg:bg-transparent lg:px-0 lg:pb-4 lg:pt-0 lg:shadow-none">
      <div className="mx-auto w-full max-w-[560px] rounded-[24px] bg-black/95 md:max-w-[860px] lg:max-w-[980px] lg:rounded-[26px] lg:border lg:border-white/10 lg:px-2 lg:py-2 lg:shadow-2xl xl:max-w-[1120px] 2xl:max-w-[1200px]">
        <ul className="grid grid-cols-4 gap-1 lg:gap-3">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <li key={href} className="min-w-0">
                <a
                  href={href}
                  aria-current={active ? "page" : undefined}
                  draggable={false}
                  className={cn(
                    "flex min-h-14 w-full touch-manipulation flex-col items-center justify-center gap-1 rounded-[18px] px-2 py-2 text-[11px] font-medium text-white/56 active:scale-[0.98] lg:flex-row lg:gap-2 lg:px-3 lg:text-[12px]",
                    active && "bg-[color:var(--color-accent)] font-bold text-black lg:font-black"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate lg:uppercase lg:tracking-widest">{label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
