import Link from "next/link";
import { ArrowLeft, Target, Lightbulb, Zap, AlertCircle, Copy, CheckCircle2, Map, Users, Network, Settings, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { requireAdminUser } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBetaSynthesis } from "@/lib/ops/beta-synthesis";
import { CopySynthesisButton } from "@/components/admin/copy-synthesis-button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BetaLearningPage() {
  await requireAdminUser();
  const synthesis = await getBetaSynthesis();

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20 pt-1">
      {/* Header */}
      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={"/admin/ops" as any} className="rounded-full border border-white/10 bg-white/5 p-2 hover:bg-white/10">
              <ArrowLeft className="h-5 w-5 text-white/70" />
            </Link>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Beta Insights</p>
              <h1 className="text-3xl font-bold tracking-tight text-white">Aprendizado de Rua</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <CopySynthesisButton synthesis={synthesis} />
          </div>
        </div>
      </SectionCard>

      {/* Hero Insights */}
      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard className="space-y-6 border-l-4 border-l-rose-500">
           <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-rose-400" />
              <h2 className="text-xl font-bold text-white">Síntese de Campo</h2>
           </div>
           
           <div className="space-y-6">
              <div className="space-y-2">
                 <p className="text-xs uppercase tracking-widest text-white/30">O que está funcionando</p>
                 <p className="text-sm leading-relaxed text-white/80">{synthesis.fieldInsights.workingStatus}</p>
              </div>
              
              <div className="space-y-2">
                 <p className="text-xs uppercase tracking-widest text-rose-400/40 font-bold">O que está travando</p>
                 <p className="text-sm leading-relaxed text-rose-200/90">{synthesis.fieldInsights.blockingIssues}</p>
              </div>
           </div>
        </SectionCard>

        <div className="grid gap-4">
           <SectionCard className="space-y-3">
              <div className="flex items-center justify-between">
                 <p className="text-xs uppercase tracking-widest text-white/30">Métricas de Ritmo</p>
                 <Zap className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                 <span className="text-3xl font-bold text-white">{synthesis.dailySummary.avgSubmissionSpeedSeconds}s</span>
                 <span className="text-xs text-white/40">Câmera → Envio (médio)</span>
              </div>
              <div className="mt-2 text-xs text-white/50 flex items-center gap-2">
                 <Badge variant="outline" className="text-[9px]">OTIMIZADO</Badge>
                 <span>Abaixo da meta de 60s</span>
              </div>
           </SectionCard>

           <SectionCard className="space-y-3">
              <div className="flex items-center justify-between">
                 <p className="text-xs uppercase tracking-widest text-white/30">Tags de Aprendizado</p>
                 <Lightbulb className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                 {synthesis.learningTags.map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                       {tag}
                    </Badge>
                 ))}
              </div>
           </SectionCard>
        </div>
      </div>

      {/* Voz do Tester (Qualitative) */}
      {synthesis.qualitativeFeedback && (
        <SectionCard className="space-y-6 bg-emerald-500/5 border-emerald-500/10">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Voz do Tester (Beta Qualitativo)</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-white/30">Principais Sentimentos</p>
              <div className="flex flex-wrap gap-2">
                {synthesis.qualitativeFeedback.commonTags.map(({ tag, count }) => (
                  <div key={tag} className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
                    <span className="text-xs font-bold text-emerald-400 uppercase">{tag}</span>
                    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 h-4 min-w-[1.2rem] px-1 justify-center border-none">
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-white/30">Comentários em Destaque</p>
              <div className="space-y-3">
                {synthesis.qualitativeFeedback.topMessages.map((msg, i) => (
                  <div key={i} className="relative rounded-2xl border border-white/5 bg-black/20 p-4 text-sm italic text-white/70">
                    <span className="absolute -top-2 left-4 bg-zinc-900 px-2 text-[10px] not-italic text-white/30">Tester #{i+1}</span>
                    "{msg}"
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="pt-2 border-t border-white/5">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="font-bold text-emerald-400">Motivos de atrito:</span>
                {synthesis.qualitativeFeedback.topMotives.map((m, i) => (
                  <span key={i}>{m.otive}{i < synthesis.qualitativeFeedback!.topMotives.length - 1 ? " • " : ""}</span>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Geographic Insights */}
      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
         <SectionCard className="space-y-6">
            <div className="flex items-center gap-2">
               <Map className="h-5 w-5 text-blue-400" />
               <h2 className="text-xl font-bold text-white">Cobertura Territorial</h2>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
               <div className="rounded-2xl border border-white/5 bg-white/5 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Recortes Ativos (24h)</p>
                  <ul className="space-y-2">
                     {synthesis.dailySummary.activeGroups.length > 0 ? synthesis.dailySummary.activeGroups.map(name => (
                        <li key={name} className="flex items-center gap-2 text-sm text-white/70">
                           <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                           {name}
                        </li>
                     )) : <li className="text-xs text-white/30 italic">Sem coletas registradas.</li>}
                  </ul>
               </div>

               <div className="rounded-2xl border border-rose-500/10 bg-rose-500/5 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-rose-400">Gargalos Geográficos</p>
                  <ul className="space-y-2">
                     {synthesis.dailySummary.failedGroups.length > 0 ? synthesis.dailySummary.failedGroups.map(name => (
                        <li key={name} className="flex items-center gap-2 text-sm text-white/70">
                           <AlertCircle className="h-4 w-4 text-rose-400" />
                           {name}
                        </li>
                     )) : <li className="text-xs text-white/30 italic">Sem grupos travados.</li>}
                  </ul>
               </div>
            </div>

            <div className="space-y-3 pt-2">
               <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Gargalos Técnicos mais Repetidos</h3>
               <div className="flex flex-wrap gap-2">
                  {synthesis.dailySummary.bottlenecks.map(b => (
                     <Badge key={b} variant="outline" className="border-white/10 text-white/50 lowercase">
                        {b.replace(/_/g, " ")}
                     </Badge>
                  ))}
               </div>
            </div>
         </SectionCard>

         <div className="space-y-6">
            <SectionCard className="space-y-4 bg-white/2 border-white/10">
               <h3 className="flex items-center gap-2 font-bold text-white">
                  <Target className="h-4 w-4 text-rose-400" />
                  Próximos Passos
               </h3>
               <div className="space-y-3">
                  {synthesis.recommendations.map((rec, i) => (
                     <div key={i} className="flex gap-3 text-sm leading-relaxed text-white/60">
                        <span className="text-white/20 select-none">{i+1}.</span>
                        {rec}
                     </div>
                  ))}
               </div>
               <div className="pt-2">
                  <Button variant="primary" className="w-full text-xs h-9">
                    Atualizar Readiness
                  </Button>
               </div>
            </SectionCard>
            
            {/* Learning Tags Breakdown */}
            <div className="grid grid-cols-2 gap-3">
               <div className="rounded-xl border border-white/5 bg-white/2 p-3 text-center">
                  <Users className="h-4 w-4 mx-auto mb-2 text-blue-400" />
                  <p className="text-[10px] uppercase text-white/30 font-bold mb-1">UX & Coleta</p>
                  <p className="text-sm font-bold text-white">Forte</p>
               </div>
               <div className="rounded-xl border border-white/5 bg-white/2 p-3 text-center">
                  <Network className="h-4 w-4 mx-auto mb-2 text-orange-400" />
                  <p className="text-[10px] uppercase text-white/30 font-bold mb-1">Rede & API</p>
                  <p className="text-sm font-bold text-white">Estável</p>
               </div>
               <div className="rounded-xl border border-white/5 bg-white/2 p-3 text-center">
                  <CheckCircle2 className="h-4 w-4 mx-auto mb-2 text-emerald-400" />
                  <p className="text-[10px] uppercase text-white/30 font-bold mb-1">Moderação</p>
                  <p className="text-sm font-bold text-white">SLA OK</p>
               </div>
               <div className="rounded-xl border border-white/5 bg-white/2 p-3 text-center">
                  <Settings className="h-4 w-4 mx-auto mb-2 text-purple-400" />
                  <p className="text-[10px] uppercase text-white/30 font-bold mb-1">Cadastro</p>
                  <p className="text-sm font-bold text-white">Revisar</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
