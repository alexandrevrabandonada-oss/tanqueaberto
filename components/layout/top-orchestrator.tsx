"use client";

import React, { useEffect, useRef } from "react";
import { DatabaseZap, MapPin, Navigation, Search, SignalHigh, SignalLow, Sparkles, X } from "lucide-react";

import { DensitySelector } from "@/components/ui/density-selector";
import { cn } from "@/lib/utils";
import { trackProductEvent } from "@/lib/telemetry/client";

type DensityMode = "ultra-claro" | "normal" | "avancado";

export const TOP_BUDGETS = {
  expanded: {
    maxHeight: "140px",
    maxHeightWide: "128px"
  },
  sticky: {
    maxHeight: "92px",
    maxHeightWide: "84px"
  },
  micro: {
    maxHeight: "64px",
    maxHeightWide: "58px"
  }
} as const;

interface TopOrchestratorProps {
  isWarm: boolean;
  isRefreshing: boolean;
  isLowPerf: boolean;
  effectiveType?: string;
  coords: { lat: number; lng: number } | null;
  geoLoading: boolean;
  onGetLocation: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  selectedCity: string;
  onCityReset: () => void;
  cityOptions: { priority: string[]; others: string[] };
  onCitySelect: (city: string) => void;
  densityMode: DensityMode;
  onDensityChange: (mode: DensityMode) => void;
  isSticky: boolean;
  isMicro?: boolean;
  isMissionActive?: boolean;
  className?: string;
}

function getSystemState({
  coords,
  geoLoading,
  isWarm,
  isRefreshing
}: Pick<TopOrchestratorProps, "coords" | "geoLoading" | "isWarm" | "isRefreshing">) {
  if (geoLoading) {
    return { label: "GPS", detail: "Lendo", tone: "muted" as const, icon: Navigation };
  }

  if (coords && isRefreshing) {
    return { label: "GPS ativo", detail: "Snapshot", tone: "good" as const, icon: Navigation };
  }

  if (coords) {
    return { label: "GPS ativo", detail: "Território", tone: "good" as const, icon: Navigation };
  }

  if (isRefreshing) {
    return { label: "Snapshot offline", detail: "Cache quente", tone: "info" as const, icon: DatabaseZap };
  }

  if (isWarm) {
    return { label: "Snapshot offline", detail: "Cache pronto", tone: "info" as const, icon: DatabaseZap };
  }

  return { label: "Sistema", detail: "Leitura padrão", tone: "muted" as const, icon: SignalHigh };
}

function CompactChip({
  icon: Icon,
  label,
  detail,
  tone,
  onClick,
  isCompact
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail?: string;
  tone: "good" | "info" | "muted" | "danger";
  onClick?: () => void;
  isCompact: boolean;
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : tone === "info"
        ? "border-[color:var(--color-accent)]/18 bg-[color:var(--color-accent)]/8 text-[color:var(--color-accent)]"
        : tone === "danger"
          ? "border-orange-500/20 bg-orange-500/10 text-orange-300"
          : "border-white/10 bg-white/5 text-white/72";

  const content = (
    <>
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border transition-all",
          tone === "good"
            ? "border-emerald-500/20 bg-emerald-500/20 text-emerald-300"
            : tone === "info"
              ? "border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/15 text-[color:var(--color-accent)]"
              : tone === "danger"
                ? "border-orange-500/20 bg-orange-500/20 text-orange-300"
                : "border-white/10 bg-white/5 text-white/55"
        )}
      >
        <Icon className="h-3 w-3" />
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span className={cn("text-[9px] font-black uppercase tracking-[0.16em] text-current", isCompact && "tracking-[0.14em]")}>{label}</span>
        {!isCompact && detail ? <span className="mt-1 text-[8px] font-medium uppercase tracking-[0.14em] text-white/42">{detail}</span> : null}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex min-h-8 items-center gap-2 rounded-full border px-2.5 py-1.5 text-left transition-all",
          toneClass,
          isCompact && "px-2 py-1"
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn("inline-flex min-h-8 items-center gap-2 rounded-full border px-2.5 py-1.5", toneClass, isCompact && "px-2 py-1")}>{content}</div>
  );
}

export function TopOrchestrator({
  isWarm,
  isRefreshing,
  isLowPerf,
  effectiveType,
  coords,
  geoLoading,
  onGetLocation,
  query,
  onQueryChange,
  selectedCity,
  onCityReset,
  cityOptions,
  onCitySelect,
  densityMode,
  onDensityChange,
  isSticky,
  isMicro = false,
  isMissionActive = false,
  className
}: TopOrchestratorProps) {
  const stickySinceRef = useRef<number | null>(null);
  const compactMode = isSticky || isMicro;
  const budget = isMicro ? TOP_BUDGETS.micro : isSticky ? TOP_BUDGETS.sticky : TOP_BUDGETS.expanded;
  const system = getSystemState({ coords, geoLoading, isWarm, isRefreshing });
  const SystemIcon = system.icon;

  useEffect(() => {
    if (!isSticky) {
      if (stickySinceRef.current) {
        const dwell = Date.now() - stickySinceRef.current;
        void trackProductEvent({
          eventType: "top_sticky_exit" as any,
          pagePath: window.location.pathname,
          payload: { dwellMs: dwell, micro: isMicro, mission: isMissionActive }
        });
        stickySinceRef.current = null;
      }
      return;
    }

    if (!stickySinceRef.current) {
      stickySinceRef.current = Date.now();
      void trackProductEvent({
        eventType: "top_sticky_enter" as any,
        pagePath: window.location.pathname,
        payload: { micro: isMicro, mission: isMissionActive }
      });
    }
  }, [isSticky, isMicro, isMissionActive]);

  const topClassName = cn(
    "flex flex-col gap-1.5 transition-all duration-300 will-change-transform",
    isSticky && "sticky top-0 z-[110] -mx-4 rounded-b-[20px] border-b border-white/10 bg-black/86 px-4 py-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.42)] backdrop-blur-xl lg:gap-1 lg:px-4 lg:py-1",
    isSticky && isMissionActive && "top-10 lg:top-8",
    isMicro && "gap-1 bg-black/72 px-3 py-1 shadow-none lg:px-3 lg:py-0.5",
    className
  );

  const showSupplementaryRow = !compactMode;
  const priorityCities = cityOptions.priority.slice(0, compactMode ? 3 : 5);

  return (
    <div data-top-orchestrator="root" data-top-budget-mode={isMicro ? "micro" : isSticky ? "sticky" : "expanded"} data-top-budget-max-height={budget.maxHeight} data-top-budget-max-height-wide={budget.maxHeightWide} className={topClassName}>
      <div className={cn("space-y-1.5", compactMode && "space-y-1") }>
        <label
          className={cn(
            "group flex min-h-10 items-center gap-2 rounded-2xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/52 transition-all focus-within:border-[color:var(--color-accent)]/50 lg:min-h-9",
            compactMode && "min-h-9 bg-black/24 px-2.5 py-1.5"
          )}
        >
          <Search className={cn("h-4 w-4 shrink-0 text-[color:var(--color-accent)] transition-all", compactMode && "h-3.5 w-3.5") } />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => {
              void trackProductEvent({
                eventType: "top_search_focused" as any,
                pagePath: window.location.pathname,
                payload: { sticky: isSticky, micro: isMicro }
              });
            }}
            placeholder={isMicro ? "Buscar..." : "Buscar posto, bairro ou cidade..."}
            className={cn("w-full bg-transparent text-xs text-white outline-none placeholder:text-white/30", compactMode && "text-[11px]")}
          />
          {query ? (
            <button onClick={() => onQueryChange("")} className="text-white/30 transition hover:text-white" type="button">
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </label>

        <div className={cn("flex flex-wrap items-center gap-1.5", compactMode && "gap-1") }>
          {selectedCity ? (
            <CompactChip
              icon={MapPin}
              label={selectedCity}
              detail="Território"
              tone="good"
              onClick={onCityReset}
              isCompact={compactMode}
            />
          ) : (
            <CompactChip
              icon={MapPin}
              label="Brasil"
              detail="Visão geral"
              tone="muted"
              onClick={onCityReset}
              isCompact={compactMode}
            />
          )}

          <CompactChip
            icon={SystemIcon}
            label={system.label}
            detail={system.detail}
            tone={system.tone}
            onClick={onGetLocation}
            isCompact={compactMode}
          />

          {isMissionActive ? (
            <CompactChip
              icon={Sparkles}
              label="Missão"
              detail="Ativa"
              tone="info"
              isCompact={compactMode}
            />
          ) : null}

          {isLowPerf ? (
            <CompactChip
              icon={SignalLow}
              label={`Eco ${effectiveType ?? "rede"}`}
              detail="Baixo consumo"
              tone="danger"
              isCompact={compactMode}
            />
          ) : null}
        </div>

        {showSupplementaryRow ? (
          <div className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-black/18 px-3 py-2.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {priorityCities.map((city) => (
                <button
                  key={city}
                  onClick={() => onCitySelect(city)}
                  type="button"
                  className={cn(
                    "shrink-0 rounded-full border whitespace-nowrap px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] transition-all",
                    selectedCity.toUpperCase() === city.toUpperCase() ? "border-white bg-white text-black" : "border-white/10 bg-white/5 text-white/58 hover:bg-white/10"
                  )}
                >
                  {city}
                </button>
              ))}
            </div>

            <DensitySelector
              mode={densityMode}
              onChange={onDensityChange}
              className="w-auto"
              isCompact={compactMode}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

