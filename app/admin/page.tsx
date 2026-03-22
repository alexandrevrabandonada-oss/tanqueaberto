import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { Check, LogOut, MessageSquareText, SlidersHorizontal, X } from "lucide-react";

import { moderateReportAction, signOutAdminAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { requireAdminUser } from "@/lib/auth/admin";
import { getModerationCounts, getModerationReports, getRecentModeratedReports } from "@/lib/data";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatDateTimeBR, formatRecencyLabel } from "@/lib/format/time";
import { fuelLabels, reportStatusLabels } from "@/lib/format/labels";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "approved", label: "Aprovados" },
  { value: "rejected", label: "Rejeitados" },
  { value: "flagged", label: "Sinalizados" }
] as const;

function resolveNotice(searchParams?: Record<string, string | string[] | undefined>) {
  const notice = typeof searchParams?.notice === "string" ? searchParams.notice : "";
  const error = typeof searchParams?.error === "string" ? searchParams.error : "";

  if (notice === "approved") return "Report aprovado.";
  if (notice === "rejected") return "Report rejeitado.";
  if (error === "moderation_failed") return "Não foi possível salvar a moderação.";
  if (error === "report_not_found") return "Report não encontrado.";
  if (error === "invalid_request") return "Pedido inválido.";

  return null;
}

interface AdminPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdminUser();
  const resolvedSearchParams = (await searchParams) ?? {};

  const selectedStatus =
    typeof resolvedSearchParams.status === "string" && statusOptions.some((option) => option.value === resolvedSearchParams.status)
      ? resolvedSearchParams.status
      : "pending";

  const [counts, reports, recentModerated] = await Promise.all([
    getModerationCounts(),
    getModerationReports(selectedStatus as "all" | "pending" | "approved" | "rejected" | "flagged"),
    getRecentModeratedReports()
  ]);

  const banner = resolveNotice(resolvedSearchParams);

  return (
    <div className="space-y-4 pb-10 pt-1">
      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Moderação</p>
            <h1 className="text-[2rem] font-semibold leading-none text-white">Painel admin</h1>
            <p className="max-w-xl text-sm text-white/58">Fila restrita para aprovar ou rejeitar envios pendentes com segurança mínima real.</p>
          </div>

          <form action={signOutAdminAction}>
            <Button type="submit" variant="secondary" className="w-full sm:w-auto">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </form>
        </div>

        {banner ? <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/74">{banner}</div> : null}
      </SectionCard>

      <SectionCard className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Pendentes", value: counts.pending },
          { label: "Aprovados", value: counts.approved },
          { label: "Rejeitados", value: counts.rejected },
          { label: "Sinalizados", value: counts.flagged }
        ].map((item) => (
          <div key={item.label} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Filtro</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Fila de moderação</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => {
              const active = option.value === selectedStatus;
              const href = (option.value === "pending" ? "/admin" : `/admin?status=${option.value}`) as Route;

              return (
                <Link
                  key={option.value}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                    active ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-black" : "border-white/10 bg-white/5 text-white/72 hover:border-white/18"
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">Nenhum report neste filtro agora.</div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <SectionCard key={report.id} className="space-y-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{report.station.name}</p>
                    <p className="text-sm text-white/50">
                      {report.station.neighborhood}, {report.station.city}
                    </p>
                  </div>
                  <Badge variant={report.status === "approved" ? "default" : report.status === "rejected" ? "danger" : "warning"}>
                    {reportStatusLabels[report.status]}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                  <div className="overflow-hidden rounded-[20px] border border-white/8 bg-black/20">
                    <Image src={report.photoUrl} alt={`Foto enviada de ${report.station.name}`} width={640} height={480} className="h-40 w-full object-cover" />
                  </div>

                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/42">Combustível</p>
                        <p className="mt-1 text-base font-medium text-white">{fuelLabels[report.fuelType]}</p>
                      </div>
                      <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/42">Preço</p>
                        <p className="mt-1 text-2xl font-semibold text-white">{formatCurrencyBRL(report.price)}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
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

                    <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/42">Nota de moderação</p>
                      <p className="mt-1 text-sm text-white/56">{report.moderationNote ?? "Nenhuma nota ainda."}</p>
                    </div>
                  </div>
                </div>

                <form action={moderateReportAction} className="space-y-3 rounded-[22px] border border-white/8 bg-black/20 p-4">
                  <input type="hidden" name="reportId" value={report.id} />
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-white/42" htmlFor={`moderationNote-${report.id}`}>
                      Nota opcional
                    </label>
                    <textarea
                      id={`moderationNote-${report.id}`}
                      name="moderationNote"
                      rows={2}
                      placeholder="Ex.: foto legível, preço confere"
                      className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-white/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button type="submit" name="decision" value="approved" className="w-full">
                      <Check className="h-4 w-4" />
                      Aprovar
                    </Button>
                    <Button type="submit" name="decision" value="rejected" variant="secondary" className="w-full border-[color:var(--color-danger)]/30 text-[color:var(--color-danger)]">
                      <X className="h-4 w-4" />
                      Rejeitar
                    </Button>
                  </div>
                </form>
              </SectionCard>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Recentes</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Moderados agora</h2>
          </div>
          <MessageSquareText className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>

        {recentModerated.length === 0 ? (
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">Ainda não há histórico recente.</div>
        ) : (
          <div className="space-y-3">
            {recentModerated.map((report) => (
              <div key={report.id} className="rounded-[22px] border border-white/8 bg-black/20 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{report.station.name}</p>
                    <p className="text-xs text-white/44">
                      {report.station.neighborhood}, {report.station.city}
                    </p>
                  </div>
                  <Badge variant={report.status === "approved" ? "default" : "danger"}>{reportStatusLabels[report.status]}</Badge>
                </div>
                <p className="mt-2 text-sm text-white/58">
                  {fuelLabels[report.fuelType]} · {formatCurrencyBRL(report.price)} · {formatRecencyLabel(report.reportedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
