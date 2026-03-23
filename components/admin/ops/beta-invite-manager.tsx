import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createBetaInviteAction, disableBetaInviteAction } from "@/app/admin/ops/actions";
import type { BetaInviteSummary } from "@/lib/beta/invites";
import { formatDateTimeBR, formatRecencyLabel } from "@/lib/format/time";

interface BetaInviteManagerProps {
  summary: BetaInviteSummary;
}

export function BetaInviteManager({ summary }: BetaInviteManagerProps) {
  return (
    <section className="space-y-4 rounded-[22px] border border-white/8 bg-black/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Convites beta</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Gestão simples de acesso</h2>
          <p className="mt-1 text-sm text-white/58">Gerar, expirar e acompanhar códigos sem sair do painel.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">{summary.active} ativos</Badge>
          <Badge variant="outline">{summary.expired} expirados</Badge>
          <Badge variant="warning">{summary.usedUp} esgotados</Badge>
        </div>
      </div>

      <form action={createBetaInviteAction} className="grid gap-3 rounded-[18px] border border-white/8 bg-black/20 p-4 lg:grid-cols-4">
        <label className="space-y-2 text-sm text-white/72">
          <span>Lote</span>
          <input name="batchLabel" defaultValue="beta fechado" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/34" />
        </label>
        <label className="space-y-2 text-sm text-white/72">
          <span>Máx. usos</span>
          <input name="maxUses" type="number" min={1} defaultValue={1} className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none" />
        </label>
        <label className="space-y-2 text-sm text-white/72">
          <span>Expira em</span>
          <input name="expiresAt" type="datetime-local" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none" />
        </label>
        <div className="flex items-end">
          <Button type="submit" className="w-full">Gerar convite</Button>
        </div>
        <label className="space-y-2 text-sm text-white/72 lg:col-span-2">
          <span>Código opcional</span>
          <input name="code" placeholder="Deixe vazio para gerar" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/34" />
        </label>
        <label className="space-y-2 text-sm text-white/72">
          <span>Nota do lote</span>
          <input name="batchNote" placeholder="Ex.: testers de VR" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/34" />
        </label>
        <label className="space-y-2 text-sm text-white/72">
          <span>Nota do testador</span>
          <input name="testerNote" placeholder="Ex.: imprensa, voluntário" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/34" />
        </label>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Total recente</p>
          <p className="mt-2 text-2xl font-semibold text-white">{summary.total}</p>
        </div>
        <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Sem uso</p>
          <p className="mt-2 text-2xl font-semibold text-white">{Math.max(0, summary.total - summary.recent.filter((item) => item.useCount > 0).length)}</p>
        </div>
        <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Último lote</p>
          <p className="mt-2 text-sm text-white">{summary.recent[0]?.batchLabel ?? "sem lote"}</p>
        </div>
        <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Atualizado</p>
          <p className="mt-2 text-sm text-white">{summary.recent[0]?.createdAt ? formatDateTimeBR(summary.recent[0].createdAt) : "sem dados"}</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {summary.recent.length === 0 ? (
          <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/58">Nenhum convite criado ainda.</div>
        ) : (
          summary.recent.slice(0, 6).map((invite) => (
            <div key={invite.id} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-base font-semibold text-[color:var(--color-accent)]">{invite.code}</p>
                  <p className="mt-1 text-sm text-white/72">{invite.batchLabel}</p>
                  {invite.batchNote ? <p className="mt-1 text-xs text-white/44">{invite.batchNote}</p> : null}
                  {invite.testerNote ? <p className="mt-1 text-xs text-white/44">{invite.testerNote}</p> : null}
                </div>
                <Badge variant={invite.isActive ? "default" : "outline"}>{invite.isActive ? "Ativo" : "Inativo"}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/42">
                <p>Usos: <span className="text-white/74">{invite.useCount} / {invite.maxUses}</span></p>
                <p>Criado: <span className="text-white/74">{formatDateTimeBR(invite.createdAt)}</span></p>
                {invite.expiresAt ? <p>Expira: <span className="text-white/74">{formatDateTimeBR(invite.expiresAt)}</span></p> : null}
                {invite.lastUsedAt ? <p>Último uso: <span className="text-white/74">{formatRecencyLabel(invite.lastUsedAt)}</span></p> : null}
              </div>
              {invite.isActive ? (
                <form action={disableBetaInviteAction} className="mt-3">
                  <input type="hidden" name="inviteId" value={invite.id} />
                  <Button type="submit" variant="secondary" className="w-full border-[color:var(--color-danger)]/30 text-[color:var(--color-danger)]">Desativar convite</Button>
                </form>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
