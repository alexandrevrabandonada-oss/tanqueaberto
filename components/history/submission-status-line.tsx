"use client";

import { Check, Clock, AlertCircle, Eye, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportStatus } from "@/lib/types";

interface SubmissionStatusLineProps {
  status: ReportStatus | "stored";
  className?: string;
}

export function SubmissionStatusLine({ status, className }: SubmissionStatusLineProps) {
  const steps = [
    { id: "stored", label: "Guardado", icon: Clock },
    { id: "pending", label: "Moderando", icon: ShieldAlert },
    { id: "approved", label: "Público", icon: Eye },
  ];

  const getStatusIndex = (s: string) => {
    if (s === "stored") return 0;
    if (s === "pending") return 1;
    if (s === "approved") return 2;
    if (s === "rejected" || s === "flagged") return 1; // Staying in moderation step but with error
    return 0;
  };

  const currentIndex = getStatusIndex(status);
  const isError = status === "rejected" || status === "flagged";

  return (
    <div className={cn("flex items-center justify-between w-full max-w-xs mx-auto", className)}>
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const isPast = index < currentIndex;

        return (
          <div key={step.id} className="flex flex-col items-center gap-1 relative flex-1">
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className={cn(
                "absolute top-4 left-[60%] w-[80%] h-0.5 bg-white/10 z-0",
                index < currentIndex && "bg-green-500/50"
              )} />
            )}
            
            <div className={cn(
              "z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-500",
              isActive ? "bg-green-500 border-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "bg-zinc-900 border-white/10 text-white/40",
              isCurrent && isError && "bg-red-500 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]"
            )}>
              {isPast ? (
                <Check className="h-4 w-4 stroke-[3]" />
              ) : isCurrent && isError ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </div>
            <span className={cn(
              "text-[9px] font-bold uppercase tracking-wider transition-colors duration-500",
              isActive ? "text-white" : "text-white/20",
              isCurrent && isError && "text-red-400"
            )}>
              {isCurrent && isError ? (status === "rejected" ? "Recusado" : "Revisar") : step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
