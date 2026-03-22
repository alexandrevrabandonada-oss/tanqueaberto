import { AppShell } from "@/components/layout/app-shell";
import { BrandMark } from "@/components/brand/brand-mark";
import { SectionCard } from "@/components/ui/section-card";
import { brand } from "@/styles/design-tokens";

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
          <BrandMark variant="vertical" className="mx-auto h-auto w-full max-w-[280px]" />
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Sobre e metodologia</p>
          <h2 className="text-[1.9rem] font-semibold leading-none text-white">{brand.name}</h2>
          <p className="text-sm text-white/62">
            {brand.name} é uma iniciativa do {brand.initiative} para criar um mapa popular, rápido e confiável dos
            preços de combustíveis no Sul Fluminense.
          </p>
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Metodologia</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Como o app organiza a confiança</h3>
        </div>
        <div className="space-y-3">
          {points.map((point) => (
            <div key={point} className="rounded-[22px] border border-white/8 bg-black/30 p-4 text-sm text-white/70">
              {point}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-white/42">Foco inicial</p>
        <p className="text-sm text-white/62">
          Nesta etapa a prioridade é a fundação: mapa funcional, PWA instalável, estrutura limpa, dados regionais,
          schema pronto e integração inicial com Supabase.
        </p>
      </SectionCard>
    </AppShell>
  );
}
