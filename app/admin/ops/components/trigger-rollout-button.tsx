"use client";

import { useTransition } from "react";
import { triggerRolloutEngineAction } from "../actions";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TriggerRolloutButton() {
  const [isPending, startTransition] = useTransition();

  const handleTrigger = () => {
    startTransition(async () => {
      await triggerRolloutEngineAction();
    });
  };

  return (
    <button
      onClick={handleTrigger}
      disabled={isPending}
      className={cn(
        "flex items-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-400 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100",
        isPending && "animate-pulse"
      )}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
      Recalcular Sugestões
    </button>
  );
}
