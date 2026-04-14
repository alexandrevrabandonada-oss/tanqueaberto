"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Camera, ChevronDown, ChevronUp, Navigation, X, Zap } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { StationCard } from "@/components/station/station-card";
import { Badge } from "@/components/ui/badge";
import { GroupStatusBadge } from "@/components/ui/group-status-badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { ReadinessBadge } from "./readiness-badge";
import { EmptyStateCard } from "@/components/state/empty-state-card";
import { useLocationHardening } from "@/hooks/use-location-hardening";
import { calculateDistance, formatDistanceFromYou } from "@/lib/geo/distance";
import { filterItemsToFunctionalRegion, getFunctionalRegion } from "@/lib/geo/functional-regions";
import { cn } from "@/lib/utils";
import { trackProductEvent } from "@/lib/telemetry/client";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatDateTimeBR } from "@/lib/format/time";
import { formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { fuelLabels, publicFuelFilters, recencyFilters } from "@/lib/format/labels";
import { filterReports, filterStations, getSelectedStationReport, hasRecentStationPriceForFilter, type StationPresenceFilter } from "@/lib/filters/public";
import { sortStationsForPublicView } from "@/lib/filters/sort";
import { canShowStationOnMap, getStationPublicName, hasPendingStationLocationReview, isValidStationCoordinate } from "@/lib/quality/stations";
import { persistHomeContext, priorityCities, readHomeContext, readLastStationContext, rememberStationVisit } from "@/lib/navigation/home-context";
import type { HomeDensityMode } from "@/lib/navigation/home-context";
import { startRoute, readRouteContext } from "@/lib/navigation/route-context";
import { getNavigationHandoff, clearNavigationHandoff, type ExternalNavigationOptions } from "@/lib/navigation/external-maps";
import { useStreetMode } from "@/hooks/use-street-mode";
import { useNetworkHardening } from "@/hooks/use-network-hardening";
import { useMissionContext } from "@/components/mission/mission-context";
import { type EffectiveGroupStatus } from "@/lib/ops/release-control";
import { getSmartDefaultRecorte, getSmartDefaultPhrase, type SmartDefaultReason } from "@/lib/ops/smart-default";
import type { FuelFilter, RecencyFilter } from "@/lib/filters/public";
import { type FuelType, type ReportWithStation, StationWithReports } from "@/lib/types";
import { type SurfaceItem } from "@/components/layout/surface-orchestrator";
import { type SurfaceType, SURFACE_PRIORITIES } from "@/lib/ui/surface-orchestrator";
import { useOperationalFocus } from "@/hooks/use-operational-focus";
import { useRetentionSurfaces } from "@/components/layout/retention-hub";
import { useMySubmissions } from "@/hooks/use-my-submissions";
import { useProgressiveIdentity } from "@/hooks/use-progressive-identity";
import { type OperationalKillSwitches } from "@/lib/ops/kill-switches";
import { getRecortePulseAction } from "@/app/actions/pulse";
import { type RecorteActivity } from "@/lib/ops/recorte-activity";
import { QuickActionGroup, QuickActionButton } from "@/components/ui/quick-action";
import { useOperationalMemory } from "@/hooks/use-operational-memory";
import { useStreetSession } from "@/hooks/use-street-session";
import { useWarmStart } from "@/hooks/use-warm-start";
import { orchestrateHomeState } from "@/lib/ui/home-orchestrator";

const COMPARISON_FUEL_STORAGE_KEY = "bomba-aberta:economy-fuel-filter";
const COMPARISON_FUEL_OPTIONS = publicFuelFilters.filter((item) => item.value !== "all") as Array<{ value: FuelType; label: string }>;

const OperationalMemoryBar = dynamic(() => import("./operational-memory-bar").then((mod) => mod.OperationalMemoryBar), { ssr: false, loading: () => null });

const FirstVisitGuide = dynamic(() => import("@/components/onboarding/first-visit-guide").then((mod) => mod.FirstVisitGuide), {
  ssr: false,
  loading: () => <div className="h-40 rounded-[24px] border border-white/8 bg-black/20" />
});

const InstallPromptCard = dynamic(() => import("./install-prompt-card").then((mod) => mod.InstallPromptCard), {
  ssr: false,
  loading: () => null
});

const ProgressiveIdentityPrompt = dynamic(() => import("@/components/identity/progressive-identity-prompt").then((mod) => mod.ProgressiveIdentityPrompt), {
  ssr: false,
  loading: () => null
});

const RecorteActivityWidget = dynamic(() => import("@/components/home/recorte-activity-widget").then((mod) => mod.RecorteActivityWidget), {
  ssr: false,
  loading: () => null
});

const SessionDebriefModal = dynamic(() => import("@/components/session/session-debrief-modal").then((mod) => mod.SessionDebriefModal), {
  ssr: false,
  loading: () => null
});

const RouteAssistant = dynamic(() => import("@/components/routes/route-assistant").then((mod) => mod.RouteAssistant), {
  ssr: false,
  loading: () => <div className="h-28 rounded-[24px] border border-white/8 bg-black/20" />
});
const TopOrchestrator = dynamic(() => import("@/components/layout/top-orchestrator").then((mod) => mod.TopOrchestrator), {
  ssr: false,
  loading: () => <div className="rounded-[22px] border border-white/8 bg-black/24 p-3 text-sm text-white/42">Carregando busca e filtros...</div>
});
const SurfaceOrchestrator = dynamic(() => import("@/components/layout/surface-orchestrator").then((mod) => mod.SurfaceOrchestrator), { ssr: false, loading: () => null });
const HomeSimplifiedSections = dynamic(() => import("@/components/home/home-simplified-sections").then((mod) => mod.HomeSimplifiedSections), { ssr: false, loading: () => null });

const emittedHomeScrollDepthKeys = new Set<string>();
const emittedHomePrimaryBlockViewKeys = new Set<string>();

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
  initialDensityMode?: HomeDensityMode;
  initialListFirstMode?: boolean;
  killSwitches?: Partial<OperationalKillSwitches>;
  suppressMobileLead?: boolean;
}

function buildContextHref(query: string, city: string, fuelFilter: FuelFilter, recencyFilter: RecencyFilter, presenceFilter: StationPresenceFilter, densityMode: HomeDensityMode) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (city) params.set("city", city);
  if (fuelFilter !== "all") params.set("fuel", fuelFilter);
  if (recencyFilter !== "all") params.set("recency", recencyFilter);
  if (presenceFilter !== "all") params.set("presence", presenceFilter);
  if (densityMode !== "normal") params.set("density", densityMode);
  const suffix = params.toString();
  return suffix ? `/?${suffix}` : "/";
}

function inferGpsCity(
  stations: StationWithReports[],
  userLocation: { lat: number; lng: number; trustStatus: "confiável" | "provável" | "incerto" } | null
) {
  if (!userLocation || userLocation.trustStatus === "incerto") {
    return "";
  }

  const nearbyStations = stations
    .filter((station) => station.city && isValidStationCoordinate(station.lat, station.lng))
    .map((station) => ({
      city: station.city,
      distance: calculateDistance(userLocation.lat, userLocation.lng, station.lat, station.lng)
    }))
    .filter((entry) => Number.isFinite(entry.distance) && entry.distance <= 12_000)
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 8);

  if (nearbyStations.length === 0) {
    return "";
  }

  const cityScores = new Map<string, { count: number; bestDistance: number }>();
  for (const station of nearbyStations) {
    const current = cityScores.get(station.city) ?? { count: 0, bestDistance: Number.POSITIVE_INFINITY };
    current.count += 1;
    current.bestDistance = Math.min(current.bestDistance, station.distance);
    cityScores.set(station.city, current);
  }

  return [...cityScores.entries()]
    .sort((left, right) => right[1].count - left[1].count || left[1].bestDistance - right[1].bestDistance || left[0].localeCompare(right[0], "pt-BR"))[0]?.[0] ?? "";
}

function getStationHref(stationId: string, returnToHref?: string, fuelFilter?: FuelFilter | FuelType) {
  const params = new URLSearchParams();
  if (fuelFilter && fuelFilter !== "all") {
    params.set("fuel", fuelFilter);
  }
  if (returnToHref) {
    params.set("returnTo", returnToHref);
  }

  const suffix = params.toString();
  return suffix ? (`/postos/${stationId}?${suffix}` as Route) : (`/postos/${stationId}` as Route);
}

function getSendHref(stationId: string, returnToHref?: string, fuelFilter?: FuelFilter) {
  const fuelParam = fuelFilter && fuelFilter !== "all" ? `&fuel=${fuelFilter}` : "";
  const base = `/enviar?stationId=${stationId}${fuelParam}#photo`;
  return returnToHref ? (`${base}&returnTo=${encodeURIComponent(returnToHref)}` as Route) : (base as Route);
}

function isComparisonFuelType(value: string): value is FuelType {
  return COMPARISON_FUEL_OPTIONS.some((item) => item.value === value);
}

function getPrimaryRecorteKey(city: string) {
  const normalized = city.trim().toUpperCase();
  return normalized || null;
}

function readComparisonFuelPreference() {
  if (typeof window === "undefined") {
    return null;
  }

  const saved = window.localStorage.getItem(COMPARISON_FUEL_STORAGE_KEY);
  return saved && isComparisonFuelType(saved) ? saved : null;
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
    <label className="space-y-2 rounded-[20px] border border-white/8 bg-black/24 px-3.5 py-2.5 text-sm text-white/58">
      <span className="block text-xs uppercase tracking-[0.18em] text-white/42">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-[16px] border border-white/8 bg-black/45 px-3 py-3 pr-10 text-sm text-white outline-none transition focus:border-[color:var(--color-accent)] focus:ring-2 focus:ring-[color:var(--color-accent)]/20"
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
  initialDensityMode = "normal",
  initialListFirstMode = false,
  killSwitches,
  suppressMobileLead = false
}: HomeBrowserProps) {
  const [showShareWelcome, setShowShareWelcome] = useState(false);
  const [shareContext, setShareContext] = useState<string | null>(null);
  const [isHeroCollapsed, setIsHeroCollapsed] = useState(false);
  const [isMicroMode, setIsMicroMode] = useState(false);
  const { mission, startMission, isLoaded: missionLoaded } = useMissionContext();
  const missionActive = !!mission;
  
  const debriefOverlay = <SessionDebriefModal />;
  const heroRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState(initialCity || "");
  const [defaultSelectionReason, setDefaultSelectionReason] = useState<string | null>(null);
  const [secondaryRailOpen, setSecondaryRailOpen] = useState(false);
  const defaultApplied = useRef(false);
  const [fuelFilter, setFuelFilter] = useState<FuelFilter>(initialFuelFilter);
  const [recencyFilter, setRecencyFilter] = useState<RecencyFilter>(initialRecencyFilter);
  const [presenceFilter, setPresenceFilter] = useState<StationPresenceFilter>(initialPresenceFilter);

  // 1. WARM START ENGINE
  const { data: snapshot, isWarm, isRefreshing, setData: updateSnapshot } = useWarmStart<any>({
    key: "bomba-aberta:recorte-snapshot",
    version: "1.0",
  });

  const displayStations = useMemo(() => {
    if (isWarm && snapshot?.stations && stations.length === 0) {
      return snapshot.stations;
    }
    return stations;
  }, [isWarm, snapshot, stations]);

  useEffect(() => {
    if (stations.length > 0) {
      updateSnapshot({
        stations,
        selectedCity,
        query,
        fuelFilter,
        recencyFilter,
        presenceFilter,
        timestamp: new Date().toISOString()
      });
    }
  }, [stations, selectedCity, query, fuelFilter, recencyFilter, presenceFilter, updateSnapshot]);
  const [lastStation, setLastStation] = useState<ReturnType<typeof readLastStationContext>>(() => null);
  const [isHydrated, setIsHydrated] = useState(false);
  const lastTrackedSearchRef = useRef(initialQuery);
  const lastTrackedHomeStateRef = useRef<string | null>(null);
  const homeOpenedTrackedRef = useRef(false);
  const territorialEntryTrackedRef = useRef(false);
  const lastTrackedPrimaryRecorteRef = useRef<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const { location, loading: geoLoading, error: geoError, refresh: getLocation } = useLocationHardening();
  const coords = location ? { lat: location.lat, lng: location.lng } : null;
  const { isLowPerf, effectiveType } = useNetworkHardening();
  const { isStreetMode, toggleStreetMode, recentIds, favoriteIds, toggleFavorite, isFavorite } = useStreetMode();
  const { recordActivity, closeSessionManual } = useStreetSession();
  const [listMode, setListMode] = useState<'ultra-claro' | 'avancado' | 'normal'>(initialDensityMode);
  const { submissions } = useMySubmissions();
  const { focus, updateTownFocus, updateSuggestedStation } = useOperationalFocus();
  const submissionsCount = submissions.length;
  const { addRecentCut } = useOperationalMemory();
  const retentionSurfaces = useRetentionSurfaces();
  const [navHandoff, setNavHandoff] = useState<any>(null);
  const identity = useProgressiveIdentity();
  const [role, setRole] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const isAssisted = isStreetMode || role === "iniciante";
  const searchParams = useSearchParams();
  const densityParam = searchParams.get("density");

  useEffect(() => {
    const syncOnline = () => setIsOnline(navigator.onLine);
    syncOnline();
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);



  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const isWideViewport = window.innerWidth >= 1280;
      const missionBoost = missionActive ? 1 : 0;
      const collapseThreshold = isWideViewport ? 12 : 56;
      const microThreshold = isWideViewport ? 28 : 160;
      const collapseBuffer = isWideViewport ? 8 : 16;
      const microBuffer = isWideViewport ? 12 : 24;
      const collapseEnterThreshold = Math.max(0, collapseThreshold - missionBoost * 12 + collapseBuffer);
      const collapseExitThreshold = Math.max(0, collapseThreshold - missionBoost * 12 - collapseBuffer);
      const microEnterThreshold = Math.max(0, microThreshold - missionBoost * 20 + microBuffer);
      const microExitThreshold = Math.max(0, microThreshold - missionBoost * 20 - microBuffer);
      const shouldCollapse = isHeroCollapsed ? scrollY > collapseExitThreshold : scrollY > collapseEnterThreshold;
      const shouldBeMicro = isMicroMode ? scrollY > microExitThreshold : scrollY > microEnterThreshold;

      if (shouldCollapse !== isHeroCollapsed) {
        setIsHeroCollapsed(shouldCollapse);
      }
      
      if (shouldBeMicro !== isMicroMode) {
        setIsMicroMode(shouldBeMicro);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHeroCollapsed, isMicroMode, missionActive]);

  useEffect(() => {
    setRole(identity.utilityStatus.role);
  }, [identity.utilityStatus.role]);
  // Handle background refresh for warm start
  useEffect(() => {
    if (isWarm && !isRefreshing) {
      // Small delay to let initial render settle
      const timer = setTimeout(() => {
        // In this implementation, the parent 'stations' prop update trigger is enough 
        // but we could explicitly call a refresh if stations were fetched inside HomeBrowser.
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isWarm, isRefreshing]);

  useEffect(() => {
    const checkHandoff = () => {
      const data = getNavigationHandoff();
      if (data) {
        setNavHandoff(data);
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkHandoff();
      }
    };

    // Check on mount
    checkHandoff();

    // Check on return
    window.addEventListener("focus", checkHandoff);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", checkHandoff);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // Scroll Depth Telemetry
  useEffect(() => {
    const thresholds = [50, 100];
    const tracked = new Set<number>();

    const handleScroll = () => {
      const winHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (docHeight <= winHeight) {
        return;
      }

      const scrollTop = window.scrollY;
      const scrollPercent = Math.round((scrollTop / (docHeight - winHeight)) * 100);
      const pagePath = window.location.pathname;

      thresholds.forEach(t => {
        const thresholdKey = `${pagePath}::${t}`;
        if (scrollPercent >= t && !tracked.has(t) && !emittedHomeScrollDepthKeys.has(thresholdKey)) {
          tracked.add(t);
          emittedHomeScrollDepthKeys.add(thresholdKey);
          void trackProductEvent({
            eventType: "scroll_depth" as any,
            pagePath,
            payload: { depth: t }
          });
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("bomba_lista_mode") as any;
    if (stored) setListMode(stored);
    else if (isAssisted) setListMode('ultra-claro');
  }, [isAssisted]);

  const updateListMode = (mode: 'ultra-claro' | 'avancado' | 'normal') => {
    setListMode(mode);
    localStorage.setItem("bomba_lista_mode", mode);
    void trackProductEvent({ 
      eventType: "list_mode_changed" as any, 
      pagePath: "/", 
      payload: { mode } 
    });
  };

  useEffect(() => {
    if (territorialEntryTrackedRef.current || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("ref") !== "city_page" || !initialCity) {
      return;
    }

    territorialEntryTrackedRef.current = true;
    void trackProductEvent({
      eventType: "territorial_entry_from_landing" as any,
      pagePath: "/",
      pageTitle: "Mapa vivo",
      scopeType: "city",
      scopeId: initialCity,
      payload: { city: initialCity, source: "city_page" }
    });
  }, [initialCity]);

  useEffect(() => {
    if (homeOpenedTrackedRef.current) {
      return;
    }

    homeOpenedTrackedRef.current = true;
    void trackProductEvent({
      eventType: "home_opened",
      pagePath: "/",
      pageTitle: "Mapa vivo",
      scopeType: "page",
      scopeId: "/",
      payload: { streetMode: isStreetMode }
    });
  }, []);

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
        displayStations
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
    if (!densityParam && storedContext.densityMode && storedContext.densityMode !== listMode) {
      setListMode(storedContext.densityMode);
    }

    if (storedContext.isStreetMode !== undefined && storedContext.isStreetMode !== isStreetMode) {
      if (storedContext.isStreetMode) toggleStreetMode();
    }

    if (storedLastStation) {
      setLastStation(storedLastStation);
    }

    defaultApplied.current = true;
    setIsHydrated(true);
  }, [densityParam, initialCity, initialFuelFilter, initialPresenceFilter, initialQuery, initialRecencyFilter, listMode, territorialSummary, mission, missionLoaded, coords, stations]);

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
    if (!Array.isArray(displayStations)) return { priority: [], others: [], allCities: [] };
    const allCities = Array.from(new Set(displayStations.map((station) => station.city).filter(Boolean))).sort((left, right) => left.localeCompare(right, "pt-BR"));
    const priority = priorityCities.filter((city) => allCities.some((item) => item.localeCompare(city, "pt-BR") === 0));
    const others = allCities.filter((city) => !priority.some((item) => item.localeCompare(city, "pt-BR") === 0));
    return { priority, others, allCities };
  }, [displayStations]);


  const stationsWithDistances = useMemo(() => {
    if (!coords || !location) return displayStations;
    
    const canTrustProximity = location.trustStatus !== "incerto";
    
    return displayStations.map((station: StationWithReports) => ({
      ...station,
      distance: canTrustProximity && isValidStationCoordinate(station.lat, station.lng)
        ? calculateDistance(coords.lat, coords.lng, station.lat, station.lng)
        : undefined,
      isReliableProximity: location.trustStatus === "confiável"
    }));
  }, [displayStations, coords, location]);

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

  useEffect(() => {
    if (initialCity && isHydrated) {
      addRecentCut({ type: 'city', id: initialCity, name: initialCity });
    }
    if (initialGroupId && isHydrated) {
      const group = territorialSummary.find(s => s.id === initialGroupId);
      if (group) {
        addRecentCut({ type: 'group', id: initialGroupId, name: group.name });
      }
    }
  }, [initialCity, initialGroupId, territorialSummary, addRecentCut, isHydrated]);

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
    const canTrustProximity = location?.trustStatus !== "incerto";

    // Sort: Priority 1: Distance (if available), Priority 2: Release Status, Priority 3: Score
    return result.sort((a, b) => {
      // If coordinates are active, proximity is the main driver
      if (canTrustProximity && coords && a.distance !== undefined && b.distance !== undefined) {
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
  }, [filteredStations, coords, location?.trustStatus]);
  const visibleStations = useMemo(() => orderedStations.filter((station) => canShowStationOnMap(station)), [orderedStations]);
  const stationsWithRecentPrice = useMemo(
    () => visibleStations.filter((station) => hasRecentStationPriceForFilter(station, fuelFilter)),
    [fuelFilter, visibleStations]
  );
  const stationsWithoutRecentPrice = visibleStations.length - stationsWithRecentPrice.length;
  const reviewStations = useMemo(() => orderedStations.filter((station) => hasPendingStationLocationReview(station)), [orderedStations]);
  const noRecentStations = useMemo(() => {
    const candidates = orderedStations.filter((station) => !hasRecentStationPriceForFilter(station, fuelFilter));
    const canTrustProximity = location?.trustStatus !== "incerto";

    return [...candidates]
      .sort((left, right) => {
        if (canTrustProximity && coords && left.distance !== undefined && right.distance !== undefined) {
          return left.distance - right.distance;
        }

        return 0;
      })
      .slice(0, 4);
  }, [coords, fuelFilter, orderedStations, location?.trustStatus]);

  // Sessão de Rua: Registrar views automáticas
  useEffect(() => {
    // Pegar IDs dos postos atualmente visíveis na lista (top 10 de cada seção)
    const visibleIds = [
      ...noRecentStations.map(s => s.id),
      ...orderedStations.slice(0, 10).map(s => s.id)
    ];
    
    visibleIds.forEach(id => {
      recordActivity('view', id);
    });
  }, [noRecentStations, orderedStations, recordActivity]);
  const contextHref = useMemo(() => buildContextHref(query, selectedCity, fuelFilter, recencyFilter, presenceFilter, listMode), [fuelFilter, listMode, presenceFilter, query, recencyFilter, selectedCity]);
  const gpsDecisionCity = useMemo(
    () => inferGpsCity(displayStations, location ? { lat: location.lat, lng: location.lng, trustStatus: location.trustStatus } : null),
    [displayStations, location]
  );
  const decisionReferenceCity = gpsDecisionCity || selectedCity;
  const selectedFunctionalRegion = useMemo(() => getFunctionalRegion(decisionReferenceCity), [decisionReferenceCity]);
  const decisionStations = useMemo(() => {
    if (!decisionReferenceCity) {
      return orderedStations;
    }

    const broadBase = filterStations(stationsWithDistances, "", "", fuelFilter, recencyFilter, presenceFilter);
    return filterItemsToFunctionalRegion(broadBase, decisionReferenceCity);
  }, [decisionReferenceCity, orderedStations, stationsWithDistances, fuelFilter, recencyFilter, presenceFilter]);

  const cheapestNow = useMemo(() => {
    const availableFuels = new Set<FuelType>();
    for (const station of orderedStations) {
      for (const report of [...(station.recentReports ?? []), ...(station.latestReports ?? [])]) {
        if (isComparisonFuelType(String(report?.fuelType ?? ""))) {
          availableFuels.add(report.fuelType);
        }
      }
    }

    const preferredFuel =
      fuelFilter !== "all"
        ? fuelFilter
        : (() => {
            const recentSubmissionFuel = submissions[0]?.fuelType ?? null;
            const savedFuel = isHydrated ? readComparisonFuelPreference() : null;

            if (savedFuel && availableFuels.has(savedFuel)) {
              return savedFuel;
            }
            if (recentSubmissionFuel && availableFuels.has(recentSubmissionFuel)) {
              return recentSubmissionFuel;
            }
            if (availableFuels.has("gasolina_comum")) {
              return "gasolina_comum" as FuelType;
            }
            return Array.from(availableFuels)[0] ?? ("gasolina_comum" as FuelType);
          })();

    return orderedStations
      .map((station) => {
        const report = getSelectedStationReport(station, preferredFuel);
        return report ? { station, report } : null;
      })
      .filter((item): item is { station: StationWithReports; report: NonNullable<ReturnType<typeof getSelectedStationReport>> } => Boolean(item))
      .sort((left, right) => left.report.price - right.report.price)
      .slice(0, 3);
  }, [fuelFilter, isHydrated, orderedStations, submissions]);

  const hasFilters = Boolean(query || selectedCity || fuelFilter !== "all" || recencyFilter !== "all" || presenceFilter !== "all" || listMode !== "normal");
  const primaryRecorteKey = useMemo(() => getPrimaryRecorteKey(selectedCity), [selectedCity]);
  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const hasUsefulCut = filteredStations.length > 0 || filteredFeed.length > 0 || !hasFilters;
    if (hasUsefulCut) {
      persistHomeContext({ query, city: selectedCity, fuelFilter, recencyFilter, presenceFilter, densityMode: listMode, isStreetMode });
    }
  }, [fuelFilter, isHydrated, presenceFilter, query, recencyFilter, selectedCity, filteredFeed.length, filteredStations.length, hasFilters, isStreetMode, listMode]);

  useEffect(() => {
    if (!isHydrated || !primaryRecorteKey) {
      return;
    }

    // The primary recorte changes only when the selected city changes.
    if (lastTrackedPrimaryRecorteRef.current === primaryRecorteKey) {
      return;
    }

    lastTrackedPrimaryRecorteRef.current = primaryRecorteKey;
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
  }, [isHydrated, primaryRecorteKey, selectedCity, selectedReadiness?.score, selectedReadiness?.status]);


  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const params = url.searchParams;

    if (query) params.set("q", query); else params.delete("q");
    if (selectedCity) params.set("city", selectedCity); else params.delete("city");
    if (fuelFilter !== "all") params.set("fuel", fuelFilter); else params.delete("fuel");
    if (recencyFilter !== "all") params.set("recency", recencyFilter); else params.delete("recency");
    if (presenceFilter !== "all") params.set("presence", presenceFilter); else params.delete("presence");
    if (listMode !== "normal") params.set("density", listMode); else params.delete("density");

    const nextUrl = url.pathname + (params.toString() ? "?" + params.toString() : "") + url.hash;
    const currentUrl = window.location.pathname + window.location.search + window.location.hash;
    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [isHydrated, query, selectedCity, fuelFilter, recencyFilter, presenceFilter, listMode]);
  const homeState = useMemo(() => orchestrateHomeState({
    online: isOnline,
    geoError,
    missionActive,
    role,
    submissionsCount,
    recentCount,
    favoriteCount: favoriteIds.length,
    streetMode: isStreetMode,
    isWarm,
    isRefreshing,
    selectedCity,
    hasFilters,
  }), [isOnline, geoError, missionActive, role, submissionsCount, recentCount, favoriteIds.length, isStreetMode, isWarm, isRefreshing, selectedCity, hasFilters]);
  const isMobileLeanHome = initialListFirstMode || isLowPerf || isStreetMode;

  useEffect(() => {
    if (lastTrackedHomeStateRef.current === homeState.state) {
      return;
    }

    lastTrackedHomeStateRef.current = homeState.state;
    const primaryBlockViewKey = `/${homeState.state}`;
    if (emittedHomePrimaryBlockViewKeys.has(primaryBlockViewKey)) {
      return;
    }

    emittedHomePrimaryBlockViewKeys.add(primaryBlockViewKey);
    void trackProductEvent({
      eventType: "home_primary_block_view" as any,
      pagePath: "/",
      payload: {
        state: homeState.state,
        label: homeState.label,
      }
    });
  }, [homeState.label, homeState.state]);

  const mapStations = visibleStations;
  const priorityStations = noRecentStations.slice(0, 3);
  const railSendHref = `/enviar?returnTo=${encodeURIComponent(contextHref)}` as Route;

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
      
      void trackProductEvent({
        eventType: "first_fold_action" as any,
        pagePath: "/",
        payload: { type: "share_entry", context: contextName }
      });
    }
  }, [searchParams]);

  const resetFilters = () => {
    setQuery("");
    setSelectedCity("");
    setFuelFilter("all");
    setRecencyFilter("all");
    setPresenceFilter("all");
    setListMode("normal");
  };

  // [Modo Foco] Update suggested station for beginners based on current recorte
  useEffect(() => {
    if (role === 'iniciante' && isHydrated && orderedStations.length > 0) {
      const bestCandidate = orderedStations[0] as any;
      const currentSuggested = focus.suggestedStation;
      const isReliable = bestCandidate.isReliableProximity;
      
      if (isReliable && bestCandidate.id !== currentSuggested?.id) {
        updateSuggestedStation({ 
          id: bestCandidate.id, 
          name: getStationPublicName(bestCandidate) 
        });
      } else if (!isReliable && currentSuggested) {
        // Fallback: If signal becomes uncertain, clear current suggestion to avoid inaccurate "Arrival" triggers
        updateSuggestedStation(null);
      }
    }
  }, [role, isHydrated, orderedStations, focus.suggestedStation?.id, updateSuggestedStation]);

  // 1. Gather   // 1. Gather all potential surfaces for orchestration
  const surfaces: SurfaceItem[] = [];

  // Add retention surfaces first
  retentionSurfaces.forEach(s => surfaces.push(s as SurfaceItem));

  if (isLowPerf) {
    surfaces.push({
      id: "low-perf",
      type: "CRITICAL_ALERT",
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
      type: "CONTEXT_HANDOFF",
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

  // MISSION STATUS (RouteAssistant) integrated into surfaces
  if (mission) {
    surfaces.push({
      id: "mission-assistant",
      type: "MISSION_STATUS",
      content: ({ isCondensed }: { isCondensed: boolean }) => (
        <div className="space-y-3">
          <RouteAssistant stations={stations} isCondensed={isCondensed} />
          {!isCondensed && isStreetMode && (
            <button 
              onClick={closeSessionManual}
              className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/10 transition-colors"
            >
              🚩 Encerrar Sessão de Rua
            </button>
          )}
        </div>
      )
    });
  }

  // ONBOARDING (FirstVisitGuide) integrated into surfaces
  surfaces.push({
    id: "onboarding-guide",
    type: "ONBOARDING",
    content: ({ isCondensed }: { isCondensed: boolean }) => (
      <FirstVisitGuide isCondensed={isCondensed} />
    )
  });

  if (betaClosed) {
    surfaces.push({
      id: "beta-closed",
      type: "INFO_NOTICE",
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

  // STREET MODE PROMPT as surface if not active
  if (!isStreetMode && !mission) {
    surfaces.push({
      id: "street-mode-prompt",
      type: "STREET_MODE_PROMPT",
      content: ({ isCondensed }: { isCondensed: boolean }) => (
        <button 
          onClick={toggleStreetMode}
          className={cn(
            "w-full rounded-[22px] border-2 border-white/5 bg-[color:var(--color-accent)]/10 text-xs font-bold uppercase tracking-widest text-[color:var(--color-accent)] shadow-lg transition-all active:scale-95",
            isCondensed ? "h-11 border-dashed" : "h-14"
          )}
        >
          🚀 MODO RUA (MAIS RÁPIDO)
        </button>
      )
    });
  }

  surfaces.push({
    id: "pwa-install",
    type: "ACTION_PROMPT",
    content: <InstallPromptCard />
  });

  // 2. Adaptive Filtering and Sorting of Surfaces
  const orchestratedSurfaces = useMemo(() => {
    let result = [...surfaces];
    
    // If it's a NEW user, prioritize Onboarding (handled by FirstVisitGuide via priorities) 
    // and keep surfaces light.
    if (role === 'iniciante') {
      result = result.filter(s => s.id !== 'pwa-install' && s.id !== 'beta-closed');
    }

    // MISSION ACTIVE: Orchestrator already handles prioritites, 
    // but we can explicitly suppress low-priority info here if desired.
    if (missionActive) {
      result = result.filter(s => 
        SURFACE_PRIORITIES[s.type] >= SURFACE_PRIORITIES.MISSION_STATUS ||
        s.id.includes("pending")
      );
    }
    
    return result;
  }, [surfaces, role, missionActive]);

  if (defaultSelectionReason) {
    orchestratedSurfaces.push({
      id: "smart-default",
      type: "INFO_NOTICE",
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

  const primaryOperationalSurfaces = orchestratedSurfaces.filter(
    (surface) => SURFACE_PRIORITIES[surface.type] >= SURFACE_PRIORITIES.MISSION_STATUS
  );
  const secondarySupportSurfaces = orchestratedSurfaces.filter(
    (surface) => SURFACE_PRIORITIES[surface.type] < SURFACE_PRIORITIES.MISSION_STATUS
  );
  const secondarySupportCount = secondarySupportSurfaces.length + 1 + (isStreetMode && !missionActive ? 1 : 0);
  const hasSecondaryRail = secondarySupportCount > 0;

  return (
    <>
      {debriefOverlay}
      <TopOrchestrator
        isWarm={isWarm}
        isRefreshing={isRefreshing}
        isLowPerf={isLowPerf}
        effectiveType={effectiveType}
        coords={coords}
        geoLoading={geoLoading}
        gpsAccuracy={location?.accuracy ?? null}
        gpsTrustStatus={location?.trustStatus ?? null}
        onGetLocation={getLocation}
        query={query}
        onQueryChange={(val) => setQuery(val)}
        selectedCity={selectedCity}
        onCityReset={() => {
          setSelectedCity("");
          setDefaultSelectionReason(null);
        }}
        cityOptions={{
          priority: cityOptions.priority,
          others: cityOptions.others
        }}
        onCitySelect={(city) => {
          setSelectedCity(city);
          setDefaultSelectionReason(null);
          updateTownFocus(city, city);
        }}
        fuelFilter={fuelFilter}
        onFuelChange={(nextFuel) => setFuelFilter(nextFuel)}
        densityMode={listMode}
        onDensityChange={(mode) => updateListMode(mode)}
        isSticky={isHeroCollapsed || missionActive}
        isMicro={isMicroMode}
        isMissionActive={missionActive}
      />
      <HomeSimplifiedSections
        contextHref={contextHref}
        fuelFilter={fuelFilter}
        decisionStations={decisionStations}
        mapStations={mapStations}
        noRecentStations={noRecentStations}
        railSendHref={railSendHref}
        decisionCity={decisionReferenceCity}
        query={query}
        functionalRegion={selectedFunctionalRegion}
        center={coords}
        userLocation={location}
        onStationTrack={(scopeId: string) => {
          void trackProductEvent({
            eventType: "home_block_interacted",
            pagePath: "/",
            scopeType: "block",
            scopeId,
            payload: { role: role || 'unknown' }
          });
        }}
      />
      {primaryOperationalSurfaces.length > 0 ? (
        <div className="mt-4">
          <SurfaceOrchestrator 
             surfaces={primaryOperationalSurfaces} 
             onDismiss={(id) => {
               if (id === "beta-closed") { /* potential local storage toggle */ }
             }}
             maxPrimaryItems={2}
          />
        </div>
      ) : null}

      {hasSecondaryRail ? (
        <SectionCard className="mt-4 space-y-0 overflow-hidden px-0 py-0">
          <button
            type="button"
            onClick={() => setSecondaryRailOpen((value) => !value)}
            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            aria-expanded={secondaryRailOpen}
          >
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Secundário</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Apoios e onboarding recolhidos</h2>
              <p className="mt-1 text-sm text-white/52">Identidade, avisos e fluxos auxiliares fora da pilha principal.</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{secondarySupportCount}</Badge>
              {secondaryRailOpen ? <ChevronUp className="h-4 w-4 text-white/50" /> : <ChevronDown className="h-4 w-4 text-white/50" />}
            </div>
          </button>

          {secondaryRailOpen ? (
            <div className="border-t border-white/8 px-5 py-4 space-y-4">
              <ProgressiveIdentityPrompt context="home" source="return" />

              {secondarySupportSurfaces.length > 0 ? (
                <SurfaceOrchestrator 
                  surfaces={secondarySupportSurfaces} 
                  onDismiss={(id) => {
                    if (id === "beta-closed") { /* potential local storage toggle */ }
                  }}
                  maxPrimaryItems={2}
                />
              ) : null}

              {isStreetMode && !missionActive ? (
                <Button 
                  variant="primary"
                  onClick={toggleStreetMode}
                  className="w-full h-11 rounded-[22px] text-xs font-black uppercase tracking-widest shadow-lg border-2 border-white/10"
                >
                  MODO RUA ATIVO
                </Button>
              ) : null}
            </div>
          ) : null}
        </SectionCard>
      ) : null}
    </>
  );
}







