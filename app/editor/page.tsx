import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { ShieldCheck, Smartphone, Link2 } from "lucide-react";

import { getCurrentAdminUser } from "@/lib/auth/admin";
import { getStationEditorSessionFromCookie } from "@/lib/auth/station-editor-session";
import { StationEditorInviteAcceptForm } from "@/components/station/station-editor-invite-accept-form";
import { SectionCard } from "@/components/ui/section-card";

export const dynamic = "force-dynamic";

interface EditorEntryPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function readString(searchParams: Record<string, string | string[] | undefined>, key: string) {
  return typeof searchParams[key] === "string" ? String(searchParams[key]).trim() : "";
}

function safeReturnTo(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value ?? "";
  return candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : "";
}

function mapErrorMessage(error: string) {
  if (error === "session_expired") return "Sua sessão deste aparelho expirou. Reative com convite ou código.";
  if (error === "invite_not_found") return "Código ou link não encontrado. Verifique e tente novamente.";
  if (error === "invite_expired") return "Esse convite expirou. Peça um novo código ao admin.";
  if (error === "invite_revoked") return "Esse convite foi revogado pelo admin.";
  return "";
}

export default async function EditorEntryPage({ searchParams }: EditorEntryPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const currentAdmin = await getCurrentAdminUser();
  const lightSession = await getStationEditorSessionFromCookie();
  const notice = readString(resolvedSearchParams, "notice");
  const error = readString(resolvedSearchParams, "error");
  const inviteToken = readString(resolvedSearchParams, "token");
  const inviteCode = readString(resolvedSearchParams, "code");
  const returnToHref = safeReturnTo(resolvedSearchParams.returnTo);

  if (currentAdmin || lightSession) {
    if (returnToHref) {
      redirect(returnToHref as Route);
    }

    const passthrough = new URLSearchParams();
    if (notice) passthrough.set("notice", notice);
    const query = passthrough.toString();
    redirect((query ? `/postos?${query}` : "/postos") as Route);
  }

  const errorMessage = mapErrorMessage(error);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-6">
      <div className="w-full space-y-4">
        <SectionCard className="space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-10 w-10 text-[color:var(--color-accent)]" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Entrada rápida</p>
              <h1 className="text-2xl font-semibold text-white">Editor de Postos</h1>
            </div>
          </div>
          <p className="text-sm text-white/64">Use `/editor` no dia a dia. Convite e código ficam só para a primeira ativação ou recuperação desta sessão.</p>
          {inviteToken || inviteCode ? (
            <div className="rounded-[16px] border border-[color:var(--color-accent)]/25 bg-[color:var(--color-accent)]/12 px-3 py-2 text-xs text-white/80">
              Convite detectado. Complete os dados para ativar neste aparelho.
            </div>
          ) : null}
          {errorMessage ? <div className="rounded-[16px] border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs text-red-100">{errorMessage}</div> : null}
        </SectionCard>

        <SectionCard className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Ativação inicial</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Entrar sem login admin</h2>
          </div>

          <StationEditorInviteAcceptForm
            inviteToken={inviteToken}
            inviteCode={inviteCode}
            successRedirectTo={returnToHref ? returnToHref : "/editor?notice=invite_accepted"}
          />

          <div className="rounded-[16px] border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/70">
            <div className="flex items-center gap-2 text-white/84">
              <Link2 className="h-3.5 w-3.5" />
              <span className="font-semibold">Aceita link curto ou código</span>
            </div>
            <p className="mt-1">Se o link vier incompleto, use apenas o código recebido para reativar.</p>
          </div>
        </SectionCard>

        <SectionCard className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Acesso completo</p>
              <h2 className="mt-1 text-base font-semibold text-white">Sou Admin do sistema</h2>
            </div>
            <Link href="/admin/login" className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 hover:bg-white/10 transition">
              Fazer login admin
            </Link>
          </div>
          <p className="text-xs text-white/60">Se você for admin, entre com sua conta para acessar livremente a operação completa e a semeadura de postos.</p>
        </SectionCard>

        <SectionCard className="space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-[color:var(--color-accent)]" />
            <h2 className="text-base font-semibold text-white">Salvar Editor de Postos na tela inicial</h2>
          </div>
          <p className="text-xs text-white/60">No Android Chrome: menu de três pontos, depois &quot;Adicionar à tela inicial&quot;. Assim, o acesso diário fica a um toque.</p>
        </SectionCard>
      </div>
    </div>
  );
}
