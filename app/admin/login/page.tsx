import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { BrandMark } from "@/components/brand/brand-mark";
import { SectionCard } from "@/components/ui/section-card";
import { getCurrentAdminUser } from "@/lib/auth/admin";
import { brand } from "@/styles/design-tokens";

export const dynamic = "force-dynamic";

const ADMIN_ROUTE = "/admin" as Route;

interface AdminLoginPageProps {
  searchParams?: Promise<{
    notice?: string;
    error?: string;
  }>;
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const currentAdmin = await getCurrentAdminUser();
  const resolvedSearchParams = (await searchParams) ?? {};

  if (currentAdmin) {
    redirect(ADMIN_ROUTE);
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        <SectionCard className="space-y-4">
          <div className="flex items-center gap-3">
            <BrandMark variant="symbol" className="h-11 w-11" decorative />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Área restrita</p>
              <h1 className="font-display text-2xl text-white">{brand.name}</h1>
            </div>
          </div>
          <p className="text-sm text-white/62">Acesso administrativo para moderação, curadoria territorial e operação do beta.</p>
        </SectionCard>

        <SectionCard className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Entrar</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Login do admin</h2>
          </div>

          <AdminLoginForm notice={resolvedSearchParams.notice} error={resolvedSearchParams.error} />

          <div className="flex items-center justify-between text-xs text-white/48">
            <span>Use um e-mail liberado em `admin_users`.</span>
            <Link href="/" className="text-[color:var(--color-accent)]">
              Voltar ao app
            </Link>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
