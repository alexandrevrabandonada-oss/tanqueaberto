import type { Metadata } from "next";
import { Heart, Server, Code, MapPin, Zap } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/ui/section-card";
import { ButtonLink } from "@/components/ui/button";
import { brand } from "@/styles/design-tokens";

export const metadata: Metadata = {
  title: "Apoie o projeto",
  description: `Apoie o desenvolvimento e a manutenção do ${brand.name}. Um projeto independente, sem anúncios.`,
};

const APOIA_URL = "https://apoia.se/bombaaberta";

const costs = [
  {
    icon: Server,
    label: "Hospedagem e banco de dados",
    description:
      "Supabase, Vercel e CDN para que o app fique no ar com dados em tempo real e disponibilidade contínua.",
  },
  {
    icon: Code,
    label: "Desenvolvimento contínuo",
    description:
      "Correções, novos recursos, melhorias de desempenho, segurança e estabilidade da plataforma.",
  },
  {
    icon: MapPin,
    label: "Cobertura de postos",
    description:
      "Enriquecimento da base cadastral, coordenadas, dados da ANP e expansão para novos municípios.",
  },
  {
    icon: Zap,
    label: "Operação e moderação",
    description:
      "Painel de moderação, qualidade dos dados enviados pela comunidade e continuidade do projeto.",
  },
] as const;

export default function ApoiePage() {
  return (
    <AppShell>
      <SectionCard className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Sustentabilidade</p>
          <h1 className="text-[1.9rem] font-semibold leading-tight text-white">
            Apoie o {brand.name}
          </h1>
          <p className="text-sm leading-relaxed text-white/62">
            O {brand.name} é um projeto independente e comunitário. Não temos publicidade, não vendemos dados
            e não cobramos pelo uso. O custo de manter o mapa no ar e melhorar a cobertura é bancado pela
            iniciativa {brand.initiative}.
          </p>
          <p className="text-sm leading-relaxed text-white/62">
            Se o app é útil na hora de escolher onde abastecer, um apoio pontual ou recorrente faz
            diferença real para a continuidade do projeto.
          </p>
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Transparência</p>
          <h2 className="mt-1 text-xl font-semibold text-white">O que o apoio cobre</h2>
        </div>
        <div className="space-y-3">
          {costs.map(({ icon: Icon, label, description }) => (
            <div
              key={label}
              className="flex items-start gap-3.5 rounded-[22px] border border-white/8 bg-black/30 p-4"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <Icon className="h-4 w-4 text-[color:var(--color-accent)]" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-sm text-white/58">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Apoio recorrente</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Todo mês, com constância</h2>
        </div>
        <p className="text-sm text-white/62">
          O apoio mensal é a forma mais eficaz de manter o projeto estável. Qualquer valor ajuda a cobrir
          infraestrutura e garante que o mapa continue atualizado e evoluindo.
        </p>
        <a
          href={APOIA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--color-accent)] px-4 py-3 text-sm font-semibold text-black shadow-[0_10px_30px_rgba(255,212,0,0.18)] transition active:scale-[0.99]"
        >
          <Heart className="h-4 w-4" />
          Apoiar mensalmente via APOIA.se
        </a>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Apoio pontual</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Uma vez, quando quiser</h2>
        </div>
        <p className="text-sm text-white/62">
          Sem compromisso. Uma contribuição única também é bem-vinda e vai diretamente para os custos
          operacionais do projeto.
        </p>
        <a
          href={APOIA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-[color:var(--color-accent)] active:scale-[0.99]"
        >
          Fazer apoio pontual
        </a>
      </SectionCard>

      <SectionCard className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-white/42">Outras formas de apoiar</p>
        <p className="text-sm text-white/62">
          Usar o app, enviar preços reais e compartilhar com motoristas conhecidos também é apoio. A base
          de dados cresce com cada envio moderado e aprovado — e isso mantém o mapa relevante para todos.
        </p>
        <ButtonLink href="/" variant="ghost" className="border border-white/8 bg-white/5 text-white/72">
          Voltar ao mapa
        </ButtonLink>
      </SectionCard>
    </AppShell>
  );
}
