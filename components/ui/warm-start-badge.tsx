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
      "flex items-center gap-1.5 px-2 py-1 rounded-full border backdrop-blur-sm transition-all duration-300",
      isRefreshing 
        ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
        : "bg-orange-500/10 border-orange-500/20 text-orange-400"
    )}>
      {isRefreshing ? (
         <RefreshCw className="h-2.5 w-2.5 animate-spin" />
      ) : (
         <Clock className="h-2.5 w-2.5" />
      )}
      <span className="text-[9px] font-black uppercase tracking-tighter leading-none whitespace-nowrap">
        {isRefreshing ? "Sincronizando" : "Snapshot Offline"}
      </span>
    </div>
  );
}
