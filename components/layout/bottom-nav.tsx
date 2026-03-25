"use client";

import type { Route } from "next";
import Link from "next/link";
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
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[500] w-[calc(100%-32px)] max-w-[448px] rounded-[26px] border border-white/10 bg-black/80 p-2 shadow-2xl backdrop-blur-xl transition-all duration-300">
      <ul className="grid grid-cols-4 gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          // Precise active state logic to avoid "/" matching everything
          const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href}>
              <Link
                href={href as Route}
                prefetch={false}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-[18px] px-3 py-2 text-[11px] font-medium text-white/56 transition active:scale-95",
                  active && "bg-[color:var(--color-accent)] text-black"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
