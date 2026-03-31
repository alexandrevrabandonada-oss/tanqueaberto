"use client";

import Link from "next/link";
import type { Route } from "next";
import { Camera, Clock3, Navigation, Sparkles, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyStateCard } from "@/components/state/empty-state-card";
import { StationCard } from "@/components/station/station-card";
import { GroupStatusBadge } from "@/components/ui/group-status-badge";
import { QuickActionButton } from "@/components/ui/quick-action";
import { OperationalMemoryBar } from "@/components/home/operational-memory-bar";
import { HomeMapSurface } from "@/components/home/home-map-surface";
import { RecorteActivityWidget } from "@/components/home/recorte-activity-widget";
import { MySubmissionsList } from "@/components/history/my-submissions-list";
import { cn } from "@/lib/utils";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel, getRecencyTone } from "@/lib/format/time";
import { fuelLabels } from "@/lib/format/labels";
import { canShowStationOnMap, getStationPublicName, hasPendingStationLocationReview } from "@/lib/quality/stations";
import { getSelectedStationReport, hasRecentStationPriceForFilter } from "@/lib/filters/public";
import { rememberStationVisit } from "@/lib/navigation/home-context";
import { trackProductEvent } from "@/lib/telemetry/client";

function getSendHref(stationId: string, returnToHref?: string, fuelFilter?: string) {
  const fuelParam = fuelFilter && fuelFilter !== "all" ? `&fuel=${fuelFilter}` : "";
  const base = `/enviar?stationId=${stationId}${fuelParam}#photo`;
  return returnToHref ? `${base}&returnTo=${encodeURIComponent(returnToHref)}` : base;
}

export function HomeDeferredSections(props: Record<string, any>) {
  const {
    homeState,
    missionActive,
    isStreetMode,
    isAssisted,
    toggleStreetMode,
    recentIds = [],
    favoriteIds = [],
    stations = [],
    recentCount = 0,
    selectedCity = "",
    selectedReadiness,
    contextHref = "/",
    fuelFilter = "all",
    listMode = "normal",
    isLowPerf = false,
    recordActivity,
    toggleFavorite,
    isFavorite,
    startMission,
    mapStations = [],
    summaryStations = [],
    priorityStations = [],
    priorityLabel = "",
    priorityHint = "",
    noRecentStations = [],
    cheapestNow = [],
    filteredFeed = [],
    orderedStations = [],
    stationsWithRecentPrice = [],
    stationsWithoutRecentPrice = 0,
    railSendHref = "/enviar",
    isHeroCollapsed = false,
    role,
    selectedCityLabel = selectedCity,
    onQuickAccessTrack,
    onRouteTrack,
    onStationTrack
  } = props;

  const showQuickAccess = homeState?.showQuickAccess && !missionActive && (recentIds.length > 0 || favoriteIds.length > 0);

  return (
    <>
      {homeState.state !== "operation-normal" ? (
        <div className="mb-6 transition-all duration-300">
          <SectionCard className="space-y-3 border-white/8 bg-white/[0.04] py-4 xl:mb-3">
            <div className="space-y-1">
              <Badge className="text-[10px] uppercase tracking-widest">Mapa Vivo {role === 'senior' && "· Senior"}</Badge>
              <h2 className="text-2xl font-bold tracking-tight text-white xl:text-[1.6rem]">Buscar, comparar e enviar.</h2>
              <p className="text-sm leading-relaxed text-white/40 xl:max-w-xl">Veja os postos do recorte e entre no envio sem rodeio.</p>
            </div>

            <div className="flex items-center justify-between min-h-[1.5rem]">
              {selectedReadiness ? (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="text-xs text-white/40">{selectedReadiness.status === "ready" ? "✨ Recorte forte e validado." : selectedReadiness.status === "validating" ? "🧪 Recorte em validação técnica." : "🧱 Sua contribuição é útil aqui."}</span>
                  {selectedReadiness && <GroupStatusBadge status={selectedReadiness.status} className="mt-1" />}
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-white/44">Comece por Volta Redonda, Barra Mansa ou Barra do Piraí.</p>
              )}

              {selectedReadiness && selectedReadiness.status !== "ready" ? (
                <Button
                  variant="primary"
                  className="h-7 px-3 text-[9px] font-bold uppercase tracking-wider rounded-lg animate-pulse"
                  onClick={() => {
                    const cityStations = stations.filter((s: any) => s?.city && selectedCity && s.city.trim().toUpperCase() === selectedCity.trim().toUpperCase());
                    const cityStationIds = cityStations.map((s: any) => s.id);
                    if (selectedReadiness) {
                      startMission(selectedReadiness.slug || "general", selectedReadiness.name || (selectedCity || "Cidade"), cityStationIds);
                    }

                    void trackProductEvent({
                      eventType: "first_fold_action" as any,
                      pagePath: "/",
                      payload: { type: "mission_start", city: selectedCity }
                    });

                    void trackProductEvent({
                      eventType: "mission_start_from_home_cta" as any,
                      pagePath: "/",
                      pageTitle: "Home",
                      payload: {
                        city: selectedCity,
                        defaultReason: null
                      }
                    });
                  }}
                >
                  Missão Coleta
                </Button>
              ) : null}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {showQuickAccess ? (
        <SectionCard
          className="mb-4 space-y-4 p-5 border-white/10 bg-white/5 xl:hidden"
          onClick={() => {
            void onQuickAccessTrack?.();
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-[color:var(--color-accent)]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">Acesso Rápido</p>
            </div>
            <Badge variant="outline" className="h-5 px-2 text-[9px] border-white/10 text-white/30 font-black uppercase tracking-tighter">Polegar amigável</Badge>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {favoriteIds.map((fid: string) => {
              const s = stations.find((st: any) => st.id === fid);
              if (!s) return null;
              const displayName = getStationPublicName(s);
              return (
                <Link
                  key={`fav-${fid}`}
                  href={getSendHref(fid, contextHref, fuelFilter) as Route}
                  className={cn("flex min-w-[160px] h-20 items-center gap-3 rounded-[24px] border border-yellow-400/30 bg-yellow-400/5 pl-4 pr-5 transition duration-200 active:scale-95 active:brightness-125 hover:bg-yellow-400/10", isAssisted && "border-yellow-400/50 bg-yellow-400/10")}
                  onClick={() => {
                    void onQuickAccessTrack?.(fid, "favorite");
                  }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-black shadow-lg shadow-yellow-400/20">
                    <Star className="h-5 w-5 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase italic tracking-tight text-white">{displayName}</p>
                    <p className="truncate text-[10px] font-bold uppercase tracking-widest text-yellow-400/50">{isAssisted ? "ENVIAR FOTO" : s.neighborhood}</p>
                  </div>
                </Link>
              );
            })}
            {recentIds.filter((rid: string) => !favoriteIds.includes(rid)).map((rid: string) => {
              const s = stations.find((st: any) => st.id === rid);
              if (!s) return null;
              const displayName = getStationPublicName(s);
              return (
                <Link
                  key={`rec-${rid}`}
                  href={getSendHref(rid, contextHref, fuelFilter) as Route}
                  className={cn("flex min-w-[160px] h-20 items-center gap-3 rounded-[24px] border border-white/10 bg-white/5 pl-4 pr-5 transition duration-200 active:scale-95 active:brightness-125 hover:bg-white/10", isAssisted && "border-white/20 bg-white/8")}
                  onClick={() => {
                    void onQuickAccessTrack?.(rid, "recent");
                  }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white/42 group-hover:bg-white/20">
                    <Clock3 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase italic tracking-tight text-white">{displayName}</p>
                    <p className="truncate text-[10px] font-bold uppercase tracking-widest text-white/30">{isAssisted ? "RETOMAR ENVIO" : s.neighborhood}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      ) : null}

      {homeState.state === "senior-hub" ? (
        <div className="mb-6" onClick={() => void onStationTrack?.("my_submissions") }>
          <MySubmissionsList />
        </div>
      ) : null}

      {homeState.state === "senior-hub" && selectedCity && !isLowPerf ? (
        <div className="mb-6">
          <RecorteActivityWidget city={selectedCity} groupSlug={selectedReadiness?.slug} isReady={selectedReadiness?.status === "ready"} />
        </div>
      ) : null}

      {homeState.state === "operation-normal" && !isHeroCollapsed ? (
        <SectionCard id="mapa-ao-vivo" data-hero-primary="home-map" className="space-y-3 shadow-lg shadow-black/14 xl:p-5">
          <div className="flex items-center gap-3 px-5 xl:px-0">
            <div className="flex w-full items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">Mapa vivo</p>
                <h3 className="mt-1 text-lg font-semibold text-white xl:text-[1.25rem]">Busca, contexto e postos por perto</h3>
              </div>
              <ButtonLink href="/enviar" data-cta-inline="home-send-now" className="relative z-[1001] hidden h-9 whitespace-nowrap px-3.5 text-[11px] font-black uppercase tracking-[0.18em] md:inline-flex">Enviar preço</ButtonLink>
            </div>
          </div>
          {mapStations.length > 0 ? (
            <HomeMapSurface stations={mapStations} contextHref={contextHref} fuelFilter={fuelFilter} center={null} preferListFirst={Boolean(false)} />
          ) : (
            <EmptyStateCard
              title={"Nenhum posto disponível no momento."}
              description={"Ajuste a cidade, o combustível ou a recência para trazer um recorte útil de volta."}
              actionHref="/"
              actionLabel="Limpar recorte"
              className="text-left"
            />
          )}
        </SectionCard>
      ) : null}

      <SectionCard className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-4">
        {[
          { label: "No Recorte", value: mapStations.length, note: "Postos visíveis" },
          { label: "Com Preço", value: stationsWithRecentPrice.length, note: "Recentemente" },
          { label: "Falta Atualizar", value: stationsWithoutRecentPrice, note: "Sem preço recente", tone: "warning" },
          { label: "No Ar 24h", value: recentCount, note: "Últimos envios", tone: "accent" }
        ].map((stat: any) => (
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
          <Badge variant="warning">{fuelFilter === "all" ? "Todos os combustíveis" : fuelLabels[fuelFilter as keyof typeof fuelLabels]}</Badge>
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
            {cheapestNow.map(({ station, report }: any) => (
              <div key={report.id} className="rounded-[18px] border border-white/5 bg-white/5 p-4 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 truncate">{getStationPublicName(station)}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-white">{formatCurrencyBRL(report.price)}</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-white/40">
                  <span className="truncate">{fuelLabels[report.fuelType as keyof typeof fuelLabels]}</span>
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
            {noRecentStations.map((station: any) => (
              <StationCard
                key={station.id}
                station={station}
                fuelFilter={fuelFilter}
                returnToHref={contextHref}
                isStreetMode={isStreetMode}
                isAssisted={isAssisted}
                isUltraClaro={listMode === 'ultra-claro'}
                isAdvanced={listMode === 'avancado'}
                isFavorite={isFavorite(station.id)}
                onFavoriteToggle={() => toggleFavorite(station.id)}
                recordActivity={recordActivity}
                isHeaderSticky={isHeroCollapsed || missionActive}
                isHeaderMicro={false}
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
            orderedStations.map((station: any) => (
              <StationCard
                key={station.id}
                station={station}
                fuelFilter={fuelFilter}
                returnToHref={contextHref}
                isStreetMode={isStreetMode}
                isAssisted={isAssisted}
                isUltraClaro={listMode === 'ultra-claro'}
                isAdvanced={listMode === 'avancado'}
                isFavorite={isFavorite(station.id)}
                onFavoriteToggle={() => toggleFavorite(station.id)}
                recordActivity={recordActivity}
                isHeaderSticky={isHeroCollapsed || missionActive}
                isHeaderMicro={false}
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
            filteredFeed.slice(0, 3).map((report: any) => (
              <div key={report.id} className="flex items-center justify-between rounded-[18px] border border-white/5 bg-white/5 px-4 py-3">
                <div className="min-w-0 pr-4">
                  <p className="truncate text-sm font-medium text-white/80">{getStationPublicName(report.station)}</p>
                  <p className="truncate text-[10px] text-white/30">
                    {report.station.neighborhood} · {fuelLabels[report.fuelType as keyof typeof fuelLabels]}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-white">{formatCurrencyBRL(report.price)}</p>
                  <p className="text-[10px] text-white/30">{formatRecencyLabel(report.reportedAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </>
  );
}


