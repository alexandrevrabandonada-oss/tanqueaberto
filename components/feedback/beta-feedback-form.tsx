"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { submitBetaFeedbackAction, type BetaFeedbackState } from "@/app/feedback/actions";

const initialState: BetaFeedbackState = { error: null, success: false };

interface BetaFeedbackFormProps {
  pagePath: string;
  pageTitle?: string | null;
  stationId?: string | null;
  city?: string | null;
  fuelType?: string | null;
}

export function BetaFeedbackForm({ pagePath, pageTitle, stationId, city, fuelType }: BetaFeedbackFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(submitBetaFeedbackAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="pagePath" value={pagePath} />
      <input type="hidden" name="pageTitle" value={pageTitle ?? ""} />
      <input type="hidden" name="stationId" value={stationId ?? ""} />
      <input type="hidden" name="city" value={city ?? ""} />
      <input type="hidden" name="fuelType" value={fuelType ?? ""} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-white">
          <span>Tipo</span>
          <select name="feedbackType" defaultValue="problema" className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
            <option value="problema">Reportar problema</option>
            <option value="sugestao">Dar sugestão</option>
            <option value="confusa">Esta tela está confusa</option>
            <option value="faltou_posto">Faltou posto ou preço</option>
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-white">
          <span>Apelido opcional</span>
          <input name="testerNickname" placeholder="Ex.: Morador VR" className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-white/34" />
        </label>
      </div>

      <label className="space-y-2 text-sm font-medium text-white">
        <span>Contexto</span>
        <input name="context" placeholder="Ex.: mapa, card do posto, filtro, envio" className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-white/34" />
      </label>

      <label className="space-y-2 text-sm font-medium text-white">
        <span>Mensagem</span>
        <textarea name="message" rows={5} placeholder="Conte o que aconteceu ou o que faltou." className="w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-white/34" />
      </label>

      {state.error ? <div className="rounded-[18px] border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/10 px-4 py-3 text-sm text-[color:var(--color-danger)]">{state.error}</div> : null}
      {state.success ? <div className="rounded-[18px] border border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/10 px-4 py-3 text-sm text-white">Feedback enviado. Isso ajuda a melhorar o beta.</div> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar feedback"}
      </Button>
    </form>
  );
}
