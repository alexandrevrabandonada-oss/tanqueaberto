"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { submitBetaInviteAction, type BetaInviteState } from "@/app/beta/actions";

const initialState: BetaInviteState = { error: null, success: false };

interface BetaInviteFormProps {
  nextPath: string;
}

export function BetaInviteForm({ nextPath }: BetaInviteFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(submitBetaInviteAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.replace(nextPath as Route);
      router.refresh();
    }
  }, [nextPath, router, state.success]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <div className="space-y-2">
        <label className="text-sm font-medium text-white" htmlFor="code">
          Código do convite
        </label>
        <input
          id="code"
          name="code"
          type="text"
          autoComplete="off"
          placeholder="Digite o código recebido"
          className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-white/34"
        />
      </div>

      {state.error ? <div className="rounded-[18px] border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/10 px-4 py-3 text-sm text-[color:var(--color-danger)]">{state.error}</div> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Entrando..." : "Liberar acesso"}
      </Button>
    </form>
  );
}


