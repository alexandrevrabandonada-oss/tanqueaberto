import type { Route } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

interface FabProps {
  href?: Route;
  label?: string;
}

export function Fab({ href = "/enviar", label = "Enviar preço" }: FabProps) {
  return (
    <Link
      href={href}
      className="fixed bottom-20 left-1/2 z-30 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] px-4 py-3 text-sm font-semibold text-black shadow-[0_18px_45px_rgba(255,212,0,0.22)] -translate-x-[calc(-50%+192px)] sm:-translate-x-[calc(-50%+280px)] md:-translate-x-[calc(-50%+300px)] transition-all duration-300 active:scale-95"
    >
      <Plus className="h-4 w-4" />
      {label}
    </Link>
  );
}
