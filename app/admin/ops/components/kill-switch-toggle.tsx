"use client";

import { useTransition } from "react";
import { toggleKillSwitchAction } from "../actions";
import { type OperationalKillSwitches } from "@/lib/ops/kill-switches";
import { cn } from "@/lib/utils";
import { Power } from "lucide-react";

interface KillSwitchToggleProps {
  label: string;
  description: string;
  switchKey: keyof OperationalKillSwitches;
  active: boolean;
}

export function KillSwitchToggle({ label, description, switchKey, active }: KillSwitchToggleProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await toggleKillSwitchAction(switchKey, !active);
    });
  };

  return (
    <div className={cn(
      "p-3 rounded-xl border transition-all duration-300 flex items-center justify-between gap-4",
      active 
        ? "bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]" 
        : "bg-white/[0.03] border-white/5 hover:bg-white/[0.05]"
    )}>
      <div className="flex-1 min-w-0">
        <h4 className={cn(
          "text-xs font-bold tracking-tight",
          active ? "text-red-400" : "text-white/80"
        )}>
          {label}
        </h4>
        <p className="text-[10px] text-white/40 truncate mt-0.5">{description}</p>
      </div>
      
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shrink-0",
          active 
            ? "bg-red-500 text-white shadow-lg shadow-red-500/40" 
            : "bg-white/10 text-white/40 hover:bg-white/20 hover:text-white/60",
          isPending && "opacity-50 cursor-wait animate-pulse"
        )}
      >
        <Power className={cn("w-5 h-5", active ? "animate-pulse" : "")} />
      </button>
    </div>
  );
}
