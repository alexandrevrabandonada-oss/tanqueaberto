"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

import { AdminLoginState, signInAdminAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

const initialState: AdminLoginState = { error: null, success: false };
const ADMIN_ROUTE = "/admin" as Route;

interface AdminLoginFormProps {
  notice?: string;
  error?: string;
}

function resolveMessage(notice?: string, error?: string) {
  if (error === "session_expired") {
    return "Sua sessão expirou. Entre de novo para continuar.";
  }

  if (error === "not_authorized") {
    return "Seu e-mail não está liberado para o admin.";
  }

  if (notice === "logout") {
    return "Você saiu do admin com segurança.";
  }

  return null;
}

export function AdminLoginForm({ notice, error }: AdminLoginFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(signInAdminAction, initialState);
  const banner = state.error ?? resolveMessage(notice, error);

  useEffect(() => {
    if (state.success) {
      router.replace(ADMIN_ROUTE);
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-white" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="admin@exemplo.com"
          className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-white/34"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-white" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Sua senha do Supabase Auth"
          className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-white/34"
        />
      </div>

      {banner ? <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/74">{banner}</div> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Entrando..." : "Entrar no admin"}
      </Button>
    </form>
  );
}
