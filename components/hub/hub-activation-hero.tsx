"use client";

import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Zap, Target, Camera, Map, ArrowRight, ShieldCheck } from "lucide-react";
import { type Route } from "next";
import { cn } from "@/lib/utils";

interface HubActivationHeroProps {
  type: 'NEW_COLLECTOR' | 'INACTIVE_VETERAN' | 'EMPTY_QUEUE';
}

export function HubActivationHero({ type }: HubActivationHeroProps) {
  const configs = {
    NEW_COLLECTOR: {
      title: "Ilumine seu Primeiro Posto",
      description: "O Bomba Aberta é movido por registros reais. Seja o primeiro a trazer transparência para o seu bairro hoje.",
      badge: "Iniciante",
      icon: Zap,
      cta: "ABRIR MAPA AGORA",
      href: "/" as Route,
      color: "from-blue-600/20 to-indigo-600/20",
      border: "border-blue-500/20",
      textColor: "text-blue-400"
    },
    INACTIVE_VETERAN: {
      title: "Seu Território Precisa de Luz",
      description: "Faz tempo que não vemos seus registros. Há lacunas antigas no seu recorte esperando por validação.",
      badge: "Retomada",
      icon: Target,
      cta: "FECHAR LACUNAS",
      href: "/postos/sem-foto" as Route, // Exemplo de rota de lacunas
      color: "from-amber-600/20 to-orange-600/20",
      border: "border-amber-500/20",
      textColor: "text-amber-400"
    },
    EMPTY_QUEUE: {
      title: "Fila Limpa. Hora de Agir.",
      description: "Todos os seus envios foram processados. Que tal iniciar uma nova missão para expandir a cobertura?",
      badge: "Pronto",
      icon: ShieldCheck,
      cta: "INICIAR MISSÃO",
      href: "/beta/missoes" as Route,
      color: "from-emerald-600/20 to-teal-600/20",
      border: "border-emerald-500/20",
      textColor: "text-emerald-400"
    }
  };

  const config = configs[type];

  return (
    <SectionCard className={cn(
      "relative overflow-hidden p-8 border-2 transition-all hover:scale-[1.01] active:scale-[0.99]",
      config.color,
      config.border
    )}>
      {/* Background Decor */}
      <div className="absolute -right-8 -top-8 text-white/5 opacity-10">
        <config.icon className="w-48 h-48" />
      </div>

      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-[10px] uppercase tracking-widest px-3 border-current", config.textColor)}>
            {config.badge}
          </Badge>
          <div className="h-px flex-1 bg-current opacity-10" />
        </div>

        <div className="max-w-md space-y-3">
          <h2 className="text-3xl font-black tracking-tight uppercase italic leading-none text-white">
            {config.title}
          </h2>
          <p className="text-sm font-medium text-white/60 leading-relaxed">
            {config.description}
          </p>
        </div>

        <div className="pt-2">
          <ButtonLink 
            href={config.href}
            className={cn(
               "h-14 px-8 text-sm font-black uppercase tracking-widest shadow-xl",
               type === 'NEW_COLLECTOR' ? "bg-blue-500 text-white shadow-blue-500/20" :
               type === 'INACTIVE_VETERAN' ? "bg-amber-500 text-black shadow-amber-500/20" :
               "bg-emerald-500 text-black shadow-emerald-500/20"
            )}
          >
            {config.cta}
            <ArrowRight className="ml-2 w-4 h-4" />
          </ButtonLink>
        </div>
      </div>
    </SectionCard>
  );
}
