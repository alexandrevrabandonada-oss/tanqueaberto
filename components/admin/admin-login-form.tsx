"use client";

import { useActionState } from "react";

import { AdminLoginState, signInAdminAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

const initialState: AdminLoginState = { error: null, success: false, role: null };

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
  const [state, formAction, pending] = useActionState(signInAdminAction, initialState);
  const banner = state.error ?? resolveMessage(notice, error);

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
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
