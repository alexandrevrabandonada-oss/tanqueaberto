import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { Check, LogOut, MessageSquareText, SlidersHorizontal, X } from "lucide-react";

import { moderateReportAction, signOutAdminAction, updateStationCurationAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { requireAdminUser } from "@/lib/auth/admin";
import { getModerationCounts, getModerationReports, getRecentModeratedReports, getStationReviewQueue } from "@/lib/data";
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
  if (notice === "station_saved") return "Curadoria territorial salva.";
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

  const [counts, reports, recentModerated, reviewQueue] = await Promise.all([
    getModerationCounts(),
    getModerationReports(selectedStatus as "all" | "pending" | "approved" | "rejected" | "flagged"),
    getRecentModeratedReports(),
    getStationReviewQueue()
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

      <SectionCard className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Operação</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Rotina e cobertura</h2>
          </div>
          <Link href="/admin/ops" className="text-sm text-[color:var(--color-accent)]">
            Abrir painel operacional
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <p className="text-base font-semibold text-white">Refresh e dossiês</p>
            <p className="mt-1 text-sm text-white/54">Executa a rotina analítica e gera a memória recorrente.</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <p className="text-base font-semibold text-white">Cobertura da base</p>
            <p className="mt-1 text-sm text-white/54">Mostra onde faltam leituras, histórico e densidade.</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <p className="text-base font-semibold text-white">Prioridade de coleta</p>
            <p className="mt-1 text-sm text-white/54">Lista os postos e corredores que pedem ativação.</p>
          </div>
        </div>
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
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Base</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Postos em revisão territorial</h2>
          </div>
          <Badge variant="warning">{reviewQueue.length} itens</Badge>
        </div>

        {reviewQueue.length === 0 ? (
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">Nenhum posto pendente de revisão agora.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {reviewQueue.map((station) => (
              <div key={station.id} className="space-y-4 rounded-[22px] border border-white/8 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">{station.name}</p>
                    <p className="text-sm text-white/50">
                      {station.neighborhood}, {station.city}
                    </p>
                  </div>
                  <Badge variant={station.geoReviewStatus === "manual_review" ? "danger" : "warning"}>
                    {station.geoReviewStatus === "manual_review" ? "Revisão manual" : "Pendente"}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm text-white/58">
                  <p>{station.address}</p>
                  <p>
                    Prioridade {station.priorityScore ?? 0} · Coordenada {station.geoConfidence ?? "desconhecida"}
                  </p>
                  <p>
                    Nome público: <span className="text-white/74">{station.namePublic ?? station.name}</span>
                  </p>
                  <p>
                    Nome oficial: <span className="text-white/52">{station.nameOfficial ?? station.name}</span>
                  </p>
                  {station.curationNote ? <p className="text-white/46">{station.curationNote}</p> : null}
                </div>

                <form action={updateStationCurationAction} className="space-y-3 rounded-[20px] border border-white/8 bg-black/20 p-4">
                  <input type="hidden" name="stationId" value={station.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-white/42">
                      <span>Nome público</span>
                      <input
                        name="namePublic"
                        defaultValue={station.namePublic ?? station.name}
                        className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
                      />
                    </label>
                    <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-white/42">
                      <span>Fonte geo</span>
                      <select
                        name="geoSource"
                        defaultValue={station.geoSource ?? "manual"}
                        className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none"
                      >
                        <option value="manual">Manual</option>
                        <option value="osm">OSM</option>
                        <option value="anp">ANP</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-white/42">
                      <span>Latitude</span>
                      <input
                        name="lat"
                        defaultValue={station.lat ?? ""}
                        inputMode="decimal"
                        className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
                      />
                    </label>
                    <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-white/42">
                      <span>Longitude</span>
                      <input
                        name="lng"
                        defaultValue={station.lng ?? ""}
                        inputMode="decimal"
                        className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-white/42">
                      <span>Confianca</span>
                      <select
                        name="geoConfidence"
                        defaultValue={station.geoConfidence ?? "low"}
                        className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none"
                      >
                        <option value="high">Alta</option>
                        <option value="medium">Média</option>
                        <option value="low">Baixa</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-white/42">
                      <span>Status</span>
                      <select
                        name="geoReviewStatus"
                        defaultValue={station.geoReviewStatus ?? "pending"}
                        className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none"
                      >
                        <option value="ok">Ok</option>
                        <option value="pending">Pendente</option>
                        <option value="manual_review">Revisão manual</option>
                      </select>
                    </label>
                  </div>

                  <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-white/42">
                    <span>Observação</span>
                    <textarea
                      name="curationNote"
                      rows={2}
                      defaultValue={station.curationNote ?? ""}
                      placeholder="Ex.: coordenada confirmada por logradouro"
                      className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
                    />
                  </label>

                  <Button type="submit" className="w-full">
                    Salvar revisão territorial
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}
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
