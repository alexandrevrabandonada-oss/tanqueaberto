import { AppShell } from "@/components/layout/app-shell";
import { StationCard } from "@/components/station/station-card";
import { ButtonLink } from "@/components/ui/button";
import { MissionStartButton } from "@/components/mission/mission-start-button";
import { SectionCard } from "@/components/ui/section-card";
import { getHomeStations } from "@/lib/data";
import { TerritoryWorkflowControls } from "@/components/admin/ops/territory-workflow-controls";
import { buildTerritoryWorkflowReturnTo, getTerritoryWorkflowReadout, resolveTerritoryWorkflowState } from "@/lib/ops/territory-workflow";
import { canShowStationOnMap, hasRecentStationPrice } from "@/lib/quality/stations";

export const dynamic = "force-dynamic";

interface StationsWithoutRecentPricePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function readTerritory(searchParams: Record<string, string | string[] | undefined>) {
  const city = typeof searchParams.city === "string" ? searchParams.city.trim() : "";
  const neighborhood = typeof searchParams.neighborhood === "string" ? searchParams.neighborhood.trim() : "";
  const territoryContext = typeof searchParams.territoryContext === "string" ? searchParams.territoryContext : "";
  return { city, neighborhood, territoryContext };
}

function matchesTerritory(station: { city?: string | null; neighborhood?: string | null }, territory: { city: string; neighborhood: string }) {
  if (territory.city && normalize(station.city) !== normalize(territory.city)) return false;
  if (territory.neighborhood && normalize(station.neighborhood) !== normalize(territory.neighborhood)) return false;
  return true;
}

export default async function StationsWithoutRecentPricePage({ searchParams }: StationsWithoutRecentPricePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const territory = readTerritory(resolvedSearchParams);
  const stations = await getHomeStations();
  const workflowReadout = await getTerritoryWorkflowReadout(120);
  const currentWorkflow = territory.city || territory.neighborhood ? resolveTerritoryWorkflowState(workflowReadout.records, territory.city || undefined, territory.neighborhood || undefined) : null;
  const withoutRecentAll = stations.filter((station) => canShowStationOnMap(station) && !hasRecentStationPrice(station)).sort((left, right) => {
    const cityCompare = (left.city || "").localeCompare(right.city || "");
    if (cityCompare !== 0) return cityCompare;
    return (left.neighborhood || "").localeCompare(right.neighborhood || "");
  });
  const withoutRecent = territory.city || territory.neighborhood
    ? withoutRecentAll.filter((station) => matchesTerritory(station, territory))
    : withoutRecentAll;

  return (
    <AppShell>
      <div className="space-y-4 pb-10 pt-1">
        <SectionCard className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Lacunas do mapa</p>
            <h1 className="text-[2rem] font-semibold leading-none text-white">Postos cadastrados sem preço recente</h1>
            <p className="max-w-2xl text-sm text-white/58">
              Esses postos já existem no território visível. O que falta é um preço aprovado recente para deixar a leitura viva.
            </p>
          </div>

          {territory.city || territory.neighborhood ? (
            <div className="space-y-3 rounded-[18px] border border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/8 px-4 py-3 text-sm text-white/72">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-accent)]">Território em foco</p>
                <p className="mt-1 font-semibold text-white">{territory.neighborhood || territory.city}</p>
                <p className="text-white/48">{territory.city && territory.neighborhood ? `${territory.city} · ${territory.neighborhood}` : territory.city || territory.neighborhood}</p>
              </div>
              <TerritoryWorkflowControls
                city={territory.city || territory.neighborhood || ""}
                neighborhood={territory.neighborhood || null}
                returnTo={buildTerritoryWorkflowReturnTo("/postos/sem-atualizacao", territory.city || undefined, territory.neighborhood || undefined, "station_editor")}
                currentState={currentWorkflow}
                compact
              />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Sem atualização recente</p>
              <p className="mt-3 text-3xl font-semibold text-white">{withoutRecent.length}</p>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Apto ao mapa</p>
              <p className="mt-3 text-3xl font-semibold text-white">{stations.filter((station) => canShowStationOnMap(station)).length}</p>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Como colaborar</p>
              <p className="mt-3 text-sm text-white/58">Enviar foto, preço e horário do momento.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/enviar">Enviar preço</ButtonLink>
            {withoutRecent.length > 0 && (
              <MissionStartButton 
                groupId="gaps" 
                groupName="Lacunas do Mapa" 
                stationIds={withoutRecent.map(s => s.id)}
              >
                Missão: Resolver Lacunas
              </MissionStartButton>
            )}
            <ButtonLink href="/" variant="secondary">Voltar ao mapa</ButtonLink>
          </div>
        </SectionCard>

        {withoutRecent.length === 0 ? (
          <SectionCard>
            <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">
              Não há postos visíveis sem preço recente neste momento.
            </div>
          </SectionCard>
        ) : (
          <div className="space-y-3">
            {withoutRecent.map((station) => (
              <StationCard key={station.id} station={station} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}


