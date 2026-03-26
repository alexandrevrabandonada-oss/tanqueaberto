import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";
import { 
  ArrowRight, 
  MapPin, 
  Zap, 
  Info, 
  Share2, 
  ShieldCheck, 
  Camera, 
  Clock, 
  Search,
  CheckCircle2,
  Navigation,
  ExternalLink
} from "lucide-react";

import { getAuditGroupBySlug, getAuditGroupMembers } from "@/lib/audit/groups";
import { getStationsByIds, getRecentReportsForStations } from "@/lib/data/queries";
import { getTerritorialReleaseSummary } from "@/lib/ops/release-control";
import { getGroupReadinessRows } from "@/lib/ops/readiness";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { ReadinessBadge } from "@/components/home/readiness-badge";
import { ButtonLink } from "@/components/ui/button";
import { fuelLabels } from "@/lib/format/labels";
import { getStationPublicName } from "@/lib/quality/stations";
import { cn } from "@/lib/utils";
import { type Route } from "next";
import { QuickActionGroup, QuickActionButton } from "@/components/ui/quick-action";
import { GroupTelemetry } from "@/components/grupo/group-telemetry";
import { SharePack } from "@/components/ui/share-pack";

interface GroupPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(
  { params }: GroupPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const group = await getAuditGroupBySlug(slug);

  if (!group) return { title: "Grupo não encontrado" };

  const [releaseSummary, readinessRows] = await Promise.all([
    getTerritorialReleaseSummary(),
    getGroupReadinessRows(30)
  ]);
  const groupRelease = releaseSummary.find(s => s.slug === group.slug);
  const readiness = readinessRows.find(r => r.groupSlug === group.slug);
  const stage = groupRelease?.publicStage || "closed";
  const score = readiness?.score ?? 0;

  const ogParams = new URLSearchParams({
    type: "group",
    name: group.name,
    city: group.city || "",
    score: score.toString(),
    stage: stage.replace('_', ' '),
  });

  return {
    title: `${group.name} - Cobertura Bomba Aberta`,
    description: `Acompanhe o estágio da coleta (${stage}) e preços reais no corredor ${group.name}. Score de prontidão: ${score}%.`,
    openGraph: {
      title: `Bomba Aberta - ${group.name}`,
      description: `Estado da cobertura em ${group.name}. Veja a prova de vida e colabore para atingir os 100%.`,
      type: "website",
      images: [
        {
          url: `/api/og/territorial?${ogParams.toString()}`,
          width: 1200,
          height: 630,
          alt: `Bomba Aberta - ${group.name}`
        }
      ]
    }
  };
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { slug } = await params;
  const group = await getAuditGroupBySlug(slug);

  if (!group) {
    notFound();
  }

  const [members, releaseSummary, readinessRows] = await Promise.all([
    getAuditGroupMembers(group.id),
    getTerritorialReleaseSummary(),
    getGroupReadinessRows(30)
  ]);

  const stationIds = members.map(m => m.stationId);
  const [stations, recentReports] = await Promise.all([
    getStationsByIds(stationIds),
    getRecentReportsForStations(stationIds, 10)
  ]);

  const groupRelease = releaseSummary.find(s => s.slug === group.slug);
  const readiness = readinessRows.find(r => r.groupSlug === group.slug);
  
  const status = groupRelease?.status || "limited";
  const stage = groupRelease?.publicStage || "closed";
  const score = readiness?.score ?? 0;

  // Determinar missão sugerida
  const stationsWithPrice = readiness?.stationsWithRecentPrice ?? 0;
  const totalStations = stationIds.length;
  const gapCount = totalStations - stationsWithPrice;
  
  const suggestedMission = gapCount > totalStations * 0.4 
    ? { title: "DENSIDADE CRÍTICA", desc: `Faltam fotos de ${gapCount} postos neste corredor.`, action: "COMPLETAR MAPA", icon: Search }
    : { title: "VALIDAÇÃO DE HOJE", desc: "Os postos estão mapeados, mas precisamos confirmar os preços agora.", action: "VERIFICAR PREÇOS", icon: Clock };

  const stageTemplates = {
    closed: {
      badge: "Mapeamento",
      title: `${group.name} em formação`,
      desc: "Estamos catalogando os postos deste corredor. Os dados ainda são preliminares.",
      cta: "AJUDAR NO MAPEAMENTO"
    },
    restricted_beta: {
      badge: "Beta Restrito",
      title: `Operação Beta: ${group.name}`,
      desc: "O recorte já possui postos, mas a coleta ainda é restrita a testers autorizados.",
      cta: "PEDIR ACESSO AO RECORTE"
    },
    public_beta: {
      badge: "Beta Público",
      title: `Corredor ${group.name}`,
      desc: "Acompanhe preços reais e ajude a manter a base viva. Dados em validação comunitária.",
      cta: "COLABORAR NESTE GRUPO"
    },
    consolidated: {
      badge: "Oficial",
      title: `Radar: ${group.name}`,
      desc: "Cobertura consolidada e atualizada. O melhor caminho para economizar neste trecho.",
      cta: "ABRIR RADAR COMPLETO"
    }
  };

  const template = stageTemplates[stage];

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[color:var(--color-accent)] selection:text-black">
      <GroupTelemetry groupId={group.id} groupName={group.name} city={group.city as string} stage={stage} score={score} />
      
      {/* Hero / Header */}
      <div className="relative border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent px-6 pb-14 pt-24 sm:pb-20 sm:pt-32">
        <div className="absolute inset-x-0 -top-20 -z-10 flex justify-center blur-[120px]">
          <div className="h-[400px] w-[600px] rounded-full bg-[color:var(--color-accent)]/10" />
        </div>

        <div className="mx-auto max-w-4xl">
           <div className="flex flex-col items-center text-center space-y-8">
              <div className="flex items-center gap-3">
                 <Badge variant="outline" className="border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1">
                   {group.city}
                 </Badge>
                 <Badge variant="accent" className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1 shadow-lg shadow-[color:var(--color-accent)]/10">
                   {template.badge}
                 </Badge>
              </div>
              
              <div className="space-y-4">
                <h1 className="text-5xl font-black tracking-tighter sm:text-7xl lg:text-8xl text-white uppercase italic">
                  {group.name}
                </h1>
                <div className="flex items-center justify-center gap-4 text-white/40">
                  <div className="h-px w-12 bg-white/10" />
                  <span className="text-xs font-black uppercase tracking-[0.3em]">Corredor Territorial</span>
                  <div className="h-px w-12 bg-white/10" />
                </div>
              </div>
              
              <p className="max-w-2xl text-pretty text-lg font-medium text-white/50 sm:text-xl leading-relaxed">
                {group.description || template.desc}
              </p>

              <div className="flex flex-wrap justify-center gap-4 pt-6">
                 <ButtonLink 
                   href={`/?groupId=${group.id}&ref=group_page&city=${encodeURIComponent(group.city as string)}` as Route}
                   className="h-16 px-10 text-base font-black uppercase tracking-widest bg-white text-black shadow-2xl hover:bg-white/90 transition-all active:scale-95 whitespace-nowrap"
                 >
                    {template.cta}
                    <ArrowRight className="ml-3 h-5 w-5" />
                 </ButtonLink>
              </div>
           </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-12">
          
          {/* Coluna Lateral: Status e Missão */}
          <div className="lg:col-span-4 space-y-6">
             <SectionCard className="border-white/5 bg-white/[0.02] p-8 space-y-8">
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Prontidão Territorial</p>
                     <Badge variant="outline" className="h-5 text-[9px] border-white/10 uppercase font-black tracking-tighter">
                        SCORE: {score}%
                     </Badge>
                   </div>
                   
                   <div className="flex items-center gap-4 bg-black/40 p-4 rounded-3xl border border-white/5">
                      <ReadinessBadge status={readiness?.trafficLight as any || "red"} className="h-10 w-10 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Estágio Atual</p>
                        <p className="text-lg font-black text-white uppercase italic">{stage.replace('_', ' ')}</p>
                      </div>
                   </div>
                </div>

                <div className="pt-8 border-t border-white/5 space-y-6">
                   <div className="flex items-center gap-2 text-[color:var(--color-accent)]">
                      <suggestedMission.icon className="h-4 w-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">{suggestedMission.title}</p>
                   </div>
                   <div className="space-y-5">
                     <h3 className="text-xl font-bold text-white leading-tight tracking-tight">{suggestedMission.desc}</h3>
                     
                     <QuickActionGroup 
                       className="bg-black/40 border border-white/5 p-2 grid-cols-1"
                       onMisclick={() => {}}
                     >
                       <QuickActionButton
                         icon={Camera}
                         label={suggestedMission.action}
                         desktopLabel="Abrir missão"
                         variant="accent"
                         isStreetMode={true}
                         href={`/enviar?groupId=${group.id}&ref=group_mission` as Route}
                         onClick={() => {}}
                       />
                     </QuickActionGroup>
                   </div>
                </div>
             </SectionCard>

            <div className="rounded-[28px] border border-blue-500/10 bg-blue-500/5 p-6 space-y-3">
               <div className="flex items-center gap-2 text-blue-400">
                  <Share2 className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Ativação Local</span>
               </div>
               <p className="text-xs text-blue-100/60 leading-relaxed">
                 Compartilhe este corredor com outros motoristas da região para aumentar a densidade de preços.
               </p>
               <SharePack type="group" id={group.id} slug={slug} name={group.name} />
            </div>
          </div>

          {/* Coluna Principal: Prova de Vida e Postos */}
          <div className="lg:col-span-8 space-y-8">
             
             {/* Prova de Vida */}
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Prova de Vida (Realtime)
                   </h2>
                   {recentReports.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                </div>
                
                <div className="grid gap-6">
                   {recentReports.length > 0 ? (
                      <div className="space-y-3">
                        {recentReports.map((report) => {
                          const station = stations.find(s => s.id === report.stationId);
                          return (
                            <div key={report.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[32px] border border-white/5 bg-white/[0.02] p-5 hover:border-white/10 transition-all">
                               <div className="flex items-center gap-5">
                                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[20px] border border-white/10 bg-white/5">
                                     {report.photoUrl ? (
                                        <Image src={report.photoUrl} alt="Report" fill className="object-cover" />
                                     ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                          <Camera className="h-6 w-6 text-white/10" />
                                        </div>
                                     )}
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                     <div className="absolute bottom-2 left-0 right-0 text-center">
                                        <Badge variant="outline" className="text-[7px] h-3 px-1 border-white/20 bg-black/40 text-white/60">FOTO REAL</Badge>
                                     </div>
                                  </div>
                                  <div>
                                     <p className="text-base font-black text-white tracking-tight uppercase italic">{getStationPublicName(station as any)}</p>
                                     <div className="flex items-center gap-3 mt-1.5">
                                        <p className="text-xl font-black text-[color:var(--color-accent)] italic">R$ {report.price.toFixed(2).replace('.', ',')}</p>
                                        <Badge variant="outline" className="text-[9px] h-4 border-white/10 bg-white/5 text-white/50 uppercase font-black">
                                          {fuelLabels[report.fuelType]}
                                        </Badge>
                                     </div>
                                  </div>
                               </div>
                               <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1 px-1 sm:px-0">
                                  <div className="flex items-center gap-2 text-[10px] text-white/30 font-bold uppercase tracking-wider">
                                     <Clock className="h-3 w-3" />
                                     Há {new Date(report.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">{report.reporterNickname || 'Coletor'}</p>
                               </div>
                            </div>
                          );
                        })}
                        
                        <div className="flex justify-center pt-2">
                           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10">Base Territorial Confirmada</p>
                        </div>
                      </div>
                   ) : (
                      <div className="p-16 text-center space-y-4 border border-dashed border-white/5 rounded-[40px] bg-white/[0.01]">
                         <div className="mx-auto h-14 w-14 rounded-full bg-white/5 flex items-center justify-center text-white/10">
                            <Zap className="h-6 w-6" />
                         </div>
                         <div className="max-w-xs mx-auto">
                            <p className="text-base font-bold text-white/40">Radar silenciando</p>
                            <p className="text-xs text-white/20 mt-1">Ninguém enviou preços neste corredor recentemente. Seja o primeiro a iluminar.</p>
                         </div>
                         <ButtonLink 
                           href={`/enviar?groupId=${group.id}&ref=empty_group_landing` as Route}
                           variant="secondary"
                           className="mt-4 h-12 rounded-2xl border-white/10 hover:bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest"
                         >
                           ATIVAR RADAR AGORA
                         </ButtonLink>
                      </div>
                   )}
                </div>
             </div>

             {/* Grade de Postos */}
             <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                   <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Postos no Corredor
                   </h2>
                   <span className="text-[10px] font-bold text-white/20">{totalStations} UNIDADES</span>
                </div>
                
                <div className="grid gap-3 sm:grid-cols-2">
                   {stations.map(station => {
                      const hasRecent = recentReports.some(r => r.stationId === station.id);
                      return (
                        <div key={station.id} className={cn(
                          "group relative flex flex-col justify-between rounded-3xl border border-white/5 p-5 transition-all hover:border-white/20",
                          hasRecent ? "bg-white/[0.03]" : "bg-black"
                        )}>
                           <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                 <p className="truncate text-sm font-bold text-white/90 group-hover:text-white">{getStationPublicName(station)}</p>
                                 {hasRecent && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                              </div>
                              <p className="truncate text-[10px] text-white/30 uppercase tracking-widest">{station.neighborhood}</p>
                           </div>
                           
                           <div className="mt-6 flex items-center justify-between">
                              <Badge variant="outline" className="text-[8px] border-white/5 bg-white/5 text-white/40 uppercase">
                                {station.brand}
                              </Badge>
                              <Link 
                                href={`/postos/${station.id}?ref=group_page` as Route}
                                className="text-white/20 hover:text-[color:var(--color-accent)] transition-colors"
                              >
                                 <ExternalLink className="h-4 w-4" />
                              </Link>
                           </div>
                        </div>
                      );
                   })}
                </div>
             </div>

          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="border-t border-white/5 px-6 py-16 text-center bg-black">
         <div className="mx-auto max-w-xs space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">
               BOMBA ABERTA
            </p>
            <p className="text-[11px] text-white/30 leading-relaxed italic">
              Operação territorial movida por motoristas reais. 
              Sem algoritmos de propaganda, apenas o preço como ele é.
            </p>
         </div>
      </footer>
    </div>
  );
}

