"use client";

import { Sparkles, Zap, Layout } from "lucide-react";

import { cn } from "@/lib/utils";
import type { HomeDensityMode } from "@/lib/navigation/home-context";

interface DensitySelectorProps {
  mode: HomeDensityMode;
  onChange: (mode: HomeDensityMode) => void;
  className?: string;
  isCompact?: boolean;
}

export function DensitySelector({ mode, onChange, className, isCompact = false }: DensitySelectorProps) {
  const options = [
    { id: "ultra-claro", label: "CLARO", short: "C", icon: Sparkles },
    { id: "normal", label: "NORMAL", short: "N", icon: Layout },
    { id: "avancado", label: "AVANÇADO", short: "A", icon: Zap },
  ] as const;

  return (
    <div className={cn("inline-flex rounded-full border border-white/10 bg-white/5 p-0.5", className)}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "inline-flex min-h-7 items-center justify-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] transition-all duration-200",
            mode === option.id ? "bg-white text-black shadow-sm" : "text-white/40 hover:bg-white/5 hover:text-white",
            isCompact && "px-2 py-1 text-[8px] tracking-[0.12em]"
          )}
        >
          <option.icon className={cn("h-3 w-3", mode === option.id && "fill-current")} />
          <span className={cn(isCompact ? "hidden" : "hidden sm:inline")}>{option.label}</span>
          <span className={cn(isCompact ? "inline" : "sm:hidden")}>{option.short}</span>
        </button>
      ))}
    </div>
  );
}
