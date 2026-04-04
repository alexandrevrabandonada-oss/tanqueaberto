import Image from "next/image";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, PencilLine, ShieldAlert, ShieldCheck, X } from "lucide-react";

import { updatePriceReportAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { requireAdminUser } from "@/lib/auth/admin";
import { getReportByIdAdmin } from "@/lib/data/queries";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatDateTimeBR, formatRecencyLabel } from "@/lib/format/time";
import { fuelLabels, reportStatusLabels } from "@/lib/format/labels";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editar report | Bomba Aberta",
  description: "Ajuste preço, combustível e status de um report, mesmo após aprovação."
};

const routingLabels = {
  review_normal: "Revisão normal",
  fast_lane: "Fast-lane",
  auto_approved: "Autoaprovado"
} as const;

const riskLabels = {
  low: "Risco baixo",
  medium: "Risco moderado",
  high: "Risco alto"
} as const;

interface AdminReportEditPageProps {
  params: Promise<{ reportId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function readBanner(searchParams: Record<string, string | string[] | undefined>) {
  const notice = typeof searchParams.notice === "string" ? searchParams.notice : "";
  const error = typeof searchParams.error === "string" ? searchParams.error : "";

  if (notice === "saved") return "Report salvo.";
  if (notice === "approved") return "Report salvo e aprovado.";
  if (notice === "rejected") return "Report salvo e rejeitado.";
  if (error === "report_not_found") return "Report não encontrado.";
  if (error === "invalid_price") return "Informe um preço válido.";
  if (error === "invalid_fuel") return "Selecione um combustível válido.";
  if (error === "save_failed") return "Não foi possível salvar agora.";
  if (error === "invalid_request") return "Pedido inválido.";

  return null;
}

function hasUsableImageSrc(src: string | null | undefined) {
  const value = String(src ?? "").trim();
  return value.startsWith("https://") || value.startsWith("http://") || value.startsWith("/");
}

export default async function AdminReportEditPage({ params, searchParams }: AdminReportEditPageProps) {
  await requireAdminUser();
  const { reportId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const report = await getReportByIdAdmin(reportId);

  if (!report) {
    notFound();
  }

  const banner = readBanner(resolvedSearchParams);

  return (
    <div className="space-y-4 pb-12 pt-1">
      <SectionCard className="space-y-4 border-white/8 bg-black/25">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Moderação</p>
            <h1 className="text-[2rem] font-semibold leading-none text-white">Editar report</h1>
            <p className="max-w-2xl text-sm text-white/58">Altere o preço, combustível ou apelido deste envio. Se o report já estiver aprovado, a edição continua valendo e a fila pública é atualizada.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
            {report.status === "approved" ? <ShieldCheck className="h-4 w-4 text-green-400" /> : <ShieldAlert className="h-4 w-4 text-[color:var(--color-accent)]" />}
            {reportStatusLabels[report.status]}
          </div>
        </div>

        {banner ? <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/74">{banner}</div> : null}

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[20px] border border-white/8 bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Posto</p>
            <p className="mt-2 text-lg font-semibold text-white">{report.station.name}</p>
            <p className="mt-1 text-sm text-white/54">{report.station.neighborhood} · {report.station.city}</p>
          </div>
          <div className="rounded-[20px] border border-white/8 bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Preço atual</p>
            <p className="mt-2 text-lg font-semibold text-white">{formatCurrencyBRL(report.price)}</p>
            <p className="mt-1 text-sm text-white/54">Enviado {formatRecencyLabel(report.reportedAt)}</p>
          </div>
          <div className="rounded-[20px] border border-white/8 bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Status</p>
            <p className="mt-2 text-lg font-semibold text-white">{reportStatusLabels[report.status]}</p>
            <p className="mt-1 text-sm text-white/54">{report.approvedAt ? `Aprovado em ${formatDateTimeBR(report.approvedAt)}` : report.rejectedAt ? `Rejeitado em ${formatDateTimeBR(report.rejectedAt)}` : `Criado em ${formatDateTimeBR(report.createdAt)}`}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[20px] border border-white/8 bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Confiança</p>
            <p className="mt-2 text-lg font-semibold text-white">{report.contributorTrustLevel ?? "N0"}</p>
            <p className="mt-1 text-sm text-white/54">{report.contributorTrustReasons?.[0] ?? "Sem motivo detalhado salvo."}</p>
          </div>
          <div className="rounded-[20px] border border-white/8 bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Saída</p>
            <p className="mt-2 text-lg font-semibold text-white">{routingLabels[report.submissionRouting ?? "review_normal"]}</p>
            <p className="mt-1 text-sm text-white/54">{report.submissionRoutingReasons?.[0] ?? "Fluxo padrão de revisão."}</p>
          </div>
          <div className="rounded-[20px] border border-white/8 bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Risco</p>
            <p className="mt-2 text-lg font-semibold text-white">{riskLabels[report.submissionRiskLevel ?? "medium"]}</p>
            <p className="mt-1 text-sm text-white/54">{report.submissionRiskReasons?.[0] ?? "Sem motivo detalhado salvo."}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="space-y-4 border-white/8 bg-black/25">
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <div className="overflow-hidden rounded-[22px] border border-white/8 bg-black/20">
            {hasUsableImageSrc(report.photoUrl) ? (
              <Image src={report.photoUrl} alt={`Foto enviada de ${report.station.name}`} width={640} height={480} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-64 w-full items-center justify-center bg-black/30 text-xs uppercase tracking-[0.18em] text-white/34">
                Sem foto válida
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2 rounded-[22px] border border-white/8 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/42">Resumo</p>
              <p className="text-sm text-white/68">{fuelLabels[report.fuelType]} · {formatCurrencyBRL(report.price)} · {formatRecencyLabel(report.reportedAt)}</p>
              <p className="text-sm text-white/52">Apelido: {report.reporterNickname ?? "anônimo"}</p>
              <p className="text-sm text-white/52">ID do report: {report.id}</p>
              <p className="text-sm text-white/52">Histórico curto: {report.contributorHistorySummary?.join(" · ") ?? "Sem histórico curto agregado."}</p>
              <p className="text-sm text-white/52">Fase do rollout: {String(report.metadata?.progressive_trust_rollout_phase ?? "2")} · {String(report.metadata?.progressive_trust_rollout_label ?? "fase_2_fast_lane")}</p>
              <p className="text-sm text-white/52">Motivo principal da rota: {report.submissionRoutingReasons?.[0] ?? "Fluxo padrão de revisão."}</p>
            </div>

            <form action={updatePriceReportAction} className="space-y-4 rounded-[22px] border border-white/8 bg-black/20 p-4">
              <input type="hidden" name="reportId" value={report.id} />

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-white/42">Combustível</span>
                  <select name="fuelType" defaultValue={report.fuelType} className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none">
                    {Object.entries(fuelLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-white/42">Preço</span>
                  <input name="price" defaultValue={report.price} inputMode="decimal" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none" />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-white/42">Apelido</span>
                  <input name="reporterNickname" defaultValue={report.reporterNickname ?? ""} className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none" placeholder="Opcional" />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-white/42">Nota de moderação</span>
                <textarea name="moderationNote" rows={3} defaultValue={report.moderationNote ?? ""} placeholder="Ex.: preço ajustado manualmente após revisão" className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" />
              </label>

              <div className="grid gap-3 md:grid-cols-3">
                <Button type="submit" name="decision" value="save" className="w-full">
                  <PencilLine className="h-4 w-4" />
                  Salvar edição
                </Button>
                <Button type="submit" name="decision" value="approved" variant="accent" className="w-full">
                  <Check className="h-4 w-4" />
                  Salvar e aprovar
                </Button>
                <Button type="submit" name="decision" value="rejected" variant="secondary" className="w-full border-[color:var(--color-danger)]/30 text-[color:var(--color-danger)]">
                  <X className="h-4 w-4" />
                  Salvar e rejeitar
                </Button>
              </div>
            </form>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="space-y-4 border-white/8 bg-black/25">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Atalhos</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Abrir o posto ou voltar para a fila</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/admin?status=${report.status}` as Route} variant="secondary" className="h-9 px-3 text-[10px] font-bold uppercase tracking-[0.16em]">
              <ArrowLeft className="h-4 w-4" />
              Voltar à fila
            </ButtonLink>
            <ButtonLink href={`/postos/${report.stationId}` as Route} variant="secondary" className="h-9 px-3 text-[10px] font-bold uppercase tracking-[0.16em]">
              Ver posto
            </ButtonLink>
            <ButtonLink href={`/postos/${report.stationId}/editar` as Route} variant="secondary" className="h-9 px-3 text-[10px] font-bold uppercase tracking-[0.16em]">
              Editar posto
            </ButtonLink>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}





