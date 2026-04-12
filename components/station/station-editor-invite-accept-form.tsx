"use client";

import { useActionState, useEffect } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { acceptStationEditorInviteAction, type StationEditorInviteAcceptState } from "@/app/convite/station-editor/actions";

const initialState: StationEditorInviteAcceptState = { success: false, error: null };

interface StationEditorInviteAcceptFormProps {
  inviteToken?: string;
  inviteCode?: string;
  successRedirectTo?: string;
}

export function StationEditorInviteAcceptForm({
  inviteToken = "",
  inviteCode = "",
  successRedirectTo = "/editor?notice=invite_accepted"
}: StationEditorInviteAcceptFormProps) {
  const [state, formAction, pending] = useActionState(acceptStationEditorInviteAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (!state.success) {
      return;
    }

    router.replace(successRedirectTo as Route);
    router.refresh();
  }, [router, state.success, successRedirectTo]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="inviteToken" value={inviteToken} />

      <label className="space-y-2">
        <span className="text-xs uppercase tracking-[0.18em] text-white/42">Código do convite</span>
        <input
          name="inviteCode"
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          defaultValue={inviteCode}
          placeholder="SE-ABC123"
          className="w-full rounded-[16px] border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
        />
      </label>

      <label className="space-y-2">
        <span className="text-xs uppercase tracking-[0.18em] text-white/42">Nome operacional</span>
        <input
          name="displayName"
          type="text"
          autoComplete="nickname"
          placeholder="Ex.: Ale Campo"
          className="w-full rounded-[16px] border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
          required
          minLength={2}
          maxLength={42}
        />
      </label>

      <label className="flex items-start gap-2 rounded-[16px] border border-white/10 bg-black/25 px-3 py-3">
        <input
          name="keepOnDevice"
          type="checkbox"
          value="1"
          defaultChecked
          className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/40 text-[color:var(--color-accent)]"
        />
        <span className="text-xs text-white/72">
          Manter neste aparelho confiável para entrar sem código por mais tempo.
        </span>
      </label>

      {state.error ? <div className="rounded-[16px] border border-white/12 bg-white/5 px-3 py-2 text-sm text-white/76">{state.error}</div> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Entrando..." : "Entrar como station_editor"}
      </Button>

      <p className="text-[11px] text-white/44">Se o admin revogar o convite ou encerrar seu acesso, esta sessão deixa de funcionar neste aparelho.</p>
    </form>
  );
}
