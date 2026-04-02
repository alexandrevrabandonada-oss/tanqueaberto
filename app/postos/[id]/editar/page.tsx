import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, PencilLine, ShieldCheck } from "lucide-react";

import { requireStationEditorUser } from "@/lib/auth/admin";
import { getActiveStations, getStationDetailAdmin } from "@/lib/data/queries";
import { getTerritorialDuplicateCandidates } from "@/lib/ops/territorial-curation";
import { getStationLightEditAudit } from "@/lib/ops/station-light-edits";
import { StationLightEditForm } from "@/components/stations/station-light-edit-form";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeBR, formatRecencyLabel } from "@/lib/format/time";
import { getStationPublicName } from "@/lib/quality/stations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edição leve de posto | Bomba Aberta",
  description: "Corrija posto existente com acesso estreito e auditoria útil."
};

interface StationEditPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function readBanner(searchParams: Record<string, string | string[] | undefined>) {
  const notice = typeof searchParams.notice === "string" ? searchParams.notice : "";
  const error = typeof searchParams.error === "string" ? searchParams.error : "";

  if (notice === "saved") return "Edição leve salva.";
  if (notice === "saved_review") return "Edição salva e marcada para revisão.";
  if (notice === "duplicate_linked") return "Vínculo de duplicado salvo.";
  if (error === "station_not_found") return "Posto não encontrado.";
  if (error === "missing_nickname") return "Informe o apelido do posto.";
  if (error === "invalid_duplicate") return "Escolha um duplicado diferente deste posto.";
  if (error === "save_failed") return "Não foi possível salvar agora.";
  if (error === "invalid_request") return "Pedido inválido.";

  return null;
}

export default async function StationEditPage({ params, searchParams }: StationEditPageProps) {
  const editor = await requireStationEditorUser();
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const [station, catalog, audit] = await Promise.all([getStationDetailAdmin(id), getActiveStations(), getStationLightEditAudit(20)]);

  if (!station) {
    notFound();
  }

  const banner = readBanner(resolvedSearchParams);
  const rawReturnTo = typeof resolvedSearchParams.returnTo === "string" ? resolvedSearchParams.returnTo : "/postos";
  const returnTo = rawReturnTo.startsWith("/postos") ? (rawReturnTo as Route) : ("/postos" as Route);
  const duplicateMode = typeof resolvedSearchParams.mode === "string" && resolvedSearchParams.mode === "duplicate";
  const initialDuplicateOfStationId = typeof resolvedSearchParams.duplicateOfStationId === "string" ? resolvedSearchParams.duplicateOfStationId : undefined;
  const publicName = getStationPublicName(station);
  const duplicateCandidates = getTerritorialDuplicateCandidates(station, catalog, 3);
  const stationAudit = audit.recent.filter((item) => item.stationId === station.id).slice(0, 3);

  return (
    <div className="space-y-4 pb-16 pt-1">
      <SectionCard className="space-y-4 border-white/8 bg-black/25">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Acesso restrito</p>
            <h1 className="text-[2rem] font-semibold leading-none text-white">Editar posto existente</h1>
            <p className="max-w-2xl text-sm text-white/58">Use este fluxo para corrigir apelido, bandeira, rua, bairro e ajuste fino do local. Mudança sensível volta para revisão.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
            <ShieldCheck className="h-4 w-4 text-[color:var(--color-accent)]" />
            {editor.role === "station_editor" ? "station_editor" : "admin"}
          </div>
        </div>

        {duplicateMode ? (
          <div className="rounded-[18px] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
            Abrindo em modo duplicidade. A selecao de parecidos ja vem priorizada.
          </div>
        ) : null}

        {banner ? <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/74">{banner}</div> : null}

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[20px] border border-white/8 bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Posto</p>
            <p className="mt-2 text-lg font-semibold text-white">{publicName}</p>
            <p className="mt-1 text-sm text-white/54">{station.neighborhood} · {station.city}</p>
          </div>
          <div className="rounded-[20px] border border-white/8 bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Geo</p>
            <p className="mt-2 text-lg font-semibold text-white">{station.geoReviewStatus ?? "pending"}</p>
            <p className="mt-1 text-sm text-white/54">{station.geoConfidence ?? "low"}</p>
          </div>
          <div className="rounded-[20px] border border-white/8 bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Vínculo</p>
            <p className="mt-2 text-lg font-semibold text-white">{station.duplicateOfStationId ? "Duplicado ligado" : "Livre"}</p>
            <p className="mt-1 text-sm text-white/54">{station.duplicateOfStationId ? "Fica em revisão" : "Pode editar sem vínculo"}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="space-y-3 border-white/8 bg-black/25">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/42">Navegação</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Voltar ou seguir</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/postos/${station.id}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/74 hover:border-white/20 hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" />
              Abrir posto
            </Link>
            <Link href={returnTo} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/74 hover:border-white/20 hover:bg-white/10">
              <PencilLine className="h-4 w-4" />
              Voltar para lista
            </Link>
          </div>
        </div>
      </SectionCard>

      <StationLightEditForm station={station} duplicateCandidates={duplicateCandidates} notice={typeof resolvedSearchParams.notice === "string" ? resolvedSearchParams.notice : undefined} error={typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : undefined} returnToHref={returnTo} duplicateMode={duplicateMode} initialDuplicateOfStationId={initialDuplicateOfStationId} />

      <SectionCard className="space-y-3 border-white/8 bg-black/25">
        <div className="flex items-center gap-2">
          <PencilLine className="h-4 w-4 text-[color:var(--color-accent)]" />
          <h2 className="text-base font-semibold text-white">Edições recentes</h2>
        </div>
        {stationAudit.length === 0 ? (
          <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/58">Ainda não há edição leve para este posto.</div>
        ) : (
          <div className="space-y-2">
            {stationAudit.map((item) => (
              <div key={item.id} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/68">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{item.editorEmail}</p>
                    <p className="text-[11px] text-white/44">{formatRecencyLabel(item.createdAt)} · {formatDateTimeBR(item.createdAt)}</p>
                  </div>
                  <Badge variant={item.status === "saved" ? "accent" : item.status === "duplicate_linked" ? "warning" : "danger"}>{item.status}</Badge>
                </div>
                <p className="mt-2 text-[11px] text-white/46">{Object.keys(item.diff).join(" · ") || "Sem mudança detectada"}</p>
                {item.reason ? <p className="mt-1 text-[11px] text-white/54">{item.reason}</p> : null}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
