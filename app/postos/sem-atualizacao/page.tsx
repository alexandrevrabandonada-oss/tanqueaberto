
import { AppShell } from "@/components/layout/app-shell";
import { StationCard } from "@/components/station/station-card";
import { ButtonLink } from "@/components/ui/button";
import { MissionStartButton } from "@/components/mission/mission-start-button";
import { SectionCard } from "@/components/ui/section-card";
import { getHomeStations } from "@/lib/data";
import { canShowStationOnMap, hasRecentStationPrice } from "@/lib/quality/stations";

export const dynamic = "force-dynamic";

export default async function StationsWithoutRecentPricePage() {
  const stations = await getHomeStations();
  const withoutRecent = stations.filter((station) => canShowStationOnMap(station) && !hasRecentStationPrice(station)).sort((left, right) => {
    const cityCompare = left.city.localeCompare(right.city);
    if (cityCompare !== 0) return cityCompare;
    return left.neighborhood.localeCompare(right.neighborhood);
  });

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

