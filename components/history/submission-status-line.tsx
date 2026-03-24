import { Check, Clock, AlertCircle, Eye, ShieldAlert, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportStatus } from "@/lib/types";

interface SubmissionStatusLineProps {
  status: ReportStatus | "stored";
  submittedAt?: string;
  moderatedAt?: string | null;
  className?: string;
}

export function SubmissionStatusLine({ status, submittedAt, moderatedAt, className }: SubmissionStatusLineProps) {
  const steps = [
    { id: "submitted", label: "Enviado", icon: Clock },
    { id: "moderating", label: "Fila", icon: ShieldAlert },
    { id: "audited", label: "Auditado", icon: AlertCircle },
    { id: "visible", label: "Mapa", icon: Map },
  ];

  const getStatusIndex = (s: string) => {
    if (s === "stored" || s === "submitted") return 0;
    if (s === "pending") return 1;
    if (s === "approved" || s === "rejected" || s === "flagged") return 2;
    if (s === "approved") return 3; // Special case handled below
    return 0;
  };

  let currentIndex = getStatusIndex(status);
  if (status === "approved") currentIndex = 3; // Fully public

  const isError = status === "rejected" || status === "flagged";

  return (
    <div className={cn("flex items-center justify-between w-full max-w-sm mx-auto px-2", className)}>
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const isPast = index < currentIndex;
        
        // Logical check for visibility
        if (step.id === 'visible' && status !== 'approved') return null;

        return (
          <div key={step.id} className="flex flex-col items-center gap-1 relative flex-1">
            {/* Connector Line */}
            {index < (status === 'approved' ? 3 : 2) && index < steps.length - 1 && (
              <div className={cn(
                "absolute top-4 left-[60%] w-[80%] h-0.5 bg-white/10 z-0",
                index < currentIndex && "bg-green-500/50"
              )} />
            )}
            
            <div className={cn(
              "z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-500",
              isActive ? "bg-green-500 border-green-500 text-black shadow-[0_0_12px_rgba(34,197,94,0.3)]" : "bg-zinc-900 border-white/10 text-white/40",
              isCurrent && isError && "bg-red-500 border-red-500 text-white"
            )}>
              {isPast ? (
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              ) : isCurrent && isError ? (
                <AlertCircle className="h-3.5 w-3.5" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
            </div>
            <div className="flex flex-col items-center">
              <span className={cn(
                "text-[8px] font-black uppercase tracking-tighter transition-colors duration-500",
                isActive ? "text-white" : "text-white/20",
                isCurrent && isError && "text-red-400"
              )}>
                {isCurrent && isError ? (status === "rejected" ? "Recusado" : "Revisar") : step.label}
              </span>
              {index === 0 && submittedAt && (
                <span className="text-[7px] text-white/20 font-mono">
                  {new Date(submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {index === 2 && moderatedAt && (
                <span className="text-[7px] text-white/20 font-mono">
                  {new Date(moderatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
