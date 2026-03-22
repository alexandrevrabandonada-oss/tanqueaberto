"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Camera, MapPinned, ShieldCheck, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";

const STORAGE_KEY = "bomba_aberta_home_guide_dismissed";

export function FirstVisitGuide() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setVisible(window.localStorage.getItem(STORAGE_KEY) !== "1");
  }, []);

  if (!visible) return null;

  return (
    <SectionCard className="space-y-4 border-[color:var(--color-accent)]/18 bg-[color:var(--color-accent)]/8">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Badge variant="warning">Primeira visita</Badge>
          <h2 className="text-[1.35rem] font-semibold leading-tight text-white">Comece pelo mapa. Leva poucos segundos para entender.</h2>
          <p className="text-sm text-white/60">
            O app mostra o que já está cadastrado no território, o que já tem preço recente aprovado e onde ainda falta atualização.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem(STORAGE_KEY, "1");
            setVisible(false);
          }}
          className="rounded-full border border-white/10 bg-white/5 p-2 text-white/56 transition hover:text-white"
          aria-label="Fechar ajuda"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <div className="flex items-center gap-2 text-white">
            <MapPinned className="h-4 w-4 text-[color:var(--color-accent)]" />
            Posto cadastrado
          </div>
          <p className="mt-2 text-sm text-white/56">O posto existe no mapa, mesmo que ainda não tenha preço recente.</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <div className="flex items-center gap-2 text-white">
            <Camera className="h-4 w-4 text-[color:var(--color-accent)]" />
            Preço recente
          </div>
          <p className="mt-2 text-sm text-white/56">É o último preço aprovado com foto e horário visível para consulta.</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <div className="flex items-center gap-2 text-white">
            <ShieldCheck className="h-4 w-4 text-[color:var(--color-accent)]" />
            Seu envio
          </div>
          <p className="mt-2 text-sm text-white/56">Foto + preço + horário entram como aguardando moderação.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/enviar">Enviar o primeiro preço</ButtonLink>
        <ButtonLink href="/auditoria/metodologia" variant="secondary">
          Entender como funciona
        </ButtonLink>
        <Link
          href="/postos/sem-atualizacao"
          className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
        >
          Ver postos sem atualização
        </Link>
      </div>
    </SectionCard>
  );
}
