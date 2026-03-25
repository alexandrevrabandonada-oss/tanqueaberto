"use client";

import { startTransition } from "react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();

  return (
    <nav className="pointer-events-auto fixed inset-x-4 bottom-4 z-[1000] isolate mx-auto w-auto max-w-[448px] rounded-[26px] border border-white/10 bg-black/92 p-2 shadow-2xl backdrop-blur-xl transition-all duration-300 lg:max-w-[720px] lg:left-1/2 lg:right-auto lg:w-[calc(100%-32px)] lg:-translate-x-1/2">
      <ul className="grid grid-cols-4 gap-1 lg:gap-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href} className="min-w-0">
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (active) {
                    return;
                  }

                  startTransition(() => {
                    router.push(href as Route);
                  });
                }}
                className={cn(
                  "relative z-10 flex w-full touch-manipulation flex-col items-center gap-1 rounded-[18px] px-3 py-2 text-[11px] font-medium text-white/56 transition active:scale-95 hover:bg-white/5 lg:flex-row lg:justify-center lg:gap-2 lg:text-[12px]",
                  active && "bg-[color:var(--color-accent)] font-bold text-black lg:font-black"
                )}
              >
                <Icon className={cn("h-4 w-4", active && "animate-pulse")} />
                <span className="truncate lg:uppercase lg:tracking-widest">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
