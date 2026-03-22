import { cn } from "@/lib/utils";

interface OpsMetricCardProps {
  label: string;
  value: string | number;
  note?: string;
  tone?: "accent" | "default" | "warning" | "danger";
}

export function OpsMetricCard({ label, value, note, tone = "default" }: OpsMetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-[22px] border p-4",
        tone === "accent" ? "border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/10" : "border-white/8 bg-black/30",
        tone === "warning" && "border-[color:var(--color-warning)]/30 bg-[color:var(--color-warning)]/10",
        tone === "danger" && "border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/10"
      )}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-white/42">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      {note ? <p className="mt-2 text-xs text-white/48">{note}</p> : null}
    </div>
  );
}
