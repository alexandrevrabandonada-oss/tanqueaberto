import Link from "next/link";
import type { Metadata } from "next";
import type { Route } from "next";
import { MapPinPlus, PencilLine, Search, ShieldCheck, TriangleAlert } from "lucide-react";

import { getCurrentAdminUser } from "@/lib/auth/admin";
import { getStationEditorSessionFromCookie } from "@/lib/auth/station-editor-session";
import { StationEditorInviteAcceptForm } from "@/components/station/station-editor-invite-accept-form";
import { getStationEditorStationList } from "@/lib/ops/station-editor-station-list";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTimeBR, formatRecencyLabel } from "@/lib/format/time";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Postos | Bomba Aberta",
  description: "Lista operacional restrita para station_editor navegar, buscar e corrigir postos existentes."
};

interface StationManagerPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function hasEditorAccess(currentAdmin: Awaited<ReturnType<typeof getCurrentAdminUser>>, lightSession: Awaited<ReturnType<typeof getStationEditorSessionFromCookie>>) {
  return Boolean(currentAdmin || lightSession);
}

function readString(searchParams: Record<string, string | string[] | undefined>, key: string) {
  return typeof searchParams[key] === "string" ? String(searchParams[key]).trim() : "";
}

function readPage(searchParams: Record<string, string | string[] | undefined>) {
  const raw = Number(readString(searchParams, "page") || "1");
  return Number.isFinite(raw) ? Math.max(1, raw) : 1;
}

function formatMoney(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Sem preco";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function buildHref(baseParams: URLSearchParams, page: number) {
  const params = new URLSearchParams(baseParams);
  if (page > 1) {
    params.set("page", String(page));
  } else {
    params.delete("page");
  }

  const suffix = params.toString();
  return suffix ? (`/postos?${suffix}` as Route) : ("/postos" as Route);
}

function buildReturnTo(baseParams: URLSearchParams) {
  const suffix = baseParams.toString();
  return suffix ? `/postos?${suffix}` : "/postos";
}

function resolveBanner(searchParams: Record<string, string | string[] | undefined>) {
  const notice = readString(searchParams, "notice");
  const error = readString(searchParams, "error");

  if (notice === "invite_accepted") return "Sessao leve ativa neste aparelho. Agora voce pode navegar na base existente, corrigir e semear novos postos.";
  if (error === "session_expired") return "Sua sessao expirou. Entre novamente para continuar.";
  return null;
}

export default async function StationManagerPage({ searchParams }: StationManagerPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const currentAdmin = await getCurrentAdminUser();
  const lightSession = await getStationEditorSessionFromCookie();
  const inviteToken = readString(resolvedSearchParams, "token");
  const inviteCode = readString(resolvedSearchParams, "code");

  if (!hasEditorAccess(currentAdmin, lightSession)) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-6">
        <div className="w-full space-y-4">
          <SectionCard className="space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-10 w-10 text-[color:var(--color-accent)]" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">Acesso de campo</p>
                <h1 className="text-2xl font-semibold text-white">Station editor</h1>
              </div>
            </div>
            <p className="text-sm text-white/64">Recebeu convite leve? Confirme o codigo e o nome operacional para entrar direto na lista e na edicao leve. Nao precisa login do admin.</p>
            {inviteToken || inviteCode ? <div className="rounded-[16px] border border-[color:var(--color-accent)]/25 bg-[color:var(--color-accent)]/12 px-3 py-2 text-xs text-white/80">Convite detectado. Preencha os dados abaixo para ativar a sessao leve neste aparelho.</div> : null}
          </SectionCard>

          <SectionCard className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Entrar sem login</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Ativar acesso leve</h2>
            </div>

            <StationEditorInviteAcceptForm inviteToken={inviteToken} inviteCode={inviteCode} />

            <p className="text-xs text-white/48">Se voce recebeu o link por WhatsApp, ele deve abrir esta tela com token e codigo preenchidos. Depois de aceitar, a lista operacional aparece automaticamente em /postos.</p>
          </SectionCard>
        </div>
      </div>
    );
  }

  const q = readString(resolvedSearchParams, "q");
  const city = readString(resolvedSearchParams, "city");
  const neighborhood = readString(resolvedSearchParams, "neighborhood");
  const brand = readString(resolvedSearchParams, "brand");
  const price = readString(resolvedSearchParams, "price") === "recent" || readString(resolvedSearchParams, "price") === "without_recent" ? readString(resolvedSearchParams, "price") as "recent" | "without_recent" : "all";
  const review = readString(resolvedSearchParams, "review") === "review" ? "review" : "all";
  const page = readPage(resolvedSearchParams);

  const readout = await getStationEditorStationList({ q, city, neighborhood, brand, price, review, page, pageSize: 24 });
  const banner = resolveBanner(resolvedSearchParams);
  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (city) baseParams.set("city", city);
  if (neighborhood) baseParams.set("neighborhood", neighborhood);
  if (brand) baseParams.set("brand", brand);
  if (price !== "all") baseParams.set("price", price);
  if (review !== "all") baseParams.set("review", review);
  const returnTo = buildReturnTo(baseParams);
  const editorLabel = currentAdmin ? (currentAdmin.role === "station_editor" ? "station_editor" : "admin") : "station_editor";

  return (
    <div className="space-y-4 pb-16 pt-1">
      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Operacao restrita</p>
            <h1 className="text-[2rem] font-semibold leading-none text-white">Base de postos</h1>
            <p className="max-w-2xl text-sm text-white/58">Veja, busque e corrija postos ja cadastrados no Bomba Aberta sem abrir o admin total. O papel continua estreito e operacional.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
            <ShieldCheck className="h-4 w-4 text-[color:var(--color-accent)]" />
            {editorLabel}
          </div>
        </div>

        {banner ? <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/74">{banner}</div> : null}

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Lista filtrada</p>
            <p className="mt-2 text-2xl font-semibold text-white">{readout.summary.total}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Com preco recente</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">{readout.summary.recent}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Sem preco recente</p>
            <p className="mt-2 text-2xl font-semibold text-white">{readout.summary.withoutRecent}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Em revisao</p>
            <p className="mt-2 text-2xl font-semibold text-amber-300">{readout.summary.review}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/postos/cadastrar" className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-[color:var(--color-accent)]/18">
            <MapPinPlus className="h-4 w-4" />
            Semear posto novo
          </Link>
          <Link href="/postos/sem-atualizacao" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/78 hover:bg-white/10">
            <TriangleAlert className="h-4 w-4" />
            Ver sem preco recente
          </Link>
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-[color:var(--color-accent)]" />
          <h2 className="text-xl font-semibold text-white">Busca e filtros</h2>
        </div>

        <form action="/postos" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2 xl:col-span-3">
            <span className="text-xs uppercase tracking-[0.18em] text-white/42">Nome ou apelido</span>
            <input name="q" defaultValue={q} placeholder="Ex.: Shell Retiro ou Ale bairro x" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" />
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-white/42">Cidade</span>
            <input name="city" defaultValue={city} placeholder="Ex.: Volta Redonda" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" />
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-white/42">Bairro</span>
            <input name="neighborhood" defaultValue={neighborhood} placeholder="Ex.: Aterrado" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" />
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-white/42">Bandeira</span>
            <input name="brand" defaultValue={brand} placeholder="Ex.: Shell" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" />
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-white/42">Preco</span>
            <select name="price" defaultValue={price} className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none">
              <option value="all">Todos</option>
              <option value="recent">Com preco recente</option>
              <option value="without_recent">Sem preco recente</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-white/42">Revisao</span>
            <select name="review" defaultValue={review} className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none">
              <option value="all">Todos</option>
              <option value="review">So em revisao</option>
            </select>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end xl:col-span-3">
            <Button type="submit" className="sm:w-auto">Aplicar filtros</Button>
            <Link href="/postos" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/74 transition hover:bg-white/10">
              Limpar
            </Link>
          </div>
        </form>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Lista operacional</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Postos ja cadastrados</h2>
          </div>
          <Badge variant="outline">Pagina {readout.pagination.page}/{readout.pagination.totalPages}</Badge>
        </div>

        {readout.items.length === 0 ? (
          <div className="rounded-[18px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">Nenhum posto encontrado com esse recorte.</div>
        ) : (
          <div className="space-y-3">
            {readout.items.map((item) => {
              const duplicateRisk = item.duplicateCandidates.length > 0;
              const duplicateTarget = item.duplicateCandidates[0]?.stationId ?? "";
              const editHref = `/postos/${item.station.id}/editar?returnTo=${encodeURIComponent(returnTo)}` as Route;
              const duplicateHref = duplicateRisk && duplicateTarget ? `/postos/${item.station.id}/editar?${new URLSearchParams({ returnTo, mode: "duplicate", duplicateOfStationId: duplicateTarget }).toString()}` as Route : editHref;
              const viewHref = `/postos/${item.station.id}` as Route;

              return (
                <div key={item.station.id} className="space-y-3 rounded-[18px] border border-white/8 bg-black/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-white">{item.publicName}</h3>
                        <Badge variant={item.statusTone}>{item.statusLabel}</Badge>
                        {duplicateRisk ? <Badge variant="warning">suspeita de duplicidade</Badge> : null}
                      </div>
                      <p className="text-sm text-white/54">{item.station.brand || "Sem bandeira"} · {item.station.neighborhood || "Sem bairro"} · {item.station.city || "Sem cidade"}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-white/48">
                        <span>Visibilidade: {item.station.visibilityStatus ?? "review"}</span>
                        <span>Geo: {item.station.geoReviewStatus ?? "pending"}</span>
                        {item.station.duplicateOfStationId ? <span>Vinculado como duplicado</span> : null}
                      </div>
                    </div>
                    <div className="min-w-[180px] rounded-[16px] border border-white/8 bg-black/25 px-3 py-3 text-sm">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Ultimo preco</p>
                      <p className="mt-2 text-base font-semibold text-white">{formatMoney(item.latestPrice)}</p>
                      <p className="mt-1 text-xs text-white/52">{item.latestFuelType ? item.latestFuelType.replaceAll("_", " ") : "Sem envio aprovado"}</p>
                      <p className="mt-1 text-xs text-white/52">{item.latestPriceReportedAt ? `${formatRecencyLabel(item.latestPriceReportedAt)} · ${formatDateTimeBR(item.latestPriceReportedAt)}` : "Sem preco"}</p>
                    </div>
                  </div>

                  {duplicateRisk ? (
                    <div className="rounded-[16px] border border-amber-400/20 bg-amber-400/10 px-3 py-3 text-xs text-amber-50">
                      <p className="font-semibold">Parecidos encontrados:</p>
                      <p className="mt-1 text-amber-50/72">{item.duplicateCandidates.map((candidate) => `${candidate.publicName} (${candidate.reason})`).join(" · ")}</p>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link href={viewHref} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/74 transition hover:bg-white/10 sm:w-auto">
                      Ver posto
                    </Link>
                    <Link href={editHref} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/74 transition hover:bg-white/10 sm:w-auto">
                      <PencilLine className="h-4 w-4" />
                      Editar leve
                    </Link>
                    {duplicateRisk ? (
                      <Link href={duplicateHref} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-sm font-semibold text-amber-50 transition hover:bg-amber-400/15 sm:w-auto">
                        Marcar duplicidade
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {readout.pagination.totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-3">
            <Link href={buildHref(baseParams, Math.max(1, readout.pagination.page - 1))} className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition ${readout.pagination.hasPreviousPage ? "border-white/10 bg-white/5 text-white/74 hover:bg-white/10" : "pointer-events-none border-white/5 bg-white/5 text-white/24"}`}>
              Pagina anterior
            </Link>
            <p className="text-xs text-white/46">Mostrando {readout.items.length} de {readout.summary.total} postos filtrados.</p>
            <Link href={buildHref(baseParams, Math.min(readout.pagination.totalPages, readout.pagination.page + 1))} className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition ${readout.pagination.hasNextPage ? "border-white/10 bg-white/5 text-white/74 hover:bg-white/10" : "pointer-events-none border-white/5 bg-white/5 text-white/24"}`}>
              Proxima pagina
            </Link>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
