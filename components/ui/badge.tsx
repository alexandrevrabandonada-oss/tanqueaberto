import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "warning" | "danger" | "outline";
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
        variant === "default" && "bg-[color:var(--color-accent)] text-black",
        variant === "warning" && "bg-white/10 text-[color:var(--color-accent)] ring-1 ring-white/10",
        variant === "danger" && "bg-[color:var(--color-danger)]/15 text-[color:var(--color-danger)]",
        variant === "outline" && "border border-white/12 text-[color:var(--color-text)]"
      )}
    >
      {children}
    </span>
  );
}
