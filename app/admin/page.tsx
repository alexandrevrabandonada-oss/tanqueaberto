import { Check, Clock3, X } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { recentUpdates, stations } from "@/lib/mock-data";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function AdminPage() {
  const pending = recentUpdates.filter((report) => report.status === "pending");

  return (
    <AppShell>
      <SectionCard className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-white/42">Moderacao</p>
        <h2 className="text-[1.8rem] font-semibold leading-none text-white">Painel admin</h2>
        <p className="text-sm text-white/58">Fila inicial pronta para ligar com auth + RLS.</p>
      </SectionCard>

      <SectionCard className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Pendentes</p>
          <p className="mt-3 text-3xl font-semibold text-white">{pending.length}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Aprovados</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {recentUpdates.filter((report) => report.status === "approved").length}
          </p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Flagged</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {recentUpdates.filter((report) => report.status === "flagged").length}
          </p>
        </div>
      </SectionCard>

      <div className="space-y-3">
        {pending.map((report) => {
          const station = stations.find((item) => item.id === report.stationId);

          return (
            <SectionCard key={report.id} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{station?.name}</p>
                  <p className="text-sm text-white/50">{formatDateTime(report.reportedAt)}</p>
                </div>
                <Badge variant="outline">pending</Badge>
              </div>
              <div className="flex items-center justify-between rounded-[22px] border border-white/8 bg-black/30 px-4 py-3">
                <div>
                  <p className="text-sm text-white/54">Preco enviado</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{formatCurrency(report.price)}</p>
                </div>
                <Clock3 className="h-5 w-5 text-[color:var(--color-accent)]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--color-accent)] px-4 py-3 text-sm font-semibold text-black"
                >
                  <Check className="h-4 w-4" />
                  Aprovar
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/10 px-4 py-3 text-sm font-semibold text-[color:var(--color-danger)]"
                >
                  <X className="h-4 w-4" />
                  Rejeitar
                </button>
              </div>
            </SectionCard>
          );
        })}
      </div>
    </AppShell>
  );
}
