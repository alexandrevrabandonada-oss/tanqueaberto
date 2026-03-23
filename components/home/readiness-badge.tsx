import { cn } from "@/lib/utils";
import { type GroupReleaseStatus } from "@/lib/ops/release-types";

interface ReadinessBadgeProps {
  status: GroupReleaseStatus;
  className?: string;
  showText?: boolean;
}

export function ReadinessBadge({ status, className, showText = true }: ReadinessBadgeProps) {
  const config = {
    ready: { label: "Forte", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" },
    validating: { label: "Validando", color: "bg-blue-500/20 text-blue-400 border-blue-500/20" },
    limited: { label: "Em formação", color: "bg-orange-500/20 text-orange-400 border-orange-500/20" },
    hidden: { label: "Oculto", color: "bg-white/10 text-white/40 border-white/10" }
  };

  const { label, color } = config[status] ?? config.limited;

  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
      color,
      className
    )}>
      <span className="mr-1.5 flex h-1 w-1 rounded-full bg-current" />
      {showText ? label : ""}
    </span>
  );
}
