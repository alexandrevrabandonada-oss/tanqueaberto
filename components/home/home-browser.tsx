"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Camera, Clock3, Info, Navigation, Search, SlidersHorizontal, Star, X, Zap, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { StationMapShell } from "@/components/map/station-map-shell";
import { FirstVisitGuide } from "@/components/onboarding/first-visit-guide";
import { StationCard } from "@/components/station/station-card";
import { Badge } from "@/components/ui/badge";
import { GroupStatusBadge } from "@/components/ui/group-status-badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { ReadinessBadge } from "./readiness-badge";
import { EmptyStateCard } from "@/components/state/empty-state-card";
import { useGeolocation } from "@/hooks/use-geolocation";
import { calculateDistance, formatDistance } from "@/lib/geo/distance";
import { cn } from "@/lib/utils";
import { trackProductEvent } from "@/lib/telemetry/client";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatDateTimeBR } from "@/lib/format/time";
import { formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { fuelLabels, publicFuelFilters, recencyFilters } from "@/lib/format/labels";
import { filterReports, filterStations, getSelectedStationReport, hasRecentStationPriceForFilter, type StationPresenceFilter } from "@/lib/filters/public";
import { sortStationsForPublicView } from "@/lib/filters/sort";
import { canShowStationOnMap, getStationPublicName, hasPendingStationLocationReview } from "@/lib/quality/stations";
import { persistHomeContext, priorityCities, readHomeContext, readLastStationContext, rememberStationVisit } from "@/lib/navigation/home-context";
import { startRoute, readRouteContext } from "@/lib/navigation/route-context";
import { RouteAssistant } from "@/components/routes/route-assistant";
import { getNavigationHandoff, clearNavigationHandoff, type ExternalNavigationOptions } from "@/lib/navigation/external-maps";
import { useStreetMode } from "@/hooks/use-street-mode";
import { useNetworkHardening } from "@/hooks/use-network-hardening";
import { useMissionContext } from "@/components/mission/mission-context";
import { MySubmissionsList } from "@/components/history/my-submissions-list";
import { RecorteActivityWidget } from "@/components/home/recorte-activity-widget";
import { type EffectiveGroupStatus } from "@/lib/ops/release-control";
import { getSmartDefaultRecorte, getSmartDefaultPhrase, type SmartDefaultReason } from "@/lib/ops/smart-default";
import { FeedbackTrigger } from "@/components/feedback/feedback-trigger";
import type { FuelFilter, RecencyFilter } from "@/lib/filters/public";
import { type ReportWithStation, StationWithReports } from "@/lib/types";
import { SurfaceOrchestrator } from "@/components/layout/surface-orchestrator";
import { type SurfaceType } from "@/lib/ui/surface-orchestrator";
import { InstallPromptCard } from "./install-prompt-card";
import { useOperationalFocus } from "@/hooks/use-operational-focus";
import { useRetentionSurfaces } from "@/components/layout/retention-hub";
import { useMySubmissions } from "@/hooks/use-my-submissions";
import { type OperationalKillSwitches } from "@/lib/ops/kill-switches";
import { RecortePulseWidget } from "./recorte-pulse-widget";
import { getRecortePulseAction } from "@/app/actions/pulse";
import { type RecorteActivity } from "@/lib/ops/recorte-activity";
import { getUtilityStatusAction } from "@/app/actions/user";
import { type UtilityRole } from "@/lib/ops/collector-trust";
import { QuickActionGroup, QuickActionButton } from "@/components/ui/quick-action";

interface HomeBrowserProps {
  stations: StationWithReports[];
  feed: ReportWithStation[];
  recentCount: number;
  territorialSummary: EffectiveGroupStatus[];
  betaClosed?: boolean;
  initialQuery?: string;
  initialCity?: string;
  initialGroupId?: string;
  initialGroupStationIds?: string[];
  initialFuelFilter?: FuelFilter;
  initialRecencyFilter?: RecencyFilter;
  initialPresenceFilter?: StationPresenceFilter;
  killSwitches?: Partial<OperationalKillSwitches>;
}

function buildContextHref(query: string, city: string, fuelFilter: FuelFilter, recencyFilter: RecencyFilter, presenceFilter: StationPresenceFilter) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (city) params.set("city", city);
  if (fuelFilter !== "all") params.set("fuel", fuelFilter);
  if (recencyFilter !== "all") params.set("recency", recencyFilter);
  if (presenceFilter !== "all") params.set("presence", presenceFilter);
  const suffix = params.toString();
  return suffix ? `/?${suffix}` : "/";
}

function getStationHref(stationId: string, returnToHref?: string) {
  return returnToHref ? (`/postos/${stationId}?returnTo=${encodeURIComponent(returnToHref)}` as Route) : (`/postos/${stationId}` as Route);
}

function getSendHref(stationId: string, returnToHref?: string, fuelFilter?: FuelFilter) {
  const fuelParam = fuelFilter && fuelFilter !== "all" ? `&fuel=${fuelFilter}` : "";
  const base = `/enviar?stationId=${stationId}${fuelParam}#photo`;
  return returnToHref ? (`${base}&returnTo=${encodeURIComponent(returnToHref)}` as Route) : (base as Route);
}

function FilterSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-2 rounded-[22px] border border-white/8 bg-black/30 px-4 py-3 text-sm text-white/58">
      <span className="block text-xs uppercase tracking-[0.18em] text-white/42">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-[16px] border border-white/8 bg-black/45 px-3 py-3 pr-10 text-sm text-white outline-none transition focus:border-[color:var(--color-accent)]"
        >
          {options.map((item) => (
            <option key={item.value} value={item.value} className="bg-zinc-900 text-white">
              {item.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/40">▾</span>
      </div>
    </label>
  );
}

export function HomeBrowser({
  stations,
  feed,
  recentCount,
  territorialSummary,
  betaClosed = false,
  initialQuery = "",
  initialCity = "",
  initialGroupId,
  initialGroupStationIds,
  initialFuelFilter = "all",
  initialRecencyFilter = "all",
  initialPresenceFilter = "all",
  killSwitches
}: HomeBrowserProps) {
  const [showShareWelcome, setShowShareWelcome] = useState(false);
  const [shareContext, setShareContext] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState(initialCity || "");
  const [defaultSelectionReason, setDefaultSelectionReason] = useState<string | null>(null);
  const defaultApplied = useRef(false);
  const [fuelFilter, setFuelFilter] = useState<FuelFilter>(initialFuelFilter);
  const [recencyFilter, setRecencyFilter] = useState<RecencyFilter>(initialRecencyFilter);
  const [presenceFilter, setPresenceFilter] = useState<StationPresenceFilter>(initialPresenceFilter);
  const [lastStation, setLastStation] = useState<ReturnType<typeof readLastStationContext>>(() => null);
  const [isHydrated, setIsHydrated] = useState(false);
  const lastTrackedSearchRef = useRef(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const { coords, loading: geoLoading, error: geoError, getLocation } = useGeolocation();
  const { isLowPerf, effectiveType } = useNetworkHardening();
  const { isStreetMode, toggleStreetMode, recentIds, favoriteIds, toggleFavorite, isFavorite } = useStreetMode();
  const { mission, startMission, isLoaded: missionLoaded } = useMissionContext();
  const { reporterNickname } = useMySubmissions();
  const { focus, updateTownFocus } = useOperationalFocus();
  const retentionSurfaces = useRetentionSurfaces();
  const [navHandoff, setNavHandoff] = useState<any>(null);
  const [role, setRole] = useState<UtilityRole | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    async function loadRole() {
      const result = await getUtilityStatusAction(reporterNickname, null);
      if (result) setRole(result.status.role);
    }
    loadRole();
  }, [reporterNickname]);

  useEffect(() => {
    const checkHandoff = () => {
      const data = getNavigationHandoff();
      if (data) {
        setNavHandoff(data);
      }
    };

    // Check on mount
    checkHandoff();

    // Check on return
    window.addEventListener("focus", checkHandoff);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkHandoff();
    });

    return () => {
      window.removeEventListener("focus", checkHandoff);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref === "city_page" && initialCity) {
      void trackProductEvent({
        eventType: "territorial_entry_from_landing" as any,
        pagePath: "/",
        pageTitle: "Mapa vivo",
        scopeType: "city",
        scopeId: initialCity,
        payload: { city: initialCity, source: "city_page" }
      });
    }
    void trackProductEvent({ eventType: "home_opened", pagePath: "/", pageTitle: "Mapa vivo", scopeType: "page", scopeId: "/", payload: { streetMode: isStreetMode } });
  }, [isStreetMode, initialCity]);

  // Auto-start mission from deep link
  useEffect(() => {
    if (missionLoaded && initialGroupId && initialGroupStationIds && initialGroupStationIds.length > 0 && !mission) {
      const groupInfo = territorialSummary.find(g => g.id === initialGroupId);
      if (groupInfo) {
        startMission(initialGroupId, groupInfo.name, initialGroupStationIds);
        
        void trackProductEvent({
          eventType: "mission_start_from_group" as any,
          pagePath: "/",
          pageTitle: "Mapa vivo",
          scopeType: "group",
          scopeId: initialGroupId,
          payload: { 
            groupName: groupInfo.name,
            stationsCount: initialGroupStationIds.length,
            defaultReason: defaultSelectionReason
          }
        });
      }
    }
  }, [missionLoaded, initialGroupId, initialGroupStationIds, mission, territorialSummary, startMission]);

  useEffect(() => {
    if (!missionLoaded) return; // Wait for mission to load from storage
    if (defaultApplied.current) return; // Only apply once on mount

    const storedContext = readHomeContext();
    const storedLastStation = readLastStationContext();
    
    // Determine the smart default if no city is in URL
    if (!initialCity) {
      const smartResult = getSmartDefaultRecorte(
        territorialSummary,
        storedContext.city || null,
        mission,
        coords,
        stations
      );

      if (smartResult.city && smartResult.reason !== "fallback") {
        setSelectedCity(smartResult.city);
        setDefaultSelectionReason(getSmartDefaultPhrase(smartResult));
        
        void trackProductEvent({
          eventType: "territorial_default_applied" as any,
          pagePath: "/",
          pageTitle: "Mapa vivo",
          city: smartResult.city,
          payload: {
            reason: smartResult.reason,
            status: smartResult.status
          }
        });
      } else if (storedContext.city) {
         setSelectedCity(storedContext.city);
      }
    } else {
      setSelectedCity(initialCity);
    }

    if (!initialQuery && storedContext.query) {
      setQuery(storedContext.query);
    }

    if (initialFuelFilter === "all" && storedContext.fuelFilter && storedContext.fuelFilter !== "all") {
      setFuelFilter(storedContext.fuelFilter);
    }

    if (initialRecencyFilter === "all" && storedContext.recencyFilter && storedContext.recencyFilter !== "all") {
      setRecencyFilter(storedContext.recencyFilter);
    }

    if (initialPresenceFilter === "all" && storedContext.presenceFilter && storedContext.presenceFilter !== "all") {
      setPresenceFilter(storedContext.presenceFilter);
    }

    if (storedContext.isStreetMode !== undefined && storedContext.isStreetMode !== isStreetMode) {
      if (storedContext.isStreetMode) toggleStreetMode();
    }

    if (storedLastStation) {
      setLastStation(storedLastStation);
    }

    defaultApplied.current = true;
    setIsHydrated(true);
  }, [initialCity, initialFuelFilter, initialPresenceFilter, initialQuery, initialRecencyFilter, territorialSummary, mission, missionLoaded, coords, stations]);

  const selectedReadiness = useMemo(() => {
    if (!selectedCity || !Array.isArray(territorialSummary)) return null;
    return territorialSummary.find(group => 
      group.name?.trim().toUpperCase() === selectedCity.trim().toUpperCase() || 
      (group as any).city?.trim().toUpperCase() === selectedCity.trim().toUpperCase()
    );
  }, [selectedCity, territorialSummary]);

  const expansionSignal = useMemo(() => {
    if (!selectedReadiness) return null;
    const opsState = (selectedReadiness as any).operationalState;
    switch (opsState) {
      case "beta_open": return { text: "Recorte forte e validado.", icon: "✨" };
      case "monitoring": return { text: "Monitoramento intensivo ativo.", icon: "🔍" };
      case "rollback": return { text: "Recorte em manutenção operacional.", icon: "🛠️" };
      case "limited_test": return { text: "Sua contribuição é especialmente útil aqui.", icon: "🧱" };
      case "closed": return { text: "Recorte em fase preliminar.", icon: "🌑" };
      default: {
        // Fallback for groups without opsState yet
        switch (selectedReadiness.status) {
          case "ready": return { text: "Este recorte já está forte.", icon: "✨" };
          case "validating": return { text: "Recorte em validação técnica.", icon: "🧪" };
          case "limited": return { text: "Sua contribuição é útil aqui.", icon: "🧱" };
          default: return null;
        }
      }
    }
  }, [selectedReadiness]);

  const cityOptions = useMemo(() => {
    if (!Array.isArray(stations)) return { priority: [], others: [], allCities: [] };
    const allCities = Array.from(new Set(stations.map((station) => station.city).filter(Boolean))).sort((left, right) => left.localeCompare(right, "pt-BR"));
    const priority = priorityCities.filter((city) => allCities.some((item) => item.localeCompare(city, "pt-BR") === 0));
    const others = allCities.filter((city) => !priority.some((item) => item.localeCompare(city, "pt-BR") === 0));
    return { priority, others, allCities };
  }, [stations]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    persistHomeContext({ query, city: selectedCity, fuelFilter, recencyFilter, presenceFilter, isStreetMode });
    
    if (selectedCity && isHydrated) {
      void trackProductEvent({
        eventType: "territorial_recorte_selected" as any,
        pagePath: "/",
        pageTitle: "Mapa vivo",
        city: selectedCity,
        payload: {
          status: selectedReadiness?.status || "unknown",
          score: selectedReadiness?.score || 0
        }
      });
    }
  }, [fuelFilter, isHydrated, presenceFilter, query, recencyFilter, selectedCity, selectedReadiness]);

  const stationsWithDistances = useMemo(() => {
    if (!coords) return stations;
    return stations.map(station => ({
      ...station,
      distance: calculateDistance(coords.lat, coords.lng, station.lat, station.lng)
    }));
  }, [stations, coords]);

  const [pulseData, setPulseData] = useState<RecorteActivity | null>(null);

  useEffect(() => {
    if (initialCity) {
      const fetchPulse = async () => {
        const data = await getRecortePulseAction(initialCity);
        setPulseData(data);
        
        if (data) {
          void trackProductEvent({
            eventType: "recorte_pulse_opened" as any,
            pagePath: "/",
            pageTitle: "Home",
            payload: { 
              city: initialCity,
              isLive: data.lastActivityAt && (Date.now() - new Date(data.lastActivityAt).getTime()) < 60 * 60 * 1000,
              coverage: data.collaborationProgress
            }
          });
        }
      };
      fetchPulse();
    } else {
      setPulseData(null);
    }
  }, [initialCity]);

  const filteredStations = useMemo(
    () => filterStations(stationsWithDistances, deferredQuery, selectedCity, fuelFilter, recencyFilter, presenceFilter),
    [deferredQuery, fuelFilter, presenceFilter, recencyFilter, selectedCity, stationsWithDistances]
  );
  const filteredFeed = useMemo(
    () => filterReports(feed, deferredQuery, selectedCity, fuelFilter, recencyFilter),
    [deferredQuery, feed, fuelFilter, recencyFilter, selectedCity]
  );
  const orderedStations = useMemo(() => {
    let result = [...filteredStations];

    // Sort: Priority 1: Distance (if available), Priority 2: Release Status, Priority 3: Score
    return result.sort((a, b) => {
      // If coordinates are active, proximity is the main driver
      if (coords && a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }

      const statusOrder: Record<string, number> = { 
        beta_open: 0, monitoring: 1, ready: 2, validating: 3, 
        limited_test: 4, rollback: 5, limited: 6, closed: 7, hidden: 8 
      };
      
      const opsA = (a as any).operationalState;
      const opsB = (b as any).operationalState;
      
      const orderA = statusOrder[opsA || a.releaseStatus || "limited"] ?? 99;
      const orderB = statusOrder[opsB || b.releaseStatus || "limited"] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      
      return (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
    });
  }, [filteredStations, coords]);
  const visibleStations = useMemo(() => orderedStations.filter((station) => canShowStationOnMap(station)), [orderedStations]);
  const stationsWithRecentPrice = useMemo(
    () => visibleStations.filter((station) => hasRecentStationPriceForFilter(station, fuelFilter)),
    [fuelFilter, visibleStations]
  );
  const stationsWithoutRecentPrice = visibleStations.length - stationsWithRecentPrice.length;
  const reviewStations = useMemo(() => orderedStations.filter((station) => hasPendingStationLocationReview(station)), [orderedStations]);
  const noRecentStations = useMemo(
    () => orderedStations.filter((station) => !hasRecentStationPriceForFilter(station, fuelFilter)).slice(0, 4),
    [fuelFilter, orderedStations]
  );
  const contextHref = useMemo(() => buildContextHref(query, selectedCity, fuelFilter, recencyFilter, presenceFilter), [fuelFilter, presenceFilter, query, recencyFilter, selectedCity]);

  const cheapestNow = useMemo(() => {
    return orderedStations
      .map((station) => {
        const report = getSelectedStationReport(station, fuelFilter);
        return report ? { station, report } : null;
      })
      .filter((item): item is { station: StationWithReports; report: NonNullable<ReturnType<typeof getSelectedStationReport>> } => Boolean(item))
      .sort((left, right) => left.report.price - right.report.price)
      .slice(0, 3);
  }, [fuelFilter, orderedStations]);

  const hasFilters = Boolean(query || selectedCity || fuelFilter !== "all" || recencyFilter !== "all" || presenceFilter !== "all");
  const mapStations = visibleStations;
  const summaryStations = orderedStations.slice(0, 6);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && ref.startsWith("share_")) {
      const type = ref.replace("share_", "");
      const contextName = searchParams.get("city") || searchParams.get("groupId") || "um amigo";
      
      setShareContext(contextName);
      setShowShareWelcome(true);
      
      void trackProductEvent({
        eventType: "share_link_opened" as any,
        pagePath: "/",
        scopeType: "share" as any,
        payload: { type, contextName }
      });
    }
  }, [searchParams]);

  const resetFilters = () => {
    setQuery("");
    setSelectedCity("");
    setFuelFilter("all");
    setRecencyFilter("all");
    setPresenceFilter("all");
  };

  // 1. Gather all potential surfaces for orchestration
  const surfaces: Array<{ id: string; type: SurfaceType; content: React.ReactNode; isDismissible?: boolean }> = [];

  // Add retention surfaces first
  retentionSurfaces.forEach(s => surfaces.push(s));

  if (isLowPerf) {
    surfaces.push({
      id: "low-perf",
      type: "CRITICAL_ALERT" as SurfaceType,
      content: (
        <div className="flex items-center gap-3 rounded-[22px] border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-orange-400">
          <Zap className="h-3.5 w-3.5" />
          Conexão instável ({effectiveType}). Modo econômico ativo.
        </div>
      )
    });
  }

  if (navHandoff) {
    surfaces.push({
      id: "nav-handoff",
      type: "CONTEXT_HANDOFF" as SurfaceType,
      content: (
        <div className="flex flex-col gap-3 rounded-[24px] border border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/10 p-4 shadow-xl backdrop-blur-md">
           <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                 <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-accent)]/20">
                    <Navigation className="h-4 w-4 text-[color:var(--color-accent)]" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-accent)]">De volta ao app</p>
                    <p className="text-sm font-bold text-white leading-tight">Chegou ao {navHandoff.stationName}?</p>
                 </div>
              </div>
              <button 
                onClick={() => {
                  setNavHandoff(null);
                  clearNavigationHandoff();
                }}
                className="text-white/20 hover:text-white"
              >
                 <X className="h-5 w-5" />
              </button>
           </div>
           
           <div className="flex gap-2">
              <ButtonLink
                href={(`/enviar?stationId=${navHandoff.stationId}#photo` as Route)}
                onClick={() => {
                  void trackProductEvent({
                    eventType: "return_after_navigation",
                    pagePath: "/",
                    pageTitle: "Home",
                    stationId: navHandoff.stationId,
                    payload: { action: "open_camera", source: navHandoff.source }
                  });
                  setNavHandoff(null);
                  clearNavigationHandoff();
                }}
                className="flex-1 h-12 text-xs font-black bg-[color:var(--color-accent)] text-black"
              >
                 <Camera className="h-4 w-4" />
                 ABRIR CÂMERA AGORA
              </ButtonLink>
           </div>
        </div>
      )
    });
  }

  if (betaClosed) {
    surfaces.push({
      id: "beta-closed",
      type: "INFO_NOTICE" as SurfaceType,
      content: (
        <SectionCard className="space-y-3 border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/8">
          <Badge variant="warning">Beta fechado</Badge>
          <h2 className="text-[1.45rem] font-semibold leading-tight text-white">Convite controlado, cobertura em expansão.</h2>
          <p className="text-sm text-white/58">A base real já está no ar. Se algo estiver confuso, use o feedback.</p>
        </SectionCard>
      ),
      isDismissible: true
    });
  }

  surfaces.push({
    id: "pwa-install",
    type: "ACTION_PROMPT" as SurfaceType,
    content: <InstallPromptCard />
  });

  // 2. Adaptive Filtering and Sorting of Surfaces
  const orchestratedSurfaces = useMemo(() => {
    let result = [...surfaces];
    
    // If it's a NEW user, prioritize Onboarding (handled by FirstVisitGuide) 
    // and keep surfaces light.
    if (role === 'iniciante') {
      // Remove less urgent prompts for beginners to avoid noise
      result = result.filter(s => s.id !== 'pwa-install' && s.id !== 'beta-closed');
    }

    // If Senior, prioritize Pulse and Gaps (handled by layout below)
    
    return result;
  }, [surfaces, role]);

  if (defaultSelectionReason) {
    surfaces.push({
      id: "smart-default",
      type: "INFO_NOTICE" as SurfaceType,
      content: (
        <div className="mx-1 -mt-2 mb-2 flex items-center justify-between rounded-full bg-emerald-500/10 px-4 py-2 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <div className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              {defaultSelectionReason}
            </span>
          </div>
          <button 
            onClick={() => setDefaultSelectionReason(null)}
            className="text-[10px] font-bold text-emerald-400/50 hover:text-emerald-400"
          >
            TROCAR
          </button>
        </div>
      )
    });
  }

  return (
    <>
      <FirstVisitGuide />
      
      <div className="mb-6">
        <SurfaceOrchestrator 
           surfaces={orchestratedSurfaces} 
           onDismiss={(id) => {
             if (id === "beta-closed") { /* potential local storage toggle */ }
           }}
        />
      </div>

      <div className="mb-4">
        <RouteAssistant stations={stations} />
      </div>

      <div className="mb-6">
        <Button 
          variant={isStreetMode ? "primary" : "secondary"}
          onClick={toggleStreetMode}
          className="w-full h-14 rounded-[22px] text-xs font-bold uppercase tracking-widest shadow-lg border-2 border-white/5"
        >
          {isStreetMode ? "MODO RUA ATIVO" : "🚀 MODO RUA (MAIS RÁPIDO)"}
        </Button>
      </div>

      {/* 4. Home Main Action & Quick Access (Adaptive) */}
      {!mission && (recentIds.length > 0 || favoriteIds.length > 0) && (
        <SectionCard 
          className="mb-4 space-y-4 p-5 border-white/10 bg-white/5"
          onClick={() => {
            void trackProductEvent({
              eventType: "home_block_interacted",
              pagePath: "/",
              scopeType: "block",
              scopeId: "quick_access",
              payload: { role: role || 'unknown' }
            });
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3 text-[color:var(--color-accent)]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">Acesso Rápido</p>
            </div>
            <Badge variant="outline" className="h-5 px-2 text-[9px] border-white/10 text-white/30 font-black uppercase tracking-tighter">Polegar amigável</Badge>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {favoriteIds.map(fid => {
              const s = stations.find(st => st.id === fid);
              if (!s) return null;
              const displayName = getStationPublicName(s);
              return (
                <Link 
                  key={`fav-${fid}`}
                  href={getSendHref(fid, contextHref, fuelFilter)}
                  className="flex min-w-[160px] h-20 items-center gap-3 rounded-[24px] border border-yellow-400/30 bg-yellow-400/5 pl-4 pr-5 transition active:scale-[0.96] hover:bg-yellow-400/10"
                  onClick={() => {
                     void trackProductEvent({ eventType: "quick_action_clicked" as any, pagePath: "/", pageTitle: "Home", stationId: fid, payload: { source: "quick_access", type: "favorite" } });
                  }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-black shadow-lg shadow-yellow-400/20">
                    <Star className="h-5 w-5 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate uppercase italic tracking-tight">{displayName}</p>
                    <p className="text-[10px] font-bold text-yellow-400/50 truncate uppercase tracking-widest">{s.neighborhood}</p>
                  </div>
                </Link>
              );
            })}
            {recentIds.filter(rid => !favoriteIds.includes(rid)).map(rid => {
              const s = stations.find(st => st.id === rid);
              if (!s) return null;
              const displayName = getStationPublicName(s);
              return (
                <Link 
                  key={`rec-${rid}`}
                  href={getSendHref(rid, contextHref, fuelFilter)}
                  className="flex min-w-[160px] h-20 items-center gap-3 rounded-[24px] border border-white/10 bg-white/5 pl-4 pr-5 transition active:scale-[0.96] hover:bg-white/10"
                  onClick={() => {
                     void trackProductEvent({ eventType: "quick_action_clicked" as any, pagePath: "/", pageTitle: "Home", stationId: rid, payload: { source: "quick_access", type: "recent" } });
                  }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white/42 group-hover:bg-white/20">
                    <Clock3 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate uppercase italic tracking-tight">{displayName}</p>
                    <p className="text-[10px] font-bold text-white/30 truncate uppercase tracking-widest">{s.neighborhood}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      )}

      <div 
        className="mb-6"
        onClick={() => {
          void trackProductEvent({
            eventType: "home_block_interacted",
            pagePath: "/",
            scopeType: "block",
            scopeId: "my_submissions",
            payload: { role: role || 'unknown' }
          });
        }}
      >
        <MySubmissionsList />
      </div>

      {selectedCity && !isLowPerf && (
        <div className="mb-6">
          <RecorteActivityWidget 
            city={selectedCity} 
            groupSlug={selectedReadiness?.slug} 
            isReady={selectedReadiness?.status === "ready"}
          />
        </div>
      )}

      <SectionCard className={cn("space-y-4", (isStreetMode || mission) && "space-y-2 py-3", isLowPerf && "low-perf-mode shadow-none border-white/5")}>
        {/* Surfaces orchestrated elsewhere now */}
        {!isStreetMode && !mission && (
          <div className="space-y-1.5">
            <Badge className="text-[10px] uppercase tracking-widest">Mapa Vivo {role === 'senior' && "· Senior"}</Badge>
            <h2 className="text-2xl font-bold tracking-tight text-white">Transparência territorial e preço real</h2>
            <p className="text-sm leading-relaxed text-white/40">Busque, filtre e colabore para manter o mapa vivo.</p>
          </div>
        )}

        <div className="flex items-center gap-3 rounded-[22px] border border-white/8 bg-black/30 px-4 py-3 text-sm text-white/50">
          <Search className="h-4 w-4 text-[color:var(--color-accent)]" />
          <input
            value={query}
            onChange={(event) => {
              const nextValue = event.target.value;
              setQuery(nextValue);
              if (nextValue.length >= 2 && nextValue !== lastTrackedSearchRef.current) {
                lastTrackedSearchRef.current = nextValue;
                void trackProductEvent({
                  eventType: "home_search_used",
                  pagePath: "/",
                  pageTitle: "Mapa vivo",
                  scopeType: "page",
                  scopeId: "/",
                  payload: { queryLength: nextValue.length, query: nextValue }
                });
              }
            }}
            placeholder="Buscar posto, bairro ou cidade"
            className="w-full bg-transparent outline-none placeholder:text-white/38"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} className="text-white/50 transition hover:text-white">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex h-10 w-full items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Button 
              variant={coords ? "primary" : "secondary"}
              onClick={() => getLocation()}
              disabled={geoLoading}
              className="h-8 shrink-0 py-0 px-3 text-[10px] font-bold uppercase tracking-widest"
            >
              {geoLoading ? "Buscando..." : coords ? "GPS Ativo" : "📍 Perto de mim"}
            </Button>
            <div className="h-4 w-px shrink-0 bg-white/10" />
            <button
              type="button"
              onClick={() => {
                setSelectedCity("");
                setDefaultSelectionReason(null);
              }}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                selectedCity === "" ? "bg-[color:var(--color-accent)] text-black" : "border border-white/10 bg-white/5 text-white/66"
              }`}
            >
              Todas as cidades
            </button>
            {cityOptions.priority.map((city) => {
              const readiness = Array.isArray(territorialSummary) ? territorialSummary.find(g => g.name?.trim().toUpperCase() === city.trim().toUpperCase() || (g as any).city?.toUpperCase() === city.toUpperCase()) : null;
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    const oldCity = selectedCity;
                    setSelectedCity(city);
                    setDefaultSelectionReason(null);
                    updateTownFocus(city, city);
                    
                    if (defaultSelectionReason && oldCity !== city) {
                      void trackProductEvent({
                        eventType: "territorial_default_rejected" as any,
                        pagePath: "/",
                        pageTitle: "Home",
                        city: city,
                        payload: { 
                          previousCity: oldCity,
                          reason: defaultSelectionReason
                        }
                      });
                    }
                  }}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                    selectedCity.localeCompare(city, "pt-BR") === 0 ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white/66 hover:bg-white/10"
                  }`}
                >
                  {city}
                  {readiness && (
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      readiness.status === "ready" ? "bg-emerald-500" :
                      readiness.status === "validating" ? "bg-blue-500" : "bg-orange-500"
                    )} />
                  )}
                </button>
              );
            })}
            {pulseData && initialCity && (
            <RecortePulseWidget 
              activity={pulseData} 
              cityName={initialCity} 
            />
          )}
            <FeedbackTrigger 
              city={selectedCity} 
              fuelType={fuelFilter} 
              context={selectedCity ? `vendo ${selectedCity}` : "vendo todas as cidades"}
              title="Home"
              className="h-8 py-0 shrink-0"
            />
          </div>
          
          <div className="flex items-center justify-between min-h-[1.5rem]">
            {expansionSignal ? (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="text-xs text-white/40">{expansionSignal.icon} {expansionSignal.text}</span>
                {selectedReadiness && <ReadinessBadge status={selectedReadiness.status} className="h-4 py-0" />}
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-white/44">Comece por Volta Redonda, Barra Mansa ou Barra do Piraí.</p>
            )}
            
            {selectedReadiness && selectedReadiness.status !== "ready" && (
              <Button 
                variant="primary" 
                className="h-7 px-3 text-[9px] font-bold uppercase tracking-wider rounded-lg animate-pulse"
                onClick={() => {
                  const cityStations = stations.filter(s => 
                    s?.city && 
                    selectedCity && 
                    s.city.trim().toUpperCase() === selectedCity.trim().toUpperCase()
                  );
                  const cityStationIds = cityStations.map(s => s.id);
                  startMission(selectedReadiness?.slug || "general", selectedReadiness?.name || selectedCity, cityStationIds);
                  
                  void trackProductEvent({
                    eventType: "mission_start_from_home_cta" as any,
                    pagePath: "/",
                    pageTitle: "Home",
                    payload: { 
                      city: selectedCity,
                      defaultReason: defaultSelectionReason
                    }
                  });
                }}
              >
                Missão Coleta
              </Button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <FilterSelect
              label="Combustível"
              value={fuelFilter}
              onChange={(value) => setFuelFilter(value as FuelFilter)}
              options={publicFuelFilters.map((item) => ({ value: item.value, label: item.label }))}
            />
            <FilterSelect
              label="Recência"
              value={recencyFilter}
              onChange={(value) => setRecencyFilter(value as RecencyFilter)}
              options={recencyFilters.map((item) => ({ value: item.value, label: item.label }))}
            />
            <div className="space-y-2 rounded-[22px] border border-white/8 bg-black/30 px-4 py-3 text-sm text-white/58">
              <span className="block text-xs uppercase tracking-[0.18em] text-white/42">Exibição</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "all" as const, label: "Todos os postos" },
                  { value: "recent" as const, label: "Só com preço recente" }
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setPresenceFilter(item.value)}
                    className={`rounded-[16px] px-3 py-3 text-xs font-semibold transition ${
                      presenceFilter === item.value ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white/66"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <details className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/58">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-white/76">
              <span className="inline-flex items-center gap-2 font-medium">
                <SlidersHorizontal className="h-4 w-4 text-[color:var(--color-accent)]" />
                Mais filtros
              </span>
              <span className="text-xs uppercase tracking-[0.18em] text-white/42">Avançado</span>
            </summary>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">Combustíveis rápidos</p>
                <div className="flex flex-wrap gap-2">
                  {publicFuelFilters.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFuelFilter(item.value)}
                      className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                        fuelFilter === item.value ? "bg-[color:var(--color-accent)] text-black" : "border border-white/10 bg-white/5 text-white/66"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {cityOptions.others.length > 0 ? (
                <label className="space-y-2 rounded-[22px] border border-white/8 bg-black/30 px-4 py-3 text-sm text-white/58">
                  <span className="block text-xs uppercase tracking-[0.18em] text-white/42">Outras cidades</span>
                  <div className="relative">
                    <select
                      value={selectedCity && !priorityCities.some((city) => city.localeCompare(selectedCity, "pt-BR") === 0) ? selectedCity : ""}
                      onChange={(event) => {
                        setSelectedCity(event.target.value);
                        setDefaultSelectionReason(null);
                      }}
                      className="w-full appearance-none rounded-[16px] border border-white/8 bg-black/45 px-3 py-3 pr-10 text-sm text-white outline-none transition focus:border-[color:var(--color-accent)]"
                    >
                      <option value="" className="bg-zinc-900 text-white">Selecionar cidade</option>
                      {cityOptions.others.map((city) => (
                        <option key={city} value={city} className="bg-zinc-900 text-white">
                          {city}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/40">▾</span>
                  </div>
                </label>
              ) : null}

              <p className="text-xs leading-relaxed text-white/46">Os filtros avançados continuam disponíveis, mas ficam abaixo da decisão inicial para reduzir ruído na primeira leitura.</p>
            </div>
          </details>
        </div>

        <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/44">
          <div className="flex items-center gap-3">
            <span>{orderedStations.length} postos no recorte</span>
            {orderedStations.length > 0 && (
               <button 
                 type="button" 
                 onClick={() => {
                   const stationIds = orderedStations.map(s => s.id);
                   const missionName = selectedCity || "Personalizada";
                   startMission(selectedCity || "custom", missionName, stationIds);
                 }}
                 className="font-bold text-yellow-400 hover:underline"
               >
                 · Iniciar Missão de Rua
               </button>
            )}
            {selectedCity && !readRouteContext().active && (
              <button 
                type="button" 
                onClick={() => {
                  startRoute(selectedCity, null, fuelFilter);
                  window.location.reload(); // Refresh to show assistant
                }}
                className="font-bold text-[color:var(--color-accent)] hover:underline"
              >
                · Iniciar Rota de Coleta
              </button>
            )}
          </div>
          {hasFilters ? (
            <button type="button" onClick={resetFilters} className="text-white/60 transition hover:text-white">
              Limpar filtros
            </button>
          ) : null}
        </div>
      </SectionCard>

      {lastStation ? (
        <SectionCard className="flex items-center justify-between gap-3 border-white/8 bg-white/5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/42">Retomar contexto</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Último posto visto: {lastStation.name}</h3>
            <p className="text-sm text-white/54">{lastStation.city}</p>
          </div>
          <ButtonLink href={(`/postos/${lastStation.id}?returnTo=${encodeURIComponent(contextHref)}` as Route)} variant="secondary">
            Abrir novamente
          </ButtonLink>
        </SectionCard>
      ) : null}

      <SectionCard className="space-y-4 border-white/8 bg-black/60 pt-6 shadow-2xl">
        <div className="flex items-center gap-3 px-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Mapa vivo</p>
              <h3 className="mt-1 text-xl font-semibold text-white">Pins filtrados com leitura por cidade</h3>
            </div>
            <Link href="/enviar" className="text-sm text-[color:var(--color-accent)]">
              Enviar preço
            </Link>
          </div>
        </div>
        <StationMapShell stations={mapStations} className="h-[440px]" returnToHref={contextHref} fuelFilter={fuelFilter} center={coords} />
      </SectionCard>

      {summaryStations.length > 0 ? (
        <SectionCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Lista do recorte</p>
              <div className="flex items-center gap-2">
                <h2 className="mt-1 text-lg font-semibold text-white">Postos no seu filtro atual</h2>
                {selectedCity && orderedStations.length > 0 && orderedStations[0].releaseStatus && (
                  <GroupStatusBadge status={orderedStations[0].releaseStatus} className="mt-1" />
                )}
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">{summaryStations.length} no mapa</Badge>
          </div>
          <div className="space-y-1.5">
            {summaryStations.slice(0, 10).map((station) => {
              const latest = getSelectedStationReport(station, fuelFilter);
              const stationHref = `/postos/${station.id}?returnTo=${encodeURIComponent(contextHref)}` as Route;
              return (
                <Link
                  key={station.id}
                  href={stationHref}
                  onClick={() => {
                    rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
                    void trackProductEvent({ eventType: "station_clicked", pagePath: contextHref, pageTitle: "Mapa vivo", stationId: station.id, city: station.city, fuelType: latest?.fuelType ?? null, scopeType: "station", scopeId: station.id, payload: { source: "recorte-lista" } });
                  }}
                  className="group flex items-center justify-between rounded-[18px] border border-white/5 bg-white/5 px-4 py-3 transition hover:border-white/12 hover:bg-white/8 active:scale-[0.99]"
                >
                  <div className="min-w-0 pr-4">
                    <p className="truncate text-sm font-semibold text-white group-hover:text-[color:var(--color-accent)]">{getStationPublicName(station)}</p>
                    <p className="truncate text-xs text-white/40">
                      {station.neighborhood}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {station.distance !== undefined && (
                      <span className="text-[10px] font-medium text-white/40">
                        {formatDistance(station.distance)}
                      </span>
                    )}
                    
                    <QuickActionGroup 
                      className="p-0 border-none bg-transparent gap-1.5"
                      onMisclick={() => {
                        void trackProductEvent({ 
                          eventType: "quick_action_misclick" as any, 
                          pagePath: contextHref, 
                          pageTitle: getStationPublicName(station), 
                          stationId: station.id 
                        });
                      }}
                    >
                      <QuickActionButton
                        icon={Camera}
                        label="Foto"
                        variant="primary"
                        isStreetMode={isStreetMode}
                        href={getSendHref(station.id, contextHref, fuelFilter)}
                        className="h-9 w-9 p-0 min-w-0"
                        showLabel={false}
                        onClick={() => {
                          rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
                          void trackProductEvent({ 
                            eventType: "camera_opened_from_station", 
                            pagePath: getSendHref(station.id, contextHref, fuelFilter), 
                            pageTitle: getStationPublicName(station), 
                            stationId: station.id, 
                            city: station.city, 
                            fuelType: latest?.fuelType ?? null, 
                            scopeType: "submission", 
                            scopeId: station.id, 
                            payload: { source: "home_list", action: "photo" } 
                          });
                        }}
                      />
                      
                      <QuickActionButton
                        icon={Navigation}
                        label="Rota"
                        variant="secondary"
                        isStreetMode={isStreetMode}
                        className="h-9 w-9 p-0 min-w-0"
                        showLabel={false}
                        onClick={() => {
                          const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                          import("@/lib/navigation/external-maps").then(({ openExternalNavigation }) => {
                            openExternalNavigation(isMobile ? "waze" : "google", {
                              lat: station.lat,
                              lng: station.lng,
                              stationId: station.id,
                              stationName: getStationPublicName(station),
                              source: "home_list"
                            });
                          });
                        }}
                      />

                      <QuickActionButton
                        icon={Info}
                        label="Ver"
                        variant="outline"
                        isStreetMode={isStreetMode}
                        href={getStationHref(station.id, contextHref)}
                        className="h-9 w-9 p-0 min-w-0"
                        showLabel={false}
                        onClick={() => {
                          rememberStationVisit({ id: station.id, name: getStationPublicName(station), city: station.city });
                          void trackProductEvent({ 
                            eventType: "station_clicked", 
                            pagePath: getStationHref(station.id, contextHref), 
                            pageTitle: getStationPublicName(station), 
                            stationId: station.id, 
                            city: station.city, 
                            fuelType: latest?.fuelType ?? null, 
                            scopeType: "station", 
                            scopeId: station.id, 
                            payload: { source: "home_list", action: "details" } 
                          });
                        }}
                      />
                    </QuickActionGroup>

                    <ArrowRight className="h-4 w-4 text-white/20 transition group-hover:translate-x-1 group-hover:text-white" />
                  </div>
                </Link>
              );
            })}
            
            {summaryStations.length > 10 && (
              <div className="pt-2 text-center">
                <p className="text-[10px] text-white/30 uppercase tracking-widest">
                  + {summaryStations.length - 10} {summaryStations.length - 10 === 1 ? "posto oculto" : "postos ocultos"} para performance
                </p>
                <div className="mt-3 flex gap-2">
                   <ButtonLink 
                     href={("/postos/sem-atualizacao" as Route)} 
                     variant="secondary" 
                     className="flex-1 h-9 text-[10px] font-bold"
                   >
                     Ver todos
                   </ButtonLink>
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-4">
        {[
          { label: "No Recorte", value: mapStations.length, note: "Postos visíveis" },
          { label: "Com Preço", value: stationsWithRecentPrice.length, note: "Recentemente" },
          { label: "Falta Atualizar", value: stationsWithoutRecentPrice, note: "Sem preço recente", tone: "warning" },
          { label: "No Ar 24h", value: recentCount, note: "Últimos envios", tone: "accent" }
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col rounded-[18px] border border-white/5 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold tracking-tighter ${stat.tone === 'accent' ? 'text-[color:var(--color-accent)]' : stat.tone === 'warning' ? 'text-orange-400' : 'text-white'}`}>
              {stat.value}
            </p>
            <p className="text-[10px] text-white/20">{stat.note}</p>
          </div>
        ))}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Mais baratos agora</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Leitura rápida do filtro atual</h2>
          </div>
          <Badge variant="warning">{fuelFilter === "all" ? "Todos os combustíveis" : fuelLabels[fuelFilter]}</Badge>
        </div>
        {cheapestNow.length === 0 ? (
          <EmptyStateCard
            title={mapStations.length > 0 ? "Há postos cadastrados, mas ainda sem preço recente neste recorte." : "Nenhum preço disponível para este recorte."}
            description={mapStations.length > 0 ? "Abra a lista dos postos sem atualização e envie a primeira foto onde puder." : "Tente outro bairro, cidade, combustível ou remova os filtros para voltar ao mapa completo."}
            actionHref="/postos/sem-atualizacao"
            actionLabel="Ver postos sem atualização"
            className="text-left"
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {cheapestNow.map(({ station, report }) => (
              <div key={report.id} className="rounded-[18px] border border-white/5 bg-white/5 p-4 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 truncate">{getStationPublicName(station)}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-white">{formatCurrencyBRL(report.price)}</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-white/40">
                  <span className="truncate">{fuelLabels[report.fuelType]}</span>
                  <span className="shrink-0">{formatRecencyLabel(report.reportedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {noRecentStations.length > 0 ? (
        <SectionCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Postos sem atualização recente</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Onde ainda falta preço aprovado</h2>
            </div>
            <Link href="/postos/sem-atualizacao" className="text-sm text-[color:var(--color-accent)]">
              Ver lista completa
            </Link>
          </div>
          <div className="space-y-3">
            {noRecentStations.map((station) => (
              <StationCard 
                key={station.id} 
                station={station} 
                fuelFilter={fuelFilter} 
                returnToHref={contextHref}
                isStreetMode={isStreetMode}
                isFavorite={isFavorite(station.id)}
                onFavoriteToggle={() => toggleFavorite(station.id)}
              />
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Agora no mapa</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Consulta rápida</h2>
          </div>
          <Clock3 className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>
        <div className="space-y-3">
          {orderedStations.length === 0 ? (
            <EmptyStateCard
              title="Nenhum posto encontrado para essa busca."
              description="Tente outra cidade, combustível ou janela de recência. Se quiser, abra os postos sem atualização para colaborar."
              actionHref="/postos/sem-atualizacao"
              actionLabel="Ver postos sem atualização"
              className="text-left"
            />
          ) : (
            orderedStations.map((station) => (
              <StationCard 
                key={station.id} 
                station={station} 
                fuelFilter={fuelFilter} 
                returnToHref={contextHref}
                isStreetMode={isStreetMode}
                isFavorite={isFavorite(station.id)}
                onFavoriteToggle={() => toggleFavorite(station.id)}
              />
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Atualizações recentes</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Transparência popular</h2>
          </div>
          <Badge variant={filteredFeed.length === 0 ? "outline" : "warning"}>{filteredFeed.length} itens</Badge>
        </div>
        <div className="space-y-2">
          {filteredFeed.slice(0, 3).length === 0 ? (
            <EmptyStateCard
              title="Nenhuma atualização recente neste filtro."
              description="Ajuste o combustível, a cidade ou a janela de recência. Se quiser colaborar, envie o primeiro preço."
              actionHref="/postos/sem-atualizacao"
              actionLabel="Ver postos sem atualização"
              className="text-left"
            />
          ) : (
            filteredFeed.slice(0, 3).map((report) => (
              <div key={report.id} className="flex items-center justify-between rounded-[18px] border border-white/5 bg-white/5 px-4 py-3">
                <div className="min-w-0 pr-4">
                  <p className="truncate text-sm font-medium text-white/80">{getStationPublicName(report.station)}</p>
                  <p className="truncate text-[10px] text-white/30">
                    {report.station.neighborhood} · {fuelLabels[report.fuelType]}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <p className="text-lg font-bold text-white">{formatCurrencyBRL(report.price)}</p>
                  <p className="text-[10px] text-white/20">{formatRecencyLabel(report.reportedAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Colaboração</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Ajudar a base a ficar viva</h2>
          </div>
          <Link href="/postos/sem-atualizacao" className="text-sm text-[color:var(--color-accent)]">
            Ver lacunas do mapa
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <p className="text-sm font-semibold text-white">Há postos cadastrados sem preço recente ({reviewStations.length} em revisão territorial).</p>
            <p className="mt-1 text-sm text-white/58">Se você passou por algum deles, envie a primeira foto. Isso transforma lacuna em dado útil.</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <p className="text-sm font-semibold text-white">O mapa não fica vazio quando o cadastro existe.</p>
            <p className="mt-1 text-sm text-white/58">Cadastro territorial e preço recente são coisas diferentes. O app mostra isso sem confundir o usuário.</p>
          </div>
        </div>
        <ButtonLink href="/enviar" className="w-full">
          Enviar preço para o mapa
          <ArrowRight className="h-4 w-4" />
        </ButtonLink>
      </SectionCard>
    </>
  );
}
