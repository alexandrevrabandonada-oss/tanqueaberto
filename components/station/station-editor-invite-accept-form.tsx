"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { acceptStationEditorInviteAction, type StationEditorInviteAcceptState } from "@/app/convite/station-editor/actions";

const initialState: StationEditorInviteAcceptState = { success: false, error: null };

interface StationEditorInviteAcceptFormProps {
  inviteToken?: string;
  inviteCode?: string;
}

export function StationEditorInviteAcceptForm({ inviteToken = "", inviteCode = "" }: StationEditorInviteAcceptFormProps) {
  const [state, formAction, pending] = useActionState(acceptStationEditorInviteAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (!state.success) {
      return;
    }

    router.replace("/postos/cadastrar?notice=invite_accepted");
    router.refresh();
  }, [router, state.success]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="inviteToken" value={inviteToken} />

      <label className="space-y-2">
        <span className="text-xs uppercase tracking-[0.18em] text-white/42">Codigo do convite</span>
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

      {state.error ? <div className="rounded-[16px] border border-white/12 bg-white/5 px-3 py-2 text-sm text-white/76">{state.error}</div> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Entrando..." : "Entrar como station_editor"}
      </Button>
    </form>
  );
}
