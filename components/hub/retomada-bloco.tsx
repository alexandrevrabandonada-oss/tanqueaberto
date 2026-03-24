"use client";

import { SectionCard } from "@/components/ui/section-card";
import { PlayCircle, ArrowRight, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { trackProductEvent } from "@/lib/telemetry/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RetomadaBlocoProps {
  lastStationName?: string;
  lastUpdate?: string;
  type: "mission" | "pending" | "draft";
  count?: number;
  href: string;
}

export function RetomadaBloco({ lastStationName, lastUpdate, type, count, href }: RetomadaBlocoProps) {
  const handleTrack = () => {
    const eventType = type === "mission" ? "hub_mission_resumed" : "hub_pendency_resubmitted";
    void trackProductEvent({
      eventType: eventType as any,
      pagePath: "/hub",
      pageTitle: "Meu Hub",
      payload: { type, lastStationName }
    });
  };

  const getLabels = () => {
    switch (type) {
      case "mission":
        return {
          top: "Missão em Aberto",
          title: lastStationName || "Continuar Missão",
          cta: "Retomar agora",
          icon: PlayCircle,
          color: "var(--color-accent)",
          bg: "rgba(255, 199, 0, 0.1)"
        };
      case "pending":
        return {
          top: "Envio Pendente",
          title: count === 1 ? "1 preço aguardando" : `${count} preços aguardando`,
          cta: "Resolver agora",
          icon: AlertCircle,
          color: "rgb(244 63 94)",
          bg: "rgb(244 63 94 / 0.1)"
        };
      default:
        return {
          top: "Rascunho Salvo",
          title: lastStationName || "Continuar Envio",
          cta: "Terminar envio",
          icon: PlayCircle,
          color: "rgb(59 130 246)",
          bg: "rgb(59 130 246 / 0.1)"
        };
    }
  };

  const labels = getLabels();
  const Icon = labels.icon;

  return (
    <Link href={href as any} onClick={handleTrack}>
      <SectionCard 
        className="p-5 border-none relative overflow-hidden group active:scale-[0.98] transition-all"
        style={{ backgroundColor: labels.bg, borderLeft: `4px solid ${labels.color}` }}
      >
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div 
              className="p-3 rounded-2xl shadow-lg"
              style={{ backgroundColor: labels.color, color: labels.color === 'var(--color-accent)' ? 'black' : 'white' }}
            >
              <Icon className="w-6 h-6" />
            </div>
            
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: labels.color }}>
                  {labels.top}
                </span>
                {lastUpdate && (
                  <span className="text-[10px] text-white/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(lastUpdate), { addSuffix: true, locale: ptBR })}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-white/90">
                {labels.title}
              </h3>
              <p className="text-sm font-medium opacity-60 flex items-center gap-1.5" style={{ color: labels.color }}>
                {labels.cta}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </p>
            </div>
          </div>
        </div>

        {/* Decorative background element */}
        <div 
          className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity"
          style={{ color: labels.color }}
        >
          <Icon className="w-32 h-32 rotate-12" />
        </div>
      </SectionCard>
    </Link>
  );
}
