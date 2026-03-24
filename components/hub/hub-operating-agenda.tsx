"use client";

import { useMemo } from "react";
import { Zap, AlertTriangle, MapPin, CheckCircle2, ArrowRight, Camera, Navigation } from "lucide-react";
import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { type StationWithReports } from "@/lib/types";
import { type MissionState as Mission } from "@/hooks/use-mission";
import { type SubmissionQueueEntry } from "@/lib/queue/submission-queue";
import { calculateDistance, formatDistance } from "@/lib/geo/distance";
import { getStationPublicName } from "@/lib/quality/stations";
import { trackProductEvent } from "@/lib/telemetry/client";
import { cn } from "@/lib/utils";
import { type Route } from "next";

interface HubOperatingAgendaProps {
  stations: StationWithReports[];
  mission: Mission | null;
  localQueue: SubmissionQueueEntry[];
  submissions: any[]; // History
  coords: { lat: number; lng: number } | null;
}

type AgendaActionType = "CRITICAL" | "MISSION" | "PROXIMITY" | "RECALL" | "IMPACT" | "EXPLORE";

interface AgendaAction {
  id: string;
  type: AgendaActionType;
  title: string;
  description: string;
  icon: any;
  href: string;
  label: string;
  tone: "amber" | "blue" | "emerald" | "rose" | "accent";
  metadata?: any;
}

export function HubOperatingAgenda({ stations, mission, localQueue, submissions, coords }: HubOperatingAgendaProps) {
  const agendaActions = useMemo(() => {
    const actions: AgendaAction[] = [];

    // 1. PRIORIDADE MÁXIMA: Erros ou Pendências Críticas
    const failedItems = localQueue.filter(s => s.status === "failed" || s.status === "photo_required" || s.status === "expired");
    if (failedItems.length > 0) {
      actions.push({
        id: "fix-pendency",
        type: "CRITICAL",
        title: "Correção Necessária",
        description: `${failedItems.length} ${failedItems.length === 1 ? 'envio precisa' : 'envios precisam'} de ajuste manual para subir.`,
        icon: AlertTriangle,
        href: "/enviar",
        label: "CORRIGIR AGORA",
        tone: "rose"
      });
    }

    // 2. MISSÃO ATIVA: Continuidade Operacional
    if (mission) {
      actions.push({
        id: "resume-mission",
        type: "MISSION",
        title: "Missão em Andamento",
        description: `Você está no recorte ${mission.groupName}. Restam postos para iluminar.`,
        icon: Zap,
        href: "/beta/missoes",
        label: "RETOMAR ROTA",
        tone: "accent"
      });
    }

    // 3. PROXIMIDADE: Postos Úteis Perto
    if (coords && stations.length > 0) {
      // Procurar postos sem preço recente a menos de 3km
      const nearbyGaps = stations
        .filter(s => {
          const distance = calculateDistance(coords.lat, coords.lng, s.lat, s.lng);
          const hasRecentPrice = s.latestReports && s.latestReports.length > 0 && (Date.now() - new Date(s.latestReports[0].reportedAt).getTime()) < 24 * 60 * 60 * 1000;
          return distance < 3 && !hasRecentPrice;
        })
        .sort((a, b) => {
          const distA = calculateDistance(coords.lat, coords.lng, a.lat, a.lng);
          const distB = calculateDistance(coords.lat, coords.lng, b.lat, b.lng);
          return distA - distB;
        });

      if (nearbyGaps.length > 0 && !mission) {
        const target = nearbyGaps[0];
        const dist = calculateDistance(coords.lat, coords.lng, target.lat, target.lng);
        actions.push({
          id: `nearby-${target.id}`,
          type: "PROXIMITY",
          title: "Posto Próximo sem Preço",
          description: `${getStationPublicName(target)} está a ${formatDistance(dist)} e precisa de atualização.`,
          icon: MapPin,
          href: `/enviar?stationId=${target.id}#photo`,
          label: "ABRIR CÂMERA",
          tone: "amber",
          metadata: { stationId: target.id }
        });
      }
    }

    // 4. IMPACTO: Feedback de Envios Auditados
    const recentlyApproved = submissions
      .filter(s => s.status === "approved" && (Date.now() - new Date(s.updatedAt).getTime()) < 48 * 60 * 60 * 1000)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    if (recentlyApproved.length > 0 && actions.length < 3) {
      const last = recentlyApproved[0];
      actions.push({
        id: "recent-approval",
        type: "IMPACT",
        title: "Envio Aprovado",
        description: `Seu preço no ${last.stationName || 'posto'} foi auditado e já está no mapa.`,
        icon: CheckCircle2,
        href: "/hub", // Podia ser histórico
        label: "VER MEU IMPACTO",
        tone: "emerald"
      });
    }

    // 5. EXPLORE: Fallback
    if (actions.length === 0) {
      actions.push({
        id: "explore-all",
        type: "EXPLORE",
        title: "Tudo em ordem por aqui",
        description: "Explore o mapa territorial para encontrar lacunas ou inicie uma nova missão.",
        icon: Navigation,
        href: "/",
        label: "VER MAPA VIVO",
        tone: "blue"
      });
    }

    return actions;
  }, [localQueue, mission, coords, stations, submissions]);

  const handleActionClick = (action: AgendaAction) => {
    void trackProductEvent({
      eventType: "hub_agenda_action_clicked",
      pagePath: "/hub",
      payload: { 
        actionId: action.id, 
        actionType: action.type,
        tone: action.tone
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="h-1 w-4 rounded-full bg-[color:var(--color-accent)]" />
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">O que fazer hoje</h2>
        </div>
        <Badge variant="outline" className="h-5 border-white/5 bg-white/5 text-[9px] font-bold text-white/30">
          Agenda Operacional
        </Badge>
      </div>

      <div className="grid gap-3">
        {agendaActions.map((action, index) => {
          const Icon = action.icon;
          const isPrimary = index === 0;

          return (
            <Link 
              key={action.id} 
              href={action.href as Route}
              onClick={() => handleActionClick(action)}
              className={cn(
                "group relative overflow-hidden rounded-[24px] border transition-all duration-200 active:scale-[0.98]",
                isPrimary 
                  ? "p-5 border-white/10 bg-white/5 shadow-xl shadow-black/20" 
                  : "p-4 border-white/5 bg-white/[0.02] opacity-80 hover:opacity-100"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "flex shrink-0 items-center justify-center rounded-[18px] transition-transform group-hover:scale-110",
                  isPrimary ? "h-12 w-12" : "h-10 w-10",
                  action.tone === "rose" && "bg-rose-500/20 text-rose-500",
                  action.tone === "accent" && "bg-[color:var(--color-accent)]/20 text-[color:var(--color-accent)]",
                  action.tone === "amber" && "bg-amber-500/20 text-amber-500",
                  action.tone === "emerald" && "bg-emerald-500/20 text-emerald-500",
                  action.tone === "blue" && "bg-blue-500/20 text-blue-500"
                )}>
                  <Icon className={isPrimary ? "h-6 w-6" : "h-5 w-5"} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={cn(
                      "font-bold text-white truncate",
                      isPrimary ? "text-base" : "text-sm"
                    )}>
                      {action.title}
                    </h3>
                    {isPrimary && (
                      <span className="flex h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)] animate-pulse" />
                    )}
                  </div>
                  <p className={cn(
                    "text-white/50 leading-tight mt-0.5",
                    isPrimary ? "text-sm" : "text-xs"
                  )}>
                    {action.description}
                  </p>

                  <div className="mt-4 flex items-center gap-2">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest",
                      action.tone === "rose" && "text-rose-400",
                      action.tone === "accent" && "text-[color:var(--color-accent)]",
                      action.tone === "amber" && "text-amber-400",
                      action.tone === "emerald" && "text-emerald-400",
                      action.tone === "blue" && "text-blue-400"
                    )}>
                      {action.label}
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
