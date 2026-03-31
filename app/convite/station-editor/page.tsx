import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { SectionCard } from "@/components/ui/section-card";
import { StationEditorInviteAcceptForm } from "@/components/station/station-editor-invite-accept-form";

export const dynamic = "force-dynamic";

interface StationEditorInvitePageProps {
  searchParams?: Promise<{
    token?: string;
    code?: string;
  }>;
}

export default async function StationEditorInvitePage({ searchParams }: StationEditorInvitePageProps) {
  const resolved = (await searchParams) ?? {};
  const inviteToken = typeof resolved.token === "string" ? resolved.token.trim() : "";
  const inviteCode = typeof resolved.code === "string" ? resolved.code.trim().toUpperCase() : "";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-5">
      <div className="w-full space-y-4">
        <SectionCard className="space-y-4">
          <div className="flex items-center gap-3">
            <BrandMark variant="icon" className="h-11 w-11" decorative />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Convite leve</p>
              <h1 className="font-display text-2xl text-white">Station editor</h1>
            </div>
          </div>
          <p className="text-sm text-white/64">Fluxo rapido para quem recebeu convite. Sem cadastro longo, com acesso restrito apenas a semeadura e edicao leve.</p>
          {inviteToken ? (
            <div className="rounded-[16px] border border-[color:var(--color-accent)]/25 bg-[color:var(--color-accent)]/12 px-3 py-2 text-xs text-white/80">
              Link de convite detectado. Confirme seu nome operacional e entre.
            </div>
          ) : null}
        </SectionCard>

        <SectionCard className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Aceitar convite</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Entrar no modo de campo</h2>
          </div>

          <StationEditorInviteAcceptForm inviteToken={inviteToken} inviteCode={inviteCode} />

          <div className="flex items-center justify-between text-xs text-white/48">
            <span>Validade curta, revogacao ativa e papel estreito.</span>
            <Link href="/" className="text-[color:var(--color-accent)]">
              Voltar ao app
            </Link>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
