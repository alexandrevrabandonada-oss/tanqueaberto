"use client";

import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Zap, Target, ArrowRight, ShieldCheck } from "lucide-react";
import { type Route } from "next";
import { cn } from "@/lib/utils";

interface HubActivationHeroProps {
  type: 'NEW_COLLECTOR' | 'INACTIVE_VETERAN' | 'EMPTY_QUEUE';
  compact?: boolean;
}

export function HubActivationHero({ type, compact = false }: HubActivationHeroProps) {
  const configs = {
    NEW_COLLECTOR: {
      title: "Abrir o mapa primeiro",
      description: "Uma leitura, um gesto e um caminho claro para começar sem duplicar inten\u00e7\u00e3o.",
      badge: "Zero state",
      icon: Zap,
      cta: "Abrir mapa agora",
      href: "/" as Route,
      color: "from-blue-600/20 to-indigo-600/20",
      border: "border-blue-500/20",
      textColor: "text-blue-400"
    },
    INACTIVE_VETERAN: {
      title: "Seu territ\u00f3rio pede continuidade",
      description: "Volte para os pontos que ficaram sem valida\u00e7\u00e3o e retome o fluxo real.",
      badge: "Retomada",
      icon: Target,
      cta: "Fechar lacunas",
      href: "/postos/sem-atualizacao" as Route,
      color: "from-amber-600/20 to-orange-600/20",
      border: "border-amber-500/20",
      textColor: "text-amber-400"
    },
    EMPTY_QUEUE: {
      title: "Fila limpa, pr\u00f3ximo passo claro",
      description: "Quando nada est\u00e1 pendente, a continuidade segue pela miss\u00e3o ou pelo mapa.",
      badge: "Pronto",
      icon: ShieldCheck,
      cta: "Iniciar miss\u00e3o",
      href: "/beta/missoes" as Route,
      color: "from-emerald-600/20 to-teal-600/20",
      border: "border-emerald-500/20",
      textColor: "text-emerald-400"
    }
  };

  const config = configs[type];

  return (
    <SectionCard className={cn(
      "relative overflow-hidden transition-all",
      compact ? "space-y-4 p-5 border border-white/10 bg-black/30 rounded-[26px]" : "space-y-6 p-8 lg:p-10 border-2 rounded-3xl",
      config.color,
      config.border
    )}>
      <div className={cn("absolute -right-8 -top-8 text-white/5 opacity-10 lg:opacity-20 lg:-right-4 lg:-top-4", compact && "hidden sm:block") }>
        <config.icon className="h-48 w-48 lg:h-64 lg:w-64" />
      </div>

      <div className={cn("relative z-10", compact ? "space-y-4" : "space-y-6 lg:flex lg:items-center lg:justify-between lg:space-y-0 lg:gap-8")}>
        <div className={cn("space-y-4", compact ? "" : "lg:max-w-xl lg:space-y-6")}>
          <div className={cn("flex items-center gap-2", compact && "hidden sm:flex")}>
            <Badge variant="outline" className={cn("text-[10px] uppercase tracking-widest px-3 border-current", config.textColor)}>
              {config.badge}
            </Badge>
            <div className="h-px flex-1 bg-current opacity-10 lg:hidden" />
          </div>

          <div className="space-y-2 sm:space-y-3">
            <h2 className={cn("font-black tracking-tight uppercase italic leading-none text-white", compact ? "text-[1.7rem]" : "text-3xl lg:text-4xl")}>
              {config.title}
            </h2>
            <p className={cn("font-medium text-white/60 leading-relaxed", compact ? "text-sm" : "text-sm lg:max-w-md lg:text-base")}>
              {config.description}
            </p>
          </div>
        </div>

        <div className={cn("pt-1 lg:pt-0 lg:shrink-0", compact && "pt-0") }>
          <ButtonLink 
            href={config.href}
            className={cn(
              "h-12 px-6 text-sm font-black uppercase tracking-widest shadow-xl sm:h-14 sm:px-8 lg:h-16 lg:px-10",
              compact && "w-full sm:w-auto",
              type === 'NEW_COLLECTOR' ? "bg-blue-500 text-white shadow-blue-500/20" :
              type === 'INACTIVE_VETERAN' ? "bg-amber-500 text-black shadow-amber-500/20" :
              "bg-emerald-500 text-black shadow-emerald-500/20"
            )}
          >
            {config.cta}
            <ArrowRight className="ml-2 h-4 w-4" />
          </ButtonLink>
        </div>
      </div>
    </SectionCard>
  );
}
