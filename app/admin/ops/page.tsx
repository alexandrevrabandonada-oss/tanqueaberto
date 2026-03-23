import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Zap, Target, BarChart3, Clock, CheckCircle2, AlertTriangle, Download, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { requireAdminUser } from "@/lib/auth/admin";
import { getDailyOpsDigest } from "@/lib/ops/daily-digest";
import { formatDateTimeBR } from "@/lib/format/time";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOpsPage() {
  await requireAdminUser();
  const digest = await getDailyOpsDigest();

  return (
    <div className="space-y-6 pb-20 pt-1">
      {/* Header */}
      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/5 p-2 hover:bg-white/10">
              <ArrowLeft className="h-5 w-5 text-white/70" />
            </Link>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Live Operations</p>
              <h1 className="text-3xl font-bold tracking-tight text-white">Loop Diário</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right">
               <p className="text-xs text-white/30">Última atualização</p>
               <p className="text-sm font-medium text-white/60">{formatDateTimeBR(digest.timestamp)}</p>
             </div>
             <Link href={"/admin/ops/qualidade" as any}>
                <Button variant="secondary" className="gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Qualidade do Dado
                </Button>
             </Link>
             <Link href={"/admin/ops/aprendizado" as any}>
                <Button variant="secondary" className="gap-2">
                  <Target className="h-4 w-4 text-rose-400" />
                  Aprendizado do Beta
                </Button>
             </Link>
             <a href="/api/admin/ops/export" download>
                <Button variant="secondary" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
             </a>
          </div>
        </div>
      </SectionCard>

      {/* Hero Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SectionCard className="border-l-4 border-l-[color:var(--color-accent)]">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-white/40">Envios 24h</p>
            <Zap className="h-4 w-4 text-[color:var(--color-accent)]" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{digest.summary.submissions24h}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-white/50">
            <span className="text-emerald-400">{digest.summary.approvals24h} aprovados</span>
            <span>•</span>
            <span className="text-rose-400">{digest.summary.rejections24h} rejeitados</span>
          </div>
        </SectionCard>

        <SectionCard className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-white/40">SLA Médio</p>
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{Math.round(digest.summary.avgSlaMinutes)}<span className="text-sm font-normal text-white/40 ml-1">min</span></p>
          <p className="mt-1 text-xs text-white/50">Tempo Envio → Moderação</p>
        </SectionCard>

        <SectionCard className={cn("border-l-4", digest.summary.pendingTotal > 20 ? "border-l-orange-500" : "border-l-emerald-500")}>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-white/40">Fila Atual</p>
            <BarChart3 className="h-4 w-4 text-orange-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{digest.summary.pendingTotal}</p>
          <p className="mt-1 text-xs text-white/50">Pendentes aguardando ação</p>
        </SectionCard>

        <SectionCard className="border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-white/40">Health Rate</p>
            <CheckCircle2 className="h-4 w-4 text-purple-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">98.2<span className="text-sm font-normal text-white/40 ml-1">%</span></p>
          <p className="mt-1 text-xs text-white/50">Sucesso de envio App → API</p>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Recommended Actions */}
        <div className="space-y-6">
          <SectionCard className="space-y-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-rose-400" />
              <h2 className="text-xl font-bold text-white">Ações Recomendadas</h2>
            </div>

            <div className="space-y-3">
              {digest.recommendedActions.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center">
                  <p className="text-sm text-white/40">Nenhuma ação crítica recomendada no momento.</p>
                </div>
              ) : (
                digest.recommendedActions.map((action, idx) => (
                  <div 
                    key={idx} 
                    className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "rounded-full p-2",
                          action.type === "intensificar" ? "bg-emerald-500/10 text-emerald-400" :
                          action.type === "moderar" ? "bg-orange-500/10 text-orange-400" :
                          action.type === "segurar" ? "bg-rose-500/10 text-rose-400" :
                          "bg-blue-500/10 text-blue-400"
                        )}>
                           <Zap className="h-4 w-4" />
                        </div>
                        <h3 className="font-bold text-white">{action.label}</h3>
                      </div>
                      <Badge variant={action.priority === "alta" ? "danger" : "warning"}>
                        {action.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-white/60">{action.description}</p>
                    <div className="flex items-center gap-2 pt-2">
                       <Button variant="secondary" className="h-8 px-3 text-xs">Resolver agora</Button>
                       <Button variant="ghost" className="h-8 px-3 text-xs opacity-0 group-hover:opacity-100">Ignorar</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          {/* Group Changes Table */}
          <SectionCard className="space-y-6 overflow-hidden p-0">
            <div className="border-b border-white/5 px-6 pt-6 pb-4">
              <h2 className="text-xl font-bold text-white">Desempenho por Grupo (Top Mudanças)</h2>
              <p className="text-sm text-white/40">Comparativo de Score vs. Médias Recentes</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-white/30">
                    <th className="px-6 py-4 font-medium">Grupo Territorial</th>
                    <th className="px-6 py-4 font-medium">Score Atual</th>
                    <th className="px-6 py-4 font-medium">Variação</th>
                    <th className="px-6 py-4 font-medium">Tendência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {digest.groupChanges.map((group) => (
                    <tr key={group.groupId} className="transition hover:bg-white/5">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-white">{group.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className="h-2 w-16 overflow-hidden rounded-full bg-white/10">
                              <div 
                                className={cn(
                                  "h-full rounded-full",
                                  group.currentScore > 75 ? "bg-emerald-500" : 
                                  group.currentScore > 40 ? "bg-orange-500" : "bg-rose-500"
                                )} 
                                style={{ width: `${group.currentScore}%` }}
                              />
                           </div>
                           <span className="text-xs font-mono text-white/60">{group.currentScore}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn(
                          "flex items-center gap-1 text-xs font-medium",
                          group.scoreChange > 0 ? "text-emerald-400" : group.scoreChange < 0 ? "text-rose-400" : "text-white/40"
                        )}>
                          {group.scoreChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : group.scoreChange < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                          {Math.abs(group.scoreChange)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <Badge variant={group.trend === "up" ? "default" : group.trend === "down" ? "danger" : "outline"}>
                            {group.trend.toUpperCase()}
                         </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Sidebar Insights */}
        <div className="space-y-6">
           <SectionCard className="space-y-4 bg-emerald-500/5 border-emerald-500/10">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-white">Status de Lançamento</h3>
              </div>
              <div className="space-y-3">
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-white/60">Grupos &apos;Ready&apos;</span>
                   <span className="font-bold text-white">12</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-white/60">Grupos em Validação</span>
                   <span className="font-bold text-white">8</span>
                 </div>
                 <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[60%] rounded-full bg-emerald-500" />
                 </div>
                 <p className="text-[10px] text-white/30 text-center uppercase tracking-widest">Rollout Total: 60%</p>
              </div>
           </SectionCard>

           <SectionCard className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                <h3 className="font-bold text-white">Fila de SLA Crítica</h3>
              </div>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <p className="text-xs text-white/40 uppercase tracking-widest">Maior Latência</p>
                    <p className="text-sm font-semibold text-white">Resende Centro (12h+)</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-xs text-white/40 uppercase tracking-widest">Maior Volume Pendente</p>
                    <p className="text-sm font-semibold text-white">Volta Redonda (14 reports)</p>
                 </div>
                 <Button variant="secondary" className="w-full text-xs font-bold py-2">Congelar Grupos Críticos</Button>
              </div>
           </SectionCard>
        </div>
      </div>
    </div>
  );
}
