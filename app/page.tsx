import { headers } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { HomeBrowser } from "@/components/home/home-browser";
import { HomeServerLead } from "@/components/home/home-server-lead";
import { SubmissionHistoryProvider } from "@/components/history/submission-history-context";
import { MissionProvider } from "@/components/mission/mission-context";
import { RouteRuntimeSignals } from "@/components/layout/route-runtime-signals";
import { getHomePageData } from "@/lib/data/queries";
import { getTerritorialReleaseSummary } from "@/lib/ops/release-control";
import { isBetaClosed } from "@/lib/beta/gate";
import type { FuelFilter, RecencyFilter, StationPresenceFilter } from "@/lib/filters/public";
import type { HomeDensityMode } from "@/lib/navigation/home-context";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function parseFuel(value: string | string[] | undefined): FuelFilter {
  const candidate = firstValue(value);
  return candidate === "all" || candidate === "gasolina_comum" || candidate === "gasolina_aditivada" || candidate === "etanol" || candidate === "diesel_s10" || candidate === "diesel_comum" || candidate === "gnv" ? (candidate as FuelFilter) : "all";
}

function parseRecency(value: string | string[] | undefined): RecencyFilter {
  const candidate = firstValue(value);
  return candidate === "24h" || candidate === "48h" ? candidate : "all";
}

function parsePresence(value: string | string[] | undefined): StationPresenceFilter {
  const candidate = firstValue(value);
  return candidate === "recent" ? "recent" : "all";
}

function parseDensity(value: string | string[] | undefined): HomeDensityMode {
  const candidate = firstValue(value);
  return candidate === "ultra-claro" || candidate === "normal" || candidate === "avancado" ? candidate : "normal";
}

function parseCity(value: string | string[] | undefined) {
  const candidate = firstValue(value).trim();
  return candidate === "all" ? "" : candidate;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const currentHeaders = await headers();
  const userAgent = currentHeaders.get("user-agent") ?? "";
  const initialListFirstMode = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);

  const params = (await searchParams) ?? {};
  const groupId = firstValue(params.groupId);
  const initialQuery = firstValue(params.q).trim();
  const initialCity = parseCity(params.city);
  const initialFuelFilter = parseFuel(params.fuel);
  const initialRecencyFilter = parseRecency(params.recency);
  const initialPresenceFilter = parsePresence(params.presence);
  const initialDensityMode = parseDensity(params.density);
  const hasActiveRecorte = Boolean(
    initialQuery ||
      initialCity ||
      initialFuelFilter !== "all" ||
      initialRecencyFilter !== "all" ||
      initialPresenceFilter !== "all" ||
      initialDensityMode !== "normal" ||
      groupId
  );

  const [{ stations, feed, recentCount }, territorialSummary] = await Promise.all([
    getHomePageData(),
    getTerritorialReleaseSummary()
  ]);

  let initialGroupStationIds: string[] = [];
  if (groupId) {
    const { getAuditGroupMembers } = await import("@/lib/audit/groups");
    const members = await getAuditGroupMembers(groupId);
    initialGroupStationIds = members.map((m) => m.stationId);
  }

  return (
    <SubmissionHistoryProvider>
      <AppShell
        activeNavPath="/"
        globalSubmitCta={hasActiveRecorte && !initialListFirstMode ? {
          href: "/enviar",
          label: "Enviar preço",
          note: "Avance este recorte com um envio real."
        } : null}
      >
        <MissionProvider>
          <RouteRuntimeSignals />
        {initialListFirstMode ? (
          <HomeServerLead
            stations={stations}
            recentCount={recentCount}
            initialCity={initialCity}
            initialQuery={initialQuery}
            initialFuelFilter={initialFuelFilter}
            initialRecencyFilter={initialRecencyFilter}
            initialPresenceFilter={initialPresenceFilter}
          />
        ) : null}
        <HomeBrowser
          stations={stations}
          feed={feed}
          recentCount={recentCount}
          territorialSummary={territorialSummary}
          betaClosed={isBetaClosed()}
          initialQuery={initialQuery}
          initialCity={initialCity}
          initialGroupId={groupId}
          initialGroupStationIds={initialGroupStationIds}
          initialFuelFilter={initialFuelFilter}
          initialRecencyFilter={initialRecencyFilter}
          initialPresenceFilter={initialPresenceFilter}
          initialDensityMode={initialDensityMode}
          initialListFirstMode={initialListFirstMode}
          suppressMobileLead={initialListFirstMode}
        />
        </MissionProvider>
      </AppShell>
    </SubmissionHistoryProvider>
  );
}
