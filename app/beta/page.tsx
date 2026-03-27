import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { BetaInviteForm } from "@/components/beta/beta-invite-form";
import { BrandMark } from "@/components/brand/brand-mark";
import { SectionCard } from "@/components/ui/section-card";
import { getSafeBetaNextPath, isBetaClosed } from "@/lib/beta/gate";
import { hasBetaAccessFromCookies } from "@/lib/beta/session";
import { brand } from "@/styles/design-tokens";

export const metadata = { robots: { index: false, follow: false, nocache: true } };

export const dynamic = "force-dynamic";

const HOME_ROUTE = "/" as Route;

interface BetaPageProps {
  searchParams?: Promise<{ next?: string }>;
}

export default async function BetaPage({ searchParams }: BetaPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const nextPath = getSafeBetaNextPath(resolvedSearchParams.next);

  if (!isBetaClosed()) {
    redirect(nextPath as Route);
  }

  if (await hasBetaAccessFromCookies()) {
    redirect(nextPath as Route);
  }

  return (
    <AppShell>
      <div className="mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-md items-center py-4">
        <div className="w-full space-y-4">
          <SectionCard className="space-y-4">
            <div className="flex items-center gap-3">
              <BrandMark variant="icon" className="h-11 w-11" decorative />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">Beta fechado</p>
                <h1 className="font-display text-2xl text-white">{brand.name}</h1>
              </div>
            </div>
            <p className="text-sm text-white/62">
              Acesso controlado para testers. O mapa está vivo, mas a cobertura ainda está em expansão.
            </p>
          </SectionCard>

          <SectionCard className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Entrar</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Código de convite</h2>
            </div>

            <BetaInviteForm nextPath={nextPath} />

            <div className="flex items-center justify-between text-xs text-white/48">
              <span>Testes curtos, feedback direto e cobertura em construção.</span>
              <Link href={HOME_ROUTE} className="text-[color:var(--color-accent)]">
                Ver app
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}

