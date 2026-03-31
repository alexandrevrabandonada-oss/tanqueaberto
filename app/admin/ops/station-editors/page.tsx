import Link from "next/link";
import type { Metadata } from "next";
import type { Route } from "next";
import { ArrowUpRight, MapPinPlus, ShieldCheck, ShieldOff, Users } from "lucide-react";

import { createStationEditorInviteAction, grantStationEditorRoleAction, revokeStationEditorInviteAction, revokeStationEditorRoleAction } from "@/app/admin/actions";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyTextButton } from "@/components/ui/copy-text-button";
import { requireAdminUser } from "@/lib/auth/admin";
import { getStationEditorRoster } from "@/lib/ops/station-editors";
import { getStationEditorInviteReadout } from "@/lib/ops/station-editor-invites";
import { getStationLightEditAudit } from "@/lib/ops/station-light-edits";
import { TerritoryWorkflowControls } from "@/components/admin/ops/territory-workflow-controls";
import { buildTerritoryWorkflowReturnTo, getTerritoryWorkflowReadout, resolveTerritoryWorkflowState } from "@/lib/ops/territory-workflow";
import { formatDateTimeBR, formatRecencyLabel } from "@/lib/format/time";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Station editors | Bomba Aberta",
  description: "Gestao restrita do papel estreito de cadastro e semeadura de postos."
};

interface StationEditorsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function getBanner(searchParams: Record<string, string | string[] | undefined>) {
  const notice = typeof searchParams.notice === "string" ? searchParams.notice : "";
  const error = typeof searchParams.error === "string" ? searchParams.error : "";

  if (notice === "role_granted") return "Papel station_editor concedido.";
  if (notice === "role_revoked") return "Papel station_editor removido.";
  if (notice === "invite_created") return "Convite leve criado para station_editor.";
  if (notice === "invite_revoked") return "Convite leve revogado e sessoes vinculadas encerradas.";
  if (error === "grant_failed") return "Nao foi possivel conceder o papel.";
  if (error === "revoke_failed") return "Nao foi possivel remover o papel.";
  if (error === "invite_schema_missing") return "Schema de convites ainda nao aplicado no banco de producao.";
  if (error === "invite_create_failed") return "Nao foi possivel criar o convite agora.";
  if (error === "invite_revoke_failed") return "Nao foi possivel revogar o convite agora.";
  if (error === "invalid_request") return "Pedido invalido.";

  return null;
}

function readTerritory(searchParams: Record<string, string | string[] | undefined>) {
  const city = typeof searchParams.city === "string" ? searchParams.city.trim() : "";
  const neighborhood = typeof searchParams.neighborhood === "string" ? searchParams.neighborhood.trim() : "";
  const territoryContext = typeof searchParams.territoryContext === "string" ? searchParams.territoryContext : "";
  return { city, neighborhood, territoryContext };
}

function buildSeedHref(city: string, neighborhood?: string | null) {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (neighborhood) params.set("neighborhood", neighborhood);
  params.set("seedOrigin", "territorial_coverage");
  return `/postos/cadastrar?${params.toString()}` as Route;
}

function buildCoverageHref(city?: string, neighborhood?: string) {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (neighborhood) params.set("neighborhood", neighborhood);
  if (city || neighborhood) params.set("territoryContext", "station_editor");
  const suffix = params.toString();
  return suffix ? (`/admin/ops/cobertura-territorial?${suffix}` as Route) : ("/admin/ops/cobertura-territorial" as Route);
}

function buildQualityHref(city?: string, neighborhood?: string) {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (neighborhood) params.set("neighborhood", neighborhood);
  if (city || neighborhood) params.set("territoryContext", "station_editor");
  const suffix = params.toString();
  return suffix ? (`/admin/ops/qualidade?${suffix}` as Route) : ("/admin/ops/qualidade" as Route);
}

function buildEditorsHref(city?: string, neighborhood?: string) {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (neighborhood) params.set("neighborhood", neighborhood);
  if (city || neighborhood) params.set("territoryContext", "station_editor");
  const suffix = params.toString();
  return suffix ? (`/admin/ops/station-editors?${suffix}` as Route) : ("/admin/ops/station-editors" as Route);
}

function buildNoUpdateHref(city?: string, neighborhood?: string) {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (neighborhood) params.set("neighborhood", neighborhood);
  if (city || neighborhood) params.set("territoryContext", "station_editor");
  const suffix = params.toString();
  return suffix ? (`/postos/sem-atualizacao?${suffix}` as Route) : ("/postos/sem-atualizacao" as Route);
}

export default async function StationEditorsPage({ searchParams }: StationEditorsPageProps) {
  await requireAdminUser();
  const resolvedSearchParams = (await searchParams) ?? {};
  const territory = readTerritory(resolvedSearchParams);
  const [roster, inviteReadout, lightEditAudit] = await Promise.all([
    getStationEditorRoster(territory.city || territory.neighborhood ? { city: territory.city || null, neighborhood: territory.neighborhood || null } : undefined),
    getStationEditorInviteReadout(40),
    getStationLightEditAudit(20, territory.city || territory.neighborhood ? { city: territory.city || null, neighborhood: territory.neighborhood || null } : undefined)
  ]);
  const workflowReadout = await getTerritoryWorkflowReadout(120);
  const currentWorkflow = territory.city || territory.neighborhood ? resolveTerritoryWorkflowState(workflowReadout.records, territory.city || undefined, territory.neighborhood || undefined) : null;
  const banner = getBanner(resolvedSearchParams);
  const territoryLabel = territory.neighborhood || territory.city || "";

  return (
    <div className="space-y-4 pb-16 pt-1">
      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Operacao restrita</p>
            <h1 className="text-[2rem] font-semibold leading-none text-white">Station editors</h1>
            <p className="max-w-2xl text-sm text-white/58">Papel estreito para semear postos. Admin total continua separado.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
            <ShieldCheck className="h-4 w-4 text-[color:var(--color-accent)]" />
            Admin total apenas para controle
          </div>
        </div>

        {territoryLabel ? (
          <div className="space-y-3 rounded-[18px] border border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/8 px-4 py-3 text-sm text-white/72">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-accent)]">Território em foco</p>
                <p className="font-semibold text-white">{territory.neighborhood || territory.city}</p>
                <p className="text-white/50">{territory.city && territory.neighborhood ? `${territory.city} · ${territory.neighborhood}` : territory.city || territory.neighborhood}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={buildSeedHref(territory.city || territory.neighborhood || "", territory.neighborhood || null)} className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-[color:var(--color-accent)]/18">
                  Abrir semeadura neste bairro
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
                <Link href={buildNoUpdateHref(territory.city || undefined, territory.neighborhood || undefined)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
                  Ver postos sem atualização
                </Link>
                <Link href={buildQualityHref(territory.city || undefined, territory.neighborhood || undefined)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
                  Abrir curadoria
                </Link>
                <Link href={buildCoverageHref(territory.city || undefined, territory.neighborhood || undefined)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
                  Ver cobertura deste território
                </Link>
              </div>
            </div>
            <TerritoryWorkflowControls
              city={territory.city || territory.neighborhood || ""}
              neighborhood={territory.neighborhood || null}
              returnTo={buildTerritoryWorkflowReturnTo("/admin/ops/station-editors", territory.city || undefined, territory.neighborhood || undefined, "station_editor")}
              currentState={currentWorkflow}
              compact
            />
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Editors</p>
            <p className="mt-2 text-2xl font-semibold text-white">{roster.totals.editors}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Criados</p>
            <p className="mt-2 text-2xl font-semibold text-white">{roster.totals.createdCount}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Ativos</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">{roster.totals.activeCount}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Duplicados</p>
            <p className="mt-2 text-2xl font-semibold text-red-300">{roster.totals.duplicateCount}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Convites</p>
            <p className="mt-2 text-2xl font-semibold text-white">{inviteReadout.totals.total}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Pendentes</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">{inviteReadout.totals.pendente}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Aceitos</p>
            <p className="mt-2 text-2xl font-semibold text-white">{inviteReadout.totals.aceito}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Revogados/expirados</p>
            <p className="mt-2 text-2xl font-semibold text-red-300">{inviteReadout.totals.revogado + inviteReadout.totals.expirado}</p>
          </div>
        </div>
        {banner ? <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/74">{banner}</div> : null}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Convite leve</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Gerar acesso por link/codigo</h2>
            <p className="mt-1 text-sm text-white/58">Pensado para WhatsApp. Papel estreito, revogavel e com validade curta.</p>
          </div>
          <Badge variant="outline">mobile-first</Badge>
        </div>

        <form action={createStationEditorInviteAction} className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-white/42">Validade (horas)</span>
            <input name="ttlHours" type="number" min={1} max={720} defaultValue={72} className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" />
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-white/42">Limite de usos</span>
            <input name="maxUses" type="number" min={1} max={10} defaultValue={1} className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" />
          </label>
          <div className="flex items-end">
            <Button type="submit" className="w-full">Gerar convite station_editor</Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Convites emitidos</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Pendentes, aceitos, revogados e expirados</h2>
          </div>
          <Badge variant="outline">Ops</Badge>
        </div>

        {inviteReadout.invites.length === 0 ? (
          <div className="rounded-[18px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">Nenhum convite emitido ainda.</div>
        ) : (
          <div className="space-y-3">
            {inviteReadout.invites.map((invite) => {
              const statusTone = invite.effectiveStatus === "pendente"
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                : invite.effectiveStatus === "aceito"
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-red-400/30 bg-red-400/10 text-red-100";

              return (
                <div key={invite.id} className="space-y-3 rounded-[18px] border border-white/8 bg-black/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/78">{invite.inviteCode}</span>
                        <span className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.16em] ${statusTone}`}>{invite.effectiveStatus}</span>
                      </div>
                      <p className="text-xs text-white/48">Criado por {invite.createdByEmail || "admin"} · expira em {formatDateTimeBR(invite.expiresAt)}</p>
                      <p className="text-xs text-white/48">Uso: {invite.useCount}/{invite.maxUses}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CopyTextButton value={invite.inviteLink} label="Copiar link" className="h-8 border-white/10 text-white" />
                      <CopyTextButton value={invite.inviteCode} label="Copiar codigo" className="h-8 border-white/10 text-white" />
                      {invite.effectiveStatus === "pendente" ? (
                        <form action={revokeStationEditorInviteAction}>
                          <input type="hidden" name="inviteId" value={invite.id} />
                          <Button type="submit" variant="secondary" className="h-8 border-white/10 text-white">Revogar</Button>
                        </form>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Link curto WhatsApp</p>
                    <div className="rounded-[14px] border border-white/10 bg-black/35 px-3 py-2 text-xs text-white/80 break-all">{invite.inviteLink}</div>
                  </div>

                  {invite.acceptedAt ? (
                    <p className="text-xs text-white/54">Aceito em {formatDateTimeBR(invite.acceptedAt)} por {invite.acceptedName || "sem nome"}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Conceder papel</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Adicionar curador de postos</h2>
          </div>
          <Badge variant="outline">Restrito</Badge>
        </div>

        <form action={grantStationEditorRoleAction} className="flex flex-col gap-3 sm:flex-row">
          <label className="flex-1 space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-white/42">E-mail</span>
            <input name="email" type="email" placeholder="nome@exemplo.com" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" />
          </label>
          <Button type="submit" className="h-auto sm:self-end">Conceder station_editor</Button>
        </form>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[color:var(--color-accent)]" />
          <h2 className="text-xl font-semibold text-white">Quem tem papel</h2>
        </div>

        {roster.editors.length === 0 ? (
          <div className="rounded-[18px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">Nenhum station_editor ativo agora.</div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {roster.editors.map((editor) => (
              <div key={editor.userId} className="space-y-3 rounded-[22px] border border-white/8 bg-black/25 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">{editor.email}</p>
                    <p className="text-xs text-white/46">Ultima semeadura: {editor.lastSeedAt ? formatRecencyLabel(editor.lastSeedAt) : "sem registro"}</p>
                    <p className="text-[11px] text-white/32">{editor.lastSeedAt ? formatDateTimeBR(editor.lastSeedAt) : "Ainda não há posto criado por este editor."}</p>
                  </div>
                  <Badge variant="outline">station_editor</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-white/36">Criados</p>
                    <p className="mt-1 text-lg font-semibold text-white">{editor.createdCount}</p>
                  </div>
                  <div className="rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-white/36">Ativos</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-300">{editor.activeCount}</p>
                  </div>
                  <div className="rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-white/36">Revisão</p>
                    <p className="mt-1 text-lg font-semibold text-amber-300">{editor.reviewCount}</p>
                  </div>
                  <div className="rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-white/36">Duplicados</p>
                    <p className="mt-1 text-lg font-semibold text-red-300">{editor.duplicateCount}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/44">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Cadastro leve</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Sem admin total</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Acesso por allowlist</span>
                </div>

                <form action={revokeStationEditorRoleAction} className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-black/20 px-3 py-3">
                  <input type="hidden" name="email" value={editor.email} />
                  <div>
                    <p className="text-sm font-medium text-white">Remover papel</p>
                    <p className="text-[11px] text-white/44">Volta para admin, sem apagar o allowlist.</p>
                  </div>
                  <Button type="submit" variant="secondary" className="border-white/10 text-white">
                    <ShieldOff className="h-4 w-4" />
                    Remover
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Edições leves</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Auditoria do station_editor</h2>
            <p className="mt-1 text-sm text-white/58">Veja o que foi corrigido, o que ficou em revisão e onde houve vínculo de duplicidade.</p>
          </div>
          <Badge variant="outline">{lightEditAudit.totals.totalCount} edições</Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Salvas</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">{lightEditAudit.totals.activeCount}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Revisão</p>
            <p className="mt-2 text-2xl font-semibold text-amber-300">{lightEditAudit.totals.reviewCount}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Duplicados</p>
            <p className="mt-2 text-2xl font-semibold text-red-300">{lightEditAudit.totals.duplicateCount}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Editors com edição</p>
            <p className="mt-2 text-2xl font-semibold text-white">{lightEditAudit.editors.length}</p>
          </div>
        </div>

        {lightEditAudit.recent.length === 0 ? (
          <div className="rounded-[18px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">Nenhuma edição leve registrada ainda.</div>
        ) : (
          <div className="space-y-2">
            {lightEditAudit.recent.slice(0, 8).map((edit) => (
              <div key={edit.id} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/68">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{edit.stationName}</p>
                    <p className="text-[11px] text-white/44">{edit.editorEmail} · {formatRecencyLabel(edit.createdAt)} · {formatDateTimeBR(edit.createdAt)}</p>
                  </div>
                  <Badge variant={edit.status === "saved" ? "accent" : edit.status === "duplicate_linked" ? "warning" : "danger"}>{edit.status}</Badge>
                </div>
                <p className="mt-2 text-[11px] text-white/46">{Object.keys(edit.diff).join(" · ") || "Sem mudança detectada"}</p>
                {edit.reason ? <p className="mt-1 text-[11px] text-white/54">{edit.reason}</p> : null}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard className="space-y-3">
        <div className="flex items-center gap-2">
          <MapPinPlus className="h-4 w-4 text-[color:var(--color-accent)]" />
          <h2 className="text-base font-semibold text-white">Leitura rápida</h2>
        </div>
        <p className="text-sm text-white/58">Acompanhamento simples da qualidade da semeadura: quantos postos cada editor cria, quantos ficam ativos, quantos pedem revisão e quantos viram duplicado.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/ops/qualidade" className="text-sm text-[color:var(--color-accent)] underline-offset-4 hover:underline">
            Abrir curadoria territorial
          </Link>
          <Link href="/admin" className="text-sm text-[color:var(--color-accent)] underline-offset-4 hover:underline">
            Voltar ao admin
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}


