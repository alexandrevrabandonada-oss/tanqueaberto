"use client";

import { ShieldAlert, Activity, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BetaOpsAlert } from "@/lib/ops/types";

interface BetaOpsSignalsProps {
  alerts: BetaOpsAlert[];
}

export function BetaOpsSignals({ alerts }: BetaOpsSignalsProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {alerts.map((alert, index) => (
        <div 
          key={`${alert.kind}-${index}`}
          className={`rounded-[22px] border p-4 ${
            alert.severity === "danger" 
              ? "border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/10" 
              : alert.severity === "warning"
              ? "border-[color:var(--color-warning)]/30 bg-[color:var(--color-warning)]/10"
              : "border-white/10 bg-white/5"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {alert.severity === "danger" ? (
                <ShieldAlert className="h-5 w-5 text-[color:var(--color-danger)]" />
              ) : alert.severity === "warning" ? (
                <AlertTriangle className="h-5 w-5 text-[color:var(--color-warning)]" />
              ) : (
                <Activity className="h-5 w-5 text-white/42" />
              )}
              <p className="text-sm font-semibold text-white">{alert.title}</p>
            </div>
            {alert.count ? <Badge variant={alert.severity === "danger" ? "danger" : "warning"}>{alert.count}</Badge> : null}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/58">{alert.description}</p>
        </div>
      ))}
    </div>
  );
}
