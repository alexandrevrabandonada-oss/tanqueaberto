import { AppShell } from "@/components/layout/app-shell";
import { HomeBrowser } from "@/components/home/home-browser";
import { getHomeStations, getRecentApprovedCount, getRecentFeed } from "@/lib/data";
import { getTerritorialReleaseSummary } from "@/lib/ops/release-control";
import { getKillSwitches } from "@/lib/ops/kill-switches";
import { getAuditGroupMembers } from "@/lib/audit/groups";
import { isBetaClosed } from "@/lib/beta/gate";
import type { FuelFilter, RecencyFilter, StationPresenceFilter } from "@/lib/filters/public";

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

function parseCity(value: string | string[] | undefined) {
  const candidate = firstValue(value).trim();
  return candidate === "all" ? "" : candidate;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {};
  const groupId = firstValue(params.groupId);
  
  const [stations, feed, recentCount, territorialSummary, killSwitches] = await Promise.all([
    getHomeStations(), 
    getRecentFeed(), 
    getRecentApprovedCount(),
    getTerritorialReleaseSummary(),
    getKillSwitches()
  ]);

  let initialGroupStationIds: string[] = [];
  if (groupId) {
    const members = await getAuditGroupMembers(groupId);
    initialGroupStationIds = members.map(m => m.stationId);
  }

  return (
    <AppShell killSwitches={killSwitches}>
      <HomeBrowser
        stations={stations}
        feed={feed}
        recentCount={recentCount}
        territorialSummary={territorialSummary}
        betaClosed={isBetaClosed()}
        initialQuery={firstValue(params.q)}
        initialCity={parseCity(params.city)}
        initialGroupId={groupId}
        initialGroupStationIds={initialGroupStationIds}
        initialFuelFilter={parseFuel(params.fuel)}
        initialRecencyFilter={parseRecency(params.recency)}
        initialPresenceFilter={parsePresence(params.presence)}
        killSwitches={killSwitches}
      />
    </AppShell>
  );
}
