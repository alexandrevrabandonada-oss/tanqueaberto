import Link from "next/link";
import { getAuditGroups } from "@/lib/audit/groups";
export const dynamic = 'force-dynamic';
import { detectActiveAlerts, type OperationalAlert } from "@/lib/ops/alerts";
import { getCollectorTrustList } from "@/lib/data/queries";
import { getKillSwitches } from "@/lib/ops/kill-switches";
import { 
  toggleKillSwitchAction,
  getOperationalHistory,
  triggerRolloutEngineAction,
  getTerritorialRolloutHistory,
  getOperationalSynthesisAction
} from "./actions";
import { 
  Zap, 
  Shield, 
  Activity, 
  Map as MapIcon, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  History,
  Info,
  ChevronRight,
  Pause,
  Play,
  ArrowUpCircle,
  ArrowDownCircle,
  UserCheck,
  Star,
  MessageSquare,
  Sparkles,
  ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KillSwitchToggle } from "./components/kill-switch-toggle";
import { RolloutControl } from "./components/rollout-control";
import { RolloutHistoryPanel } from "./components/rollout-history-panel";
import { TriggerRolloutButton } from "./components/trigger-rollout-button";
import { VozDaRuaClusters } from "./components/voz-da-rua-clusters";
import { CycleLatencySummary } from "./components/cycle-latency-summary";
import { OperationalSynthesis } from "@/components/admin/command/operational-synthesis";
import { type AuditStationGroup } from "@/lib/audit/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Copy, FlaskConical } from "lucide-react";
import { TesterMonitorPanel } from "./components/tester-monitor-panel";
import { BetaReadinessPanel } from "./components/beta-readiness-panel";
import { getTerritoryWorkflowReadout } from "@/lib/ops/territory-workflow";

export default async function OpsDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: feedback } = await supabase
    .from('beta_feedback_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  const [killSwitches, groups, alerts, history, collectors, territorialHistory, synthesis, territoryWorkflow] = await Promise.all([
    getKillSwitches(),
    getAuditGroups(),
    detectActiveAlerts(),
    getOperationalHistory(15),
    getCollectorTrustList(10),
    getTerritorialRolloutHistory(15),
    getOperationalSynthesisAction(),
    getTerritoryWorkflowReadout(120)
  ]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 pb-20">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Operacional</h1>
          <p className="text-white/50 text-sm mt-1">Controle central de resiliência e rollout territorial do beta.</p>
        </div>
        <div className="flex gap-4 items-center">
           <TriggerRolloutButton />
           <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Sistema Online</span>
           </div>
        </div>
      </header>

      <div className="mb-8">
        <OperationalSynthesis synthesis={synthesis} />
      </div>

      <div className="mb-8">
        <BetaReadinessPanel />
      </div>

      <div className="mb-8 rounded-2xl border border-white/5 bg-[#111] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/30">Cobertura territorial</p>
            <p className="mt-1 text-lg font-semibold text-white">Onde a base está fraca</p>
            <p className="mt-1 text-sm text-white/50">Leitura por cidade e bairro para orientar station_editor.</p>
          </div>
          <Link href="/admin/ops/cobertura-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
            Abrir cobertura territorial
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="mb-8">
        <div className="rounded-2xl border border-white/5 bg-[#111] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/30">Impacto da semeadura</p>
              <p className="mt-1 text-lg font-semibold text-white">Quem semeia e o que mudou no território</p>
              <p className="mt-1 text-sm text-white/50">Leitura por período, bairro e editor para medir base útil de campo.</p>
            </div>
            <Link href="/admin/ops/impacto-semeadura-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
              Abrir impacto da semeadura
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="rounded-2xl border border-white/5 bg-[#111] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/30">Histórico de cobertura</p>
              <p className="mt-1 text-lg font-semibold text-white">Snapshots persistidos do território</p>
              <p className="mt-1 text-sm text-white/50">Acompanha evolução por cidade e bairro sem inferência de janela.</p>
            </div>
            <Link href="/admin/ops/historico-cobertura-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
              Abrir histórico territorial
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/8 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-[color:var(--color-accent)]">Rotina territorial</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Marcar o próximo passo da operação</h2>
            <p className="mt-1 text-sm text-white/54">Use o status do território para guiar mutirão, acompanhamento, pausa e a fila do dia.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-[18px] border border-white/8 bg-black/25 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Em mutirão</p>
              <p className="mt-1 text-2xl font-semibold text-white">{territoryWorkflow.summary.emMutirao}</p>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-black/25 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Em acompanhamento</p>
              <p className="mt-1 text-2xl font-semibold text-white">{territoryWorkflow.summary.emAcompanhamento}</p>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-black/25 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Concluído</p>
              <p className="mt-1 text-2xl font-semibold text-white">{territoryWorkflow.summary.concluidoPorEnquanto}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/ops/cobertura-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
            Abrir cobertura territorial
            <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Link href="/admin/ops/impacto-semeadura-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
            Ver impacto da semeadura
          </Link>
          <Link href="/admin/ops/historico-cobertura-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
            Ver histórico territorial
          </Link>
          <Link href="/admin/ops/fila-territorial" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 hover:bg-white/10">
            Abrir fila do dia
          </Link>
          <Link href="/admin/ops/resumo-semanal-postos" className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-[color:var(--color-accent)]/18">
            Resumo semanal
          </Link>
        </div>
        <p className="mt-3 text-[11px] text-white/42">Última marca: {territoryWorkflow.summary.latestUpdatedAt ? territoryWorkflow.summary.latestUpdatedAt : "sem registro"}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA 1: ALERTAS E SAÚDE */}
        <section className="space-y-6">
          <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                Alertas Ativos
              </h2>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/70">
                {alerts.length} ativos
              </span>
            </div>
            <div className="p-4 space-y-3">
              {alerts.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500/30 mx-auto mb-2" />
                  <p className="text-xs text-white/40">Nenhuma regressão detectada agora.</p>
                </div>
              ) : (
                alerts.map((alert: OperationalAlert, i: number) => (
                  <div key={i} className={cn(
                    "p-3 rounded-xl border border-white/5 bg-white/[0.03] space-y-2",
                    alert.severity === 'critical' ? "border-red-500/30 bg-red-500/5" : "border-amber-500/30 bg-amber-500/5"
                  )}>
                    <div className="flex justify-between items-start">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                        alert.severity === 'critical' ? "bg-red-500 text-white" : "bg-amber-500 text-black"
                      )}>
                        {alert.severity}
                      </span>
                      <span className="text-[10px] text-white/40">{alert.alertKind}</span>
                    </div>
                    <p className="text-xs font-semibold leading-relaxed">{alert.message}</p>
                    {alert.suggestedAction && (
                      <div className="flex gap-2 items-start mt-2 pt-2 border-t border-white/5">
                        <Zap className="w-3 h-3 text-white/70 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-white/70 leading-normal italic">{alert.suggestedAction}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
             <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4 flex items-center gap-2">
               <UserCheck className="w-3 h-3 text-white/50" />
               Reputação de Coletores
             </h3>
              <div className="space-y-2">
                {collectors.map((c: any, i: number) => {
                  const aprRate = c.total_reports > 0 ? Math.round((c.approved_reports / c.total_reports) * 100) : 0;
                  return (
                    <div key={i} className="flex justify-between items-center bg-white/[0.02] p-2 rounded-lg border border-white/5">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold truncate">{c.nickname || 'Anônimo'}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[9px] text-white/30 truncate">{c.ip_hash?.slice(0, 8)}...</p>
                          <span className="text-[8px] text-white/20 font-mono">{aprRate}% APR</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                         <span className={cn(
                           "text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-tighter",
                           ['muito_confiável', 'very_trusted'].includes(c.trust_stage) ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                           ['confiável', 'trusted'].includes(c.trust_stage) ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                           ['em_revisão', 'review_needed'].includes(c.trust_stage) ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                           ['bloqueado', 'blocked'].includes(c.trust_stage) ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                           "bg-white/5 text-white/40 border border-white/10"
                         )}>
                           {c.trust_stage.replace('_', ' ')}
                         </span>
                         <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                           <Star className="w-2.5 h-2.5 text-amber-500" />
                           <span className="text-[10px] font-mono font-bold">{c.score}</span>
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
          </div>

          <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
             <CycleLatencySummary />
          </div>

          <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
             <VozDaRuaClusters clusters={synthesis.topClusters || []} />
          </div>

          <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
             <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4 flex items-center gap-2">
               <History className="w-3 h-3" />
               Histórico Recente
             </h3>
             <div className="space-y-4">
                {history.map((log: any, i: number) => (
                  <div key={i} className="flex gap-3 items-start border-l border-white/10 pl-4 py-1 relative">
                    <div className="absolute -left-[4.5px] top-2 w-2 h-2 rounded-full bg-white/20 border border-[#111]" />
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium leading-tight">{log.message}</p>
                      <div className="flex gap-2 items-center">
                        <span className="text-[9px] text-white/20 font-mono">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[9px] px-1 bg-white/5 rounded text-white/40 uppercase font-bold tracking-tighter">
                          {log.actor_id}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </section>

        {/* COLUNA 2: KILL SWITCHES E CONTROLES GERAIS */}
        <section className="space-y-6">
           <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <h2 className="font-bold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  Kill Switches
                </h2>
              </div>
              <div className="p-4 grid grid-cols-1 gap-3">
                <KillSwitchToggle 
                  label="Modo Missão" 
                  description="Desabilita início de novas missões de rua."
                  switchKey="disable_mission_mode"
                  active={killSwitches.disable_mission_mode}
                />
                <KillSwitchToggle 
                  label="Prompts de PWA" 
                  description="Esconde banners de 'Instalar App'."
                  switchKey="disable_pwa_prompts"
                  active={killSwitches.disable_pwa_prompts}
                />
                <KillSwitchToggle 
                  label="Widgets Pesados" 
                  description="Remove componentes territoriais intensos."
                  switchKey="disable_heavy_territorial_widgets"
                  active={killSwitches.disable_heavy_territorial_widgets}
                />
                 <KillSwitchToggle 
                  label="Sugestões Auto" 
                  description="Desliga motor de recomendação inteligente."
                  switchKey="disable_auto_suggestions"
                  active={killSwitches.disable_auto_suggestions}
                />
                 <KillSwitchToggle 
                  label="Fast Lane Mod" 
                  description="Trava priorização automática de moderação."
                  switchKey="disable_fast_lane"
                  active={killSwitches.disable_fast_lane}
                />
              </div>
           </div>

           <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-blue-400">
                <Info className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Guideline Operacional</span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed italic">
                Use os Kill Switches para reagir a picos de carga ou instabilidades na API sem precisar de novo deploy. 
                Toda alteração é logada e revalida o cache global do app.
              </p>
           </div>
        </section>

        {/* COLUNA 3: ROLLOUT TERRITORIAL */}
        <section className="space-y-6">
           <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <h2 className="font-bold flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-green-400" />
                  Abertura Territorial
                </h2>
              </div>
              <div className="p-4 space-y-4">
                {groups.map((group: AuditStationGroup) => (
                  <RolloutControl key={group.id} group={group} />
                ))}
              </div>
           </div>

           <RolloutHistoryPanel logs={territorialHistory} />
        </section>

      </div>

      {/* NOVO: MONITORAMENTO DE TESTERS */}
      <div className="mt-8 pt-8 border-t border-indigo-500/20">
        <div className="bg-[#111] border border-indigo-500/20 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
            <FlaskConical className="w-64 h-64 text-indigo-500 rotate-12" />
          </div>
          <TesterMonitorPanel />
        </div>
      </div>
    </div>
  );
}
















