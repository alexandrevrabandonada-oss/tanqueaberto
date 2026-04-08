import type { Route } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { BrandMark } from "@/components/brand/brand-mark";
import { SectionCard } from "@/components/ui/section-card";
import { ButtonLink } from "@/components/ui/button";
import { brand } from "@/styles/design-tokens";

const APOIA_URL = "https://apoia.se/bombaaberta";

const points = [
  "Com foto e horário para aumentar a confiança.",
  "Recência sempre visível para leitura rápida.",
  "Mapa e feed como acesso principal.",
  "Moderação simples para segurar ruído sem travar o app."
];

export default function SobrePage() {
  return (
    <AppShell>
      <SectionCard className="space-y-5">
        <div className="rounded-[28px] border border-white/8 bg-black/35 p-5">
          <BrandMark variant="emblem" className="mx-auto h-auto w-full max-w-[340px]" />
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Sobre e metodologia</p>
          <h2 className="text-[1.9rem] font-semibold leading-none text-white">{brand.name}</h2>
          <p className="text-sm text-white/62">
            {brand.name} é uma iniciativa do {brand.initiative} para criar um mapa popular, rápido e confiável dos
            preços de combustíveis no Sul Fluminense.
          </p>
          <p className="text-sm text-white/62">
            A ideia é simples: combinar rastreabilidade, revisão comunitária e contexto local para que cada
            leitura seja útil na hora de abastecer.
          </p>
        </div>
      </SectionCard>

      <SectionCard className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-white/42">Princípios</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {points.map((point) => (
            <div key={point} className="rounded-[18px] border border-white/8 bg-black/25 px-4 py-3 text-sm text-white/68">
              {point}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-white/42">Observatório</p>
        <p className="text-sm text-white/62">
          A camada de auditoria pública organiza série histórica, alertas e exportações para uso cívico e técnico.
        </p>
        <ButtonLink href={"/auditoria" as Route} variant="secondary">
          Abrir auditoria pública
        </ButtonLink>
      </SectionCard>

      <SectionCard className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-white/42">Foco inicial</p>
        <p className="text-sm text-white/62">
          Nesta etapa a prioridade é a fundação: mapa funcional, PWA instalável, estrutura limpa, dados regionais,
          schema pronto e integração inicial com Supabase.
        </p>
      </SectionCard>

      <SectionCard className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-white/42">Sustentabilidade</p>
        <p className="text-sm text-white/62">
          O projeto é independente e não tem publicidade. Apoio da comunidade ajuda a manter a infraestrutura
          no ar e ampliar a cobertura de postos.
        </p>
        <ButtonLink href={APOIA_URL} variant="secondary" target="_blank" rel="noopener noreferrer">
          Apoiar o projeto
        </ButtonLink>
      </SectionCard>
    </AppShell>
  );
}
