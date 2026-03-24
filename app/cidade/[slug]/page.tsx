import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MapPin, Zap, Info, Share2, ShieldCheck, Camera } from "lucide-react";

import { resolveCityFromSlug, slugifyCity } from "@/lib/geo/city-slugs";
import { getActiveStations } from "@/lib/data/queries";
import { getTerritorialReleaseSummary } from "@/lib/ops/release-control";
import { getCityReadinessRows } from "@/lib/ops/readiness";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { ReadinessBadge } from "@/components/home/readiness-badge";
import { ButtonLink } from "@/components/ui/button";
import { CityPageTelemetry } from "@/components/territorial/city-page-telemetry";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { fuelLabels } from "@/lib/format/labels";

interface CityPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(
  { params }: CityPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const cityName = resolveCityFromSlug(slug);

  if (!cityName) return { title: "Cidade não encontrada" };

  return {
    title: `Preço do Combustível em ${cityName} - Bomba Aberta`,
    description: `Acompanhe em tempo real a cobertura e os preços de combustíveis em ${cityName}. Colabore com a comunidade do Bomba Aberta.`,
    openGraph: {
      title: `Bomba Aberta - ${cityName}`,
      description: `Estado da cobertura de postos em ${cityName}. Entre e colabore.`,
      type: "website",
    }
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { slug } = await params;
  const cityName = resolveCityFromSlug(slug);

  if (!cityName) {
    notFound();
  }

  const [stations, releaseSummary] = await Promise.all([
    getActiveStations(),
    getTerritorialReleaseSummary()
  ]);

  const cityStations = stations.filter(s => s.city.toUpperCase() === cityName.toUpperCase());
  const cityRelease = releaseSummary.find(s => s.name.toUpperCase() === cityName.toUpperCase());
  const status = cityRelease?.status || "limited";
  const stage = cityRelease?.publicStage || "closed";

  const stageTemplates = {
    closed: {
      badge: "Em Breve",
      title: `O Bomba está chegando em ${cityName}`,
      desc: "Estamos mapeando os postos e preparando a base. Em breve você poderá consultar preços em tempo real.",
      cta: "QUERO ME INSCREVER"
    },
    restricted_beta: {
      badge: "Beta Restrito",
      title: `${cityName} em fase de testes`,
      desc: "O sistema já está operacional para convidados. Peça seu acesso e ajude a validar os primeiros dados.",
      cta: "PEDIR CONVITE BETA"
    },
    public_beta: {
      badge: "Beta Público",
      title: `Beta Aberto em ${cityName}`,
      desc: "Explore os preços reais e colabore para manter o mapa vivo. Os dados ainda estão em validação comunitária.",
      cta: "EXPLORAR PREÇOS AGORA"
    },
    consolidated: {
      badge: "Operação Oficial",
      title: `Preço Real em ${cityName}`,
      desc: "O mapa popular de combustíveis oficial da cidade. Dados auditados e atualizados pela comunidade.",
      cta: "ABRIR MAPA COMPLETO"
    }
  };

  const template = stageTemplates[stage];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[color:var(--color-accent)] selection:text-black">
      <CityPageTelemetry cityName={cityName} slug={slug} />
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent px-6 pb-16 pt-24 text-center">
        <div className="absolute inset-x-0 -top-40 -z-10 flex justify-center blur-[100px]">
          <div className="h-[400px] w-[600px] rounded-full bg-[color:var(--color-accent)]/10" />
        </div>

        <div className="mx-auto max-w-2xl space-y-6">
          <Badge variant="accent" className="h-7 px-4 text-[10px] font-black uppercase tracking-[0.2em]">
            {template.badge}
          </Badge>
          
          <h1 className="text-5xl font-black tracking-tighter sm:text-7xl">
            {cityName}
          </h1>
          
          <p className="text-lg leading-relaxed text-white/54 sm:text-xl">
            {template.desc}
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-4">
             <ButtonLink 
               href={`/?city=${encodeURIComponent(cityName)}&ref=city_page&stage=${stage}`}
               className="h-14 px-8 text-sm font-black uppercase tracking-widest bg-[color:var(--color-accent)] text-black"
             >
                {template.cta}
                <ArrowRight className="h-4 w-4" />
             </ButtonLink>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-12 md:py-20">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Status Column */}
          <div className="space-y-8">
            <SectionCard className="space-y-6 border-white/10 bg-white/5 p-8">
               <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-white/40">Estágio da Operação</p>
                  <div className="flex items-center gap-3">
                     <ReadinessBadge status={status as any} />
                     <Badge variant={stage === "consolidated" ? "default" : "warning"} className="h-6">
                        {stage === "consolidated" ? "CONSOLIDADO" : stage === "public_beta" ? "BETA ABERTO" : "EM FORMAÇÃO"}
                     </Badge>
                  </div>
               </div>

               <div className="space-y-4 pt-4 border-t border-white/8">
                  <div className="flex gap-4">
                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
                        <ShieldCheck className="h-5 w-5" />
                     </div>
                     <div>
                        <h3 className="font-bold text-white">O que já temos</h3>
                        <p className="text-sm text-white/50">{cityStations.length} postos mapeados e auditados nesta cidade.</p>
                     </div>
                  </div>

                  <div className="flex gap-4">
                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                        <Zap className="h-5 w-5" />
                     </div>
                     <div>
                        <h3 className="font-bold text-white">O que falta</h3>
                        <p className="text-sm text-white/50">Precisamos de fotos recentes e confirmação de preços de hoje.</p>
                     </div>
                  </div>
               </div>
            </SectionCard>

            <SectionCard className="border-purple-500/20 bg-purple-500/5 p-8 text-center space-y-4">
               <Camera className="mx-auto h-8 w-8 text-purple-400" />
               <h3 className="text-xl font-bold text-white">Seja um Tester</h3>
               <p className="text-sm text-white/60 leading-relaxed">
                  O Bomba Aberta em {cityName} é movido por motoristas como você. 
                  Entre para o beta e ajude a manter a base atualizada.
               </p>
               <Link href="/sobre" className="inline-block text-xs font-bold uppercase tracking-widest text-purple-400 hover:text-purple-300">
                  COMO FUNCIONA?
               </Link>
            </SectionCard>
          </div>

          {/* Activity/Preview Column */}
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
               <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[color:var(--color-accent)]" /> 
                  Postos Catalogados
               </h2>
               <span className="text-xs text-white/30 uppercase tracking-widest font-black">{cityStations.length} ITENS</span>
            </div>

            <div className="grid gap-3">
               {cityStations.slice(0, 6).map(station => (
                 <div key={station.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                    <div className="min-w-0 pr-4">
                       <p className="truncate text-sm font-bold text-white">{station.namePublic || station.name}</p>
                       <p className="truncate text-[10px] text-white/30 uppercase tracking-widest">{station.neighborhood}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-5 opacity-40">Mapeado</Badge>
                 </div>
               ))}
               
               {cityStations.length > 6 && (
                 <div className="text-center py-2 text-xs text-white/20 font-bold uppercase tracking-widest">
                   + {cityStations.length - 6} postos adicionais no app
                 </div>
               )}
            </div>

            <SectionCard className="p-6 bg-white/5 border-white/8 space-y-4">
               <div className="flex items-center gap-2 text-white/40">
                  <Info className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Transparência</span>
               </div>
               <p className="text-xs text-white/50 leading-relaxed">
                  Os preços mostrados no Bomba Aberta são colaborativos. Verifique sempre a data do último envio no card de cada posto para garantir que o preço ainda é válido.
               </p>
            </SectionCard>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="border-t border-white/10 px-6 py-12 text-center">
         <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
            BOMBA ABERTA · PROJETO COMUNITÁRIO
         </p>
      </footer>
    </div>
  );
}
