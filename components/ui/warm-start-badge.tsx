"use client";

import React from "react";
import { Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface WarmStartBadgeProps {
  isWarm: boolean;
  isRefreshing: boolean;
}

export function WarmStartBadge({ isWarm, isRefreshing }: WarmStartBadgeProps) {
  if (!isWarm && !isRefreshing) return null;

  return (
    <div className={cn(
      "fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-4",
      isRefreshing 
        ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-400"
        : "bg-orange-500/20 border-orange-500/30 text-orange-400"
    )}>
      {isRefreshing ? (
         <RefreshCw className="h-3 w-3 animate-spin" />
      ) : (
         <Clock className="h-3 w-3" />
      )}
      <span className="text-[10px] font-black uppercase tracking-widest leading-none">
        {isRefreshing ? "Sincronizando..." : "Snapshot Offline"}
      </span>
    </div>
  );
}
