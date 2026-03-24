"use client";

import React from "react";
import { MapPin, LayoutList, WifiOff, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { useOperationalFocus } from "@/hooks/use-operational-focus";
import { useMissionContext } from "@/components/mission/mission-context";
import { type SurfaceType } from "@/lib/ui/surface-orchestrator";
import { trackProductEvent } from "@/lib/telemetry/client";
import { Route } from "next";
import { UtilityStatusCard } from "@/components/user/utility-status-card";
import { getUtilityStatusAction } from "@/app/actions/user";
import { useMySubmissions } from "@/hooks/use-my-submissions";
import { useEffect, useState } from "react";
import type { UtilityRole, CollectorTrust } from "@/lib/ops/collector-trust";
import { SubmissionStatusLine } from "@/components/history/submission-status-line";
import { formatRecencyLabel } from "@/lib/format/time";
import { Trophy, Target, Zap, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOperationalMemory } from "@/hooks/use-operational-memory";
import { useInbox } from "@/hooks/use-inbox";
import { CollectorInbox } from "@/components/user/collector-inbox";

export interface RetentionSurfaceItem {
  id: string;
  type: SurfaceType;
  content: React.ReactNode;
}

export function useRetentionSurfaces() {
  const router = useRouter();
  const { focus, pendingSubmissionsCount } = useOperationalFocus();
  const { memory } = useOperationalMemory();
  const { mission, stats, progress } = useMissionContext();
  const { reporterNickname, submissions } = useMySubmissions();
  const { items: inboxItems, unreadCount } = useInbox();
  const [trust, setTrust] = useState<CollectorTrust | null>(null);
  const [role, setRole] = useState<UtilityRole>('iniciante');

  useEffect(() => {
    async function checkRole() {
      const result = await getUtilityStatusAction(reporterNickname, null, {
        hasMission: !!mission,
        hasPending: pendingSubmissionsCount > 0
      });
      if (result) {
        setRole(result.status.role);
        setTrust(result.trust);
      }
    }
    checkRole();
  }, [reporterNickname, mission, pendingSubmissionsCount]);

  const surfaces: RetentionSurfaceItem[] = [];

  // --- PRIORIDADE 0: ATIVAÇÃO DE INICIANTE (FUNIL 1.0) ---
  const isTrueBeginner = role === 'iniciante' && submissions.length === 0;
  
    if (isTrueBeginner && focus.suggestedStation) {
    surfaces.push({
      id: "retention_beginner_activation",
      type: "ACTION_PROMPT",
      content: (
        <div className="flex flex-col gap-3 sm:gap-4 rounded-[28px] bg-blue-600/10 border border-blue-500/20 p-4 sm:p-5 shadow-lg shadow-blue-500/5">
           <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                 <div className="rounded-full bg-blue-500/20 p-2">
                   <Sparkles className="h-4 w-4 text-blue-400" />
                 </div>
                 <div>
                   <p className="text-sm font-bold text-white uppercase italic tracking-tight">Sua Primeira Missão</p>
                   <p className="text-xs text-white/50">Ative seu status de colaborador real.</p>
                 </div>
              </div>
           </div>

           <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
              <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-1.5">Posto Sugerido</p>
              <h4 className="text-sm font-bold text-white mb-1">{focus.suggestedStation.name}</h4>
              <p className="text-[10px] text-blue-400/80 font-bold uppercase tracking-tighter flex items-center gap-1">
                <Target className="h-3 w-3" /> Maior lacuna de dados no seu recorte
              </p>
           </div>

           <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                 <p className="text-[9px] font-black uppercase text-white/20 tracking-[0.2em]">Sua Jornada</p>
                 <p className="text-[9px] font-mono text-blue-400/60">{focus.lastTownSlug ? "66%" : "33%"} CONCLUÍDO</p>
              </div>
              <div className="flex gap-1.5 h-1">
                 <div className="flex-1 rounded-full bg-blue-500" />
                 <div className={cn("flex-1 rounded-full", focus.lastTownSlug ? "bg-blue-500" : "bg-white/10")} />
                 <div className="flex-1 rounded-full bg-white/10" />
              </div>
              <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-white/30 px-0.5">
                 <span className="text-blue-400">Perfil</span>
                 <span>Cidade</span>
                 <span>Envio</span>
              </div>
           </div>

           <button 
             onClick={() => {
               void trackProductEvent({ 
                 eventType: "hub_activation_click" as any, 
                 pagePath: "/",
                 scopeType: "activation", 
                 scopeId: focus.suggestedStation?.id,
                 payload: { stationName: focus.suggestedStation?.name }
               });
               router.push(`/enviar?stationId=${focus.suggestedStation?.id}#photo` as Route);
             }}
             className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase italic text-sm tracking-wide active:scale-95 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-2"
           >
              Iniciar Coleta Agora
              <ArrowRight className="h-4 w-4" />
           </button>
        </div>
      )
    });
  }

  useEffect(() => {
    if (surfaces.length > 0) {
      void trackProductEvent({
        eventType: "hub_retention_view" as any,
        pagePath: "/",
        payload: { surfacesCount: surfaces.length, role }
      });
    }
  }, [surfaces.length > 0]);

  // 0. Utility Status (Main Hub Identity)
  surfaces.push({
    id: "utility_status_identity",
    type: "OPERATIONAL_RETENTION",
  content: <UtilityStatusCard unreadCount={unreadCount} />
});

// 0.05 Collector Inbox (Novidades Assíncronas)
if (inboxItems.length > 0) {
  surfaces.push({
    id: "retention_collector_inbox",
    type: "OPERATIONAL_RETENTION",
    content: (
      <div className="rounded-[32px] border border-white/8 bg-white/[0.02] p-1 sm:p-2">
        <CollectorInbox />
      </div>
    )
  });
}

// 0.1 Last Submission Cycle (Feedback de Loop)
const lastSub = submissions[0];
if (lastSub) {
  surfaces.push({
    id: "retention_last_cycle",
    type: "OPERATIONAL_RETENTION",
    content: (
      <div className="flex flex-col gap-2 sm:gap-3 rounded-[28px] bg-white/[0.03] border border-white/8 p-4 sm:p-5">
        <div className="flex justify-between items-start">
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Acompanhar Ciclo</p>
            <h4 className="text-sm font-bold text-white">{lastSub.stationName}</h4>
          </div>
          <span className="text-[10px] text-white/20 font-mono italic">{formatRecencyLabel(lastSub.submittedAt)}</span>
        </div>
        
        <SubmissionStatusLine 
          status={lastSub.status} 
          submittedAt={lastSub.submittedAt}
          moderatedAt={lastSub.status !== 'pending' ? lastSub.updatedAt : null}
          className="py-2"
        />

        {lastSub.status === 'approved' && (
          <div className="mt-1 flex items-center gap-2 text-[10px] text-green-500/80 font-bold bg-green-500/5 p-2 rounded-xl border border-green-500/10">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Seu dado já está ajudando a rede.
          </div>
        )}
      </div>
    )
  });
}  // --- PRIORIDADE 1: MISSÃO ATIVA ---
  if (mission) {
    surfaces.push({
      id: "retention_active_mission",
      type: "OPERATIONAL_RETENTION",
      content: (
        <div className="flex flex-col gap-3 sm:gap-4 rounded-[28px] bg-[color:var(--color-accent)]/10 border border-[color:var(--color-accent)]/20 p-4 sm:p-5">
           <div className="flex justify-between items-start">
             <div className="flex items-center gap-3">
                <div className="rounded-full bg-[color:var(--color-accent)]/20 p-2">
                  <LayoutList className="h-4 w-4 text-[color:var(--color-accent)]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Missão em Aberto</p>
                  <p className="text-xs text-white/60">{mission.groupName}</p>
                </div>
             </div>
             <div className="text-right">
               <p className="text-[10px] font-black uppercase text-[color:var(--color-accent)] tracking-widest">{stats?.completed}/{stats?.total}</p>
               <div className="mt-1 h-1 w-16 bg-white/10 rounded-full overflow-hidden">
                 <div className="h-full bg-[color:var(--color-accent)]" style={{ width: `${progress}%` }} />
               </div>
             </div>
           </div>
           
           <button 
             onClick={() => {
               void trackProductEvent({ 
                 eventType: "hub_continuity_action" as any, 
                 pagePath: "/",
                 scopeType: "retention", 
                 scopeId: "mission_resume" 
               });
               window.scrollTo({ top: 0, behavior: 'smooth' });
             }}
             className="w-full py-3 rounded-2xl bg-[color:var(--color-accent)] text-black font-black uppercase italic text-xs tracking-widest active:scale-[0.98] transition-all"
           >
              Retomar Coleta
           </button>
        </div>
      )
    });
  }

  // --- PRIORIDADE 2: FILA OFFLINE ---
  if (pendingSubmissionsCount > 0) {
    surfaces.push({
      id: "retention_offline_queue",
      type: "OPERATIONAL_RETENTION",
      content: (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 p-3 sm:p-4">
          <div className="flex items-center gap-3">
             <div className="rounded-full bg-orange-500/20 p-2">
               <WifiOff className="h-4 w-4 text-orange-400" />
             </div>
             <div>
               <p className="text-sm font-bold text-white">Envios Pendentes</p>
               <p className="text-xs text-white/60">{pendingSubmissionsCount} preco(s) aguardando.</p>
             </div>
          </div>
          <button 
            onClick={() => {
              void trackProductEvent({ 
                eventType: "hub_continuity_action" as any, 
                pagePath: "/",
                scopeType: "retention", 
                scopeId: "offline_queue" 
              });
              router.push("/historico" as Route);
            }}
            className="rounded-xl border border-orange-500/40 px-3 py-1.5 text-[10px] font-bold text-orange-400 uppercase tracking-widest hover:bg-orange-500/10 transition-colors"
          >
             Sincronizar
          </button>
        </div>
      )
    });
  }

  // --- PRIORIDADE 3: IMPACTO TERRITORIAL (NOVO 3.0) ---
  if (focus.lastTownName && reporterNickname) {
    surfaces.push({
      id: "retention_territorial_impact",
      type: "OPERATIONAL_RETENTION",
      content: (
        <div className="flex flex-col gap-3 sm:gap-4 rounded-[28px] bg-white/[0.03] border border-white/8 p-4 sm:p-5">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Seu Impacto</p>
              <h4 className="text-sm font-bold text-white uppercase italic">{focus.lastTownName}</h4>
            </div>
            <Trophy className="h-4 w-4 text-amber-500/50" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/5 border border-white/5 p-3 text-center">
               <Target className="h-3.5 w-3.5 text-blue-400 mx-auto mb-1.5" />
               <p className="text-lg font-black text-white leading-none">{trust?.totalReports ?? "0"}</p>
               <p className="text-[8px] uppercase text-white/20 tracking-tighter mt-1">Envios Totais</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/5 p-3 text-center">
               <Zap className="h-3.5 w-3.5 text-yellow-400 mx-auto mb-1.5" />
               <p className="text-lg font-black text-white leading-none">{trust?.missionsCompleted ?? "0"}</p>
               <p className="text-[8px] uppercase text-white/20 tracking-tighter mt-1">Missões Concluídas</p>
            </div>
          </div>
          <p className="text-[10px] text-white/30 text-center italic">
            {trust && trust.streakDays > 1 ? `${trust.streakDays} dias de constância operacional.` : "Inicie sua sequência hoje."}
          </p>
        </div>
      )
    });
  }

  // --- PRIORIDADE 4: RETOMADA CONTEXTUAL ---
  if (!mission && focus.lastTownSlug && focus.lastTownName) {
    surfaces.push({
      id: "retention_last_town",
      type: "OPERATIONAL_RETENTION",
      content: (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 p-4">
          <div className="flex items-center gap-3">
             <div className="rounded-full bg-purple-500/20 p-2">
               <MapPin className="h-4 w-4 text-purple-400" />
             </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {role === 'senior' ? `Auditar ${focus.lastTownName}` : `Voltar para ${focus.lastTownName}`}
                </p>
                <p className="text-xs text-white/60">
                   {role === 'senior' ? "Gaps pendentes aguardando revisão." : "Iniciar nova missão."}
                </p>
              </div>
          </div>
          <button 
            onClick={() => {
              void trackProductEvent({ 
                eventType: "hub_continuity_action" as any, 
                pagePath: "/",
                scopeType: "retention", 
                scopeId: "town_resume",
                payload: { role }
              });
              router.push(`/?city=${focus.lastTownSlug}` as Route);
            }}
            className="rounded-full bg-purple-500/20 p-2 hover:bg-purple-500/30 transition-colors"
          >
             <ArrowRight className="h-4 w-4 text-purple-400" />
          </button>
        </div>
      )
    });
  }

  // --- PRIORIDADE 5: ATALHOS DO DIA (MEMÓRIA CURTA) ---
  const recentStation = memory.recentStations[0];
  if (!mission && recentStation && submissions[0]?.stationId !== recentStation.id) {
    surfaces.push({
      id: "retention_daily_shortcut_station",
      type: "OPERATIONAL_RETENTION",
      content: (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center gap-3">
             <div className="rounded-full bg-orange-400/10 p-2">
               <Clock3 className="h-4 w-4 text-orange-400" />
             </div>
              <div>
                <p className="text-sm font-bold text-white uppercase italic tracking-tight">Retomar onde parou</p>
                <p className="text-[10px] text-white/50">{recentStation.name}</p>
              </div>
          </div>
          <button 
            onClick={() => {
              void trackProductEvent({ 
                eventType: "memory_shortcut_click" as any, 
                pagePath: "/",
                scopeType: "retention", 
                scopeId: "station_resume",
                payload: { stationId: recentStation.id }
              });
              router.push(`/postos/${recentStation.id}` as Route);
            }}
            className="rounded-full bg-white/10 p-2 hover:bg-white/20 transition-colors"
          >
             <ArrowRight className="h-4 w-4 text-white" />
          </button>
        </div>
      )
    });
  }

  return surfaces;
}
