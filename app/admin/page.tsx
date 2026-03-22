import Image from "next/image";
import { Check, X } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { approveReportAction, rejectReportAction } from "@/app/admin/actions";
import { getModerationCounts, getPendingReports } from "@/lib/data";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatDateTimeBR, formatRecencyLabel } from "@/lib/format/time";
import { reportStatusLabels, fuelLabels } from "@/lib/format/labels";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [counts, pending] = await Promise.all([getModerationCounts(), getPendingReports()]);

  return (
    <AppShell>
      <SectionCard className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-white/42">Moderação</p>
        <h2 className="text-[1.8rem] font-semibold leading-none text-white">Painel admin</h2>
        <p className="text-sm text-white/58">Fila funcional mínima para aprovar ou rejeitar envios pendentes.</p>
      </SectionCard>

      <SectionCard className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Pendentes</p>
          <p className="mt-3 text-3xl font-semibold text-white">{counts.pending}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Aprovados</p>
          <p className="mt-3 text-3xl font-semibold text-white">{counts.approved}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Rejeitados</p>
          <p className="mt-3 text-3xl font-semibold text-white">{counts.rejected}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Sinalizados</p>
          <p className="mt-3 text-3xl font-semibold text-white">{counts.flagged}</p>
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Fila</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Aguardando moderação</h3>
        </div>

        <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">
              Nenhum envio pendente agora.
            </div>
          ) : (
            pending.map((report) => (
              <SectionCard key={report.id} className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{report.station.name}</p>
                    <p className="text-sm text-white/50">
                      {report.station.neighborhood}, {report.station.city}
                    </p>
                  </div>
                  <Badge variant="warning">{reportStatusLabels.pending}</Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                  <div className="overflow-hidden rounded-[20px] border border-white/8 bg-black/20">
                    <Image src={report.photoUrl} alt={`Foto enviada de ${report.station.name}`} width={640} height={480} className="h-40 w-full object-cover" />
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/42">Combustível</p>
                      <p className="mt-1 text-base font-medium text-white">{fuelLabels[report.fuelType]}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/42">Preço</p>
                      <p className="mt-1 text-2xl font-semibold text-white">{formatCurrencyBRL(report.price)}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/42">Enviado em</p>
                      <p className="mt-1 text-sm text-white/68">{formatDateTimeBR(report.reportedAt)}</p>
                      <p className="mt-2 text-xs text-white/44">{formatRecencyLabel(report.reportedAt)}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/42">Apelido</p>
                      <p className="mt-1 text-sm text-white/68">{report.reporterNickname ?? "anônimo"}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <form action={approveReportAction}>
                    <input type="hidden" name="reportId" value={report.id} />
                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--color-accent)] px-4 py-3 text-sm font-semibold text-black"
                    >
                      <Check className="h-4 w-4" />
                      Aprovar
                    </button>
                  </form>
                  <form action={rejectReportAction}>
                    <input type="hidden" name="reportId" value={report.id} />
                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/10 px-4 py-3 text-sm font-semibold text-[color:var(--color-danger)]"
                    >
                      <X className="h-4 w-4" />
                      Rejeitar
                    </button>
                  </form>
                </div>
              </SectionCard>
            ))
          )}
        </div>
      </SectionCard>
    </AppShell>
  );
}
