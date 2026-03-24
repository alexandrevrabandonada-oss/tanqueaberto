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
import type { UtilityRole } from "@/lib/ops/collector-trust";
import { SubmissionStatusLine } from "@/components/history/submission-status-line";
import { formatRecencyLabel } from "@/lib/format/time";

export interface RetentionSurfaceItem {
  id: string;
  type: SurfaceType;
  content: React.ReactNode;
}

export function useRetentionSurfaces() {
  const router = useRouter();
  const { focus, pendingSubmissionsCount } = useOperationalFocus();
  const { mission } = useMissionContext();
  const { reporterNickname, submissions } = useMySubmissions();
  const [role, setRole] = useState<UtilityRole>('iniciante');

  useEffect(() => {
    async function checkRole() {
      const result = await getUtilityStatusAction(reporterNickname, null);
      if (result) setRole(result.status.role);
    }
    checkRole();
  }, [reporterNickname]);

  const surfaces: RetentionSurfaceItem[] = [];

  // 0. Utility Status (Main Hub Identity)
  surfaces.push({
    id: "utility_status_identity",
    type: "OPERATIONAL_RETENTION",
  content: <UtilityStatusCard />
});

// 0.1 Last Submission Cycle (Feedback de Loop)
const lastSub = submissions[0];
if (lastSub) {
  surfaces.push({
    id: "retention_last_cycle",
    type: "OPERATIONAL_RETENTION",
    content: (
      <div className="flex flex-col gap-3 rounded-[28px] bg-white/[0.03] border border-white/8 p-5">
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
}

  // 1. Pending Offline Submissions
  if (pendingSubmissionsCount > 0) {
    surfaces.push({
      id: "retention_offline_queue",
      type: "OPERATIONAL_RETENTION",
      content: (
        <div className="flex items-center justify-between gap-3 rounded-[20px] bg-orange-500/10 border border-orange-500/20 p-4">
          <div className="flex items-center gap-3">
             <div className="rounded-full bg-orange-500/20 p-2">
               <WifiOff className="h-4 w-4 text-orange-400" />
             </div>
             <div>
               <p className="text-sm font-bold text-white">Envios Pendentes</p>
               <p className="text-xs text-white/60">Você tem {pendingSubmissionsCount} preço(s) aguardando conexão.</p>
             </div>
          </div>
          <button 
            onClick={() => {
              void trackProductEvent({ 
                eventType: "retention_resume_click" as any, 
                pagePath: "/",
                scopeType: "retention", 
                scopeId: "offline_queue" 
              });
              router.push("/historico" as Route);
            }}
            className="rounded-full bg-white/10 p-2 hover:bg-white/20 transition-colors"
          >
             <ArrowRight className="h-4 w-4 text-white" />
          </button>
        </div>
      )
    });
  }

  // 2. Active Mission Resumption
  if (mission) {
    surfaces.push({
      id: "retention_active_mission",
      type: "OPERATIONAL_RETENTION",
      content: (
        <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[color:var(--color-accent)]/10 border border-[color:var(--color-accent)]/20 p-4">
          <div className="flex items-center gap-3">
             <div className="rounded-full bg-[color:var(--color-accent)]/20 p-2">
               <LayoutList className="h-4 w-4 text-[color:var(--color-accent)]" />
             </div>
             <div>
               <p className="text-sm font-bold text-white">Missão em Aberto</p>
               <p className="text-xs text-white/60">Continue a missão em {mission.groupName}.</p>
             </div>
          </div>
          <button 
            onClick={() => {
              void trackProductEvent({ 
                eventType: "retention_resume_click" as any, 
                pagePath: "/",
                scopeType: "retention", 
                scopeId: "mission_resume" 
              });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="rounded-full bg-[color:var(--color-accent)]/20 p-2 hover:bg-[color:var(--color-accent)]/30 transition-colors"
          >
             <span className="text-xs font-bold text-[color:var(--color-accent)] px-1">RETOMAR</span>
          </button>
        </div>
      )
    });
  }

  // 3. Last Viewed Town (Recorte Forte)
  if (!mission && focus.lastTownSlug && focus.lastTownName) {
    surfaces.push({
      id: "retention_last_town",
      type: "OPERATIONAL_RETENTION",
      content: (
        <div className="flex items-center justify-between gap-3 rounded-[20px] bg-purple-500/10 border border-purple-500/20 p-4">
          <div className="flex items-center gap-3">
             <div className="rounded-full bg-purple-500/20 p-2">
               <MapPin className="h-4 w-4 text-purple-400" />
             </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {role === 'senior' ? `Auditar ${focus.lastTownName}?` : `Voltar para ${focus.lastTownName}?`}
                </p>
                <p className="text-xs text-white/60">
                   {role === 'senior' 
                     ? "Existem lacunas de alta prioridade aguardando sua revisão." 
                     : "Veja os últimos preços ou inicie uma missão."
                   }
                </p>
              </div>
          </div>
          <button 
            onClick={() => {
              void trackProductEvent({ 
                eventType: "retention_resume_click" as any, 
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

  return surfaces;
}
