import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/ui/section-card";
import { brand } from "@/styles/design-tokens";

const points = [
  "Com foto e horario para aumentar confianca.",
  "Recencia sempre visivel para leitura rapida.",
  "Mapa e feed como acesso principal.",
  "Moderacao simples para segurar ruido sem travar o app."
];

export default function SobrePage() {
  return (
    <AppShell>
      <SectionCard className="space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/42">Sobre e metodologia</p>
        <h2 className="text-[1.9rem] font-semibold leading-none text-white">{brand.name}</h2>
        <p className="text-sm text-white/62">
          {brand.name} e uma iniciativa do {brand.initiative} para criar um mapa popular, rapido e confiavel dos
          precos de combustiveis no Sul Fluminense.
        </p>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Metodologia</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Como o app organiza a confianca</h3>
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
          Nesta etapa a prioridade e a fundacao: mapa funcional, PWA instalavel, estrutura limpa, mocks regionais,
          schema pronto e integracao inicial com Supabase.
        </p>
      </SectionCard>
    </AppShell>
  );
}
