"use client";

import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";

export default function GlobalError({ error, reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <html lang="pt-BR">
      <body className="bg-[color:var(--color-bg)] font-body text-[color:var(--color-text)]">
        <div className="mx-auto flex min-h-screen w-full max-w-[480px] items-center px-4 py-6">
          <SectionCard className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Erro temporário</p>
              <h1 className="text-2xl font-semibold text-white">Algo saiu do esperado.</h1>
              <p className="text-sm text-white/62">Tente recarregar a tela. Se o problema continuar, volte para o mapa ou envie feedback.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button onClick={reset} className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--color-accent)] px-5 text-sm font-semibold text-black transition hover:opacity-90">
                Tentar de novo
              </button>
              <ButtonLink href="/feedback" variant="secondary" className="w-full sm:w-auto">
                Enviar feedback
              </ButtonLink>
            </div>
            {process.env.NODE_ENV !== "production" ? <p className="text-xs text-white/40">{error.message}</p> : null}
          </SectionCard>
        </div>
      </body>
    </html>
  );
}
