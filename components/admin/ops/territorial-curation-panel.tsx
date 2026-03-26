"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, EyeOff, PencilLine, CheckCircle2 } from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trackProductEvent } from "@/lib/telemetry/client";
import { updateTerritorialCurationAction } from "@/app/admin/actions";
import type { TerritorialCurationQueueItem, TerritorialCitySummary } from "@/lib/ops/territorial-curation";
import { buildTerritorialCityReport } from "@/lib/ops/territorial-curation";

interface TerritorialCurationPanelProps {
  items: TerritorialCurationQueueItem[];
  citySummaries: TerritorialCitySummary[];
}

function groupByNeighborhood(items: TerritorialCurationQueueItem[]) {
  const groups = new Map<string, TerritorialCurationQueueItem[]>();
  items.forEach((item) => {
    const key = item.station.neighborhood || "Sem bairro";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  });

  return [...groups.entries()]
    .map(([neighborhood, neighborhoodItems]) => ({
      neighborhood,
      items: neighborhoodItems.sort((left, right) => right.priorityScore - left.priorityScore),
      priority: neighborhoodItems.reduce((sum, item) => sum + item.priorityScore, 0)
    }))
    .sort((left, right) => right.priority - left.priority || left.neighborhood.localeCompare(right.neighborhood, "pt-BR"));
}

export function TerritorialCurationPanel({ items, citySummaries }: TerritorialCurationPanelProps) {
  const [, startTransition] = useTransition();
  const [copiedCity, setCopiedCity] = useState<string | null>(null);

  const totalPromotable = useMemo(() => items.filter((item) => item.canPromoteToMap).length, [items]);
  const totalMissingCoords = useMemo(() => items.filter((item) => item.needsCoordinate).length, [items]);
  const totalLowConfidence = useMemo(() => items.filter((item) => item.lowConfidence).length, [items]);

  if (items.length === 0) {
    return null;
  }

  async function copyCityReport(city: string) {
    const report = buildTerritorialCityReport(city, items);
    await navigator.clipboard.writeText(report);
    setCopiedCity(city);
    window.setTimeout(() => setCopiedCity((current) => (current === city ? null : current)), 1200);
    void trackProductEvent({
      eventType: "territorial_city_report_copied" as any,
      pagePath: "/admin/ops/qualidade",
      payload: { city, count: items.filter((item) => item.station.city === city).length }
    });
  }

  function submitTerritorialAction(formData: FormData) {
    startTransition(() => {
      void updateTerritorialCurationAction(formData);
    });
  }

  return (
    <div className="space-y-6">
      <SectionCard className="space-y-4 border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-accent)]">Curadoria territorial assistida</p>
            <h2 className="text-2xl font-semibold text-white">Fila geográfica com promoção segura para o mapa</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-white/58">
              Reduza dependência de revisão solta: priorize sem coordenada, confiança baixa e cidades do beta, e só promova quando o item passar no critério mínimo.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-[18px] border border-white/8 bg-black/25 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Fila</p>
              <p className="mt-1 text-2xl font-semibold text-white">{items.length}</p>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-black/25 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Promovíveis</p>
              <p className="mt-1 text-2xl font-semibold text-white">{totalPromotable}</p>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-black/25 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Sem coord.</p>
              <p className="mt-1 text-2xl font-semibold text-white">{totalMissingCoords}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Confiança baixa</p>
            <p className="mt-2 text-2xl font-semibold text-white">{totalLowConfidence}</p>
          </div>
          <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Critério mínimo</p>
            <p className="mt-2 text-sm text-white/58">Coordenada válida, confiança média/alta e revisão em `ok` para entrar no mapa.</p>
          </div>
          <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Operação</p>
            <p className="mt-2 text-sm text-white/58">Cada lote pode ser fechado por cidade ou bairro e copiar relatório para a equipe de rua.</p>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <SectionCard className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">Fila priorizada</p>
                <h3 className="mt-1 text-xl font-semibold text-white">Postos que precisam de curadoria agora</h3>
              </div>
              <Badge variant="warning">{items.length} itens</Badge>
            </div>

            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.station.id} className="space-y-4 rounded-[22px] border border-white/8 bg-black/25 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-white">{item.publicName}</p>
                        {item.canPromoteToMap ? <Badge variant="accent" className="h-5 px-2 text-[9px]">APTO AO MAPA</Badge> : <Badge variant="warning" className="h-5 px-2 text-[9px]">BLOQUEADO</Badge>}
                      </div>
                      <p className="text-sm text-white/52">
                        {item.station.address}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">
                        {item.station.neighborhood} · {item.station.city}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={item.needsCoordinate ? "danger" : item.lowConfidence ? "warning" : "outline"}>
                        {item.needsCoordinate ? "Sem coordenada" : item.lowConfidence ? "Baixa confiança" : "Revisão leve"}
                      </Badge>
                      <div className="text-right text-[10px] text-white/36">
                        <p>Geo: {item.station.geoSource ?? "manual"}</p>
                        <p>Confiança: {item.station.geoConfidence ?? "low"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-[18px] border border-white/8 bg-black/25 p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Coordenada atual</p>
                      <p className="mt-2 text-sm text-white/74">
                        {item.station.lat && item.station.lng ? `${item.station.lat.toFixed(5)}, ${item.station.lng.toFixed(5)}` : "Ainda não há coordenada"}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-white/8 bg-black/25 p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Critérios</p>
                      <p className="mt-2 text-sm text-white/74">{item.reasons.join(" · ")}</p>
                    </div>
                    <div className="rounded-[18px] border border-white/8 bg-black/25 p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Prioridade</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{item.priorityScore}</p>
                    </div>
                  </div>

                  <form action={updateTerritorialCurationAction} className="grid gap-2 sm:grid-cols-3">
                    <input type="hidden" name="stationId" value={item.station.id} />
                    <input type="hidden" name="curationNote" value={item.reasons.join(" · ")} />
                    <input type="hidden" name="geoReviewStatus" value={item.canPromoteToMap ? "ok" : "manual_review"} />
                    <input type="hidden" name="visibilityStatus" value={item.canPromoteToMap ? "public" : "review"} />
                    <input type="hidden" name="geoConfidence" value={item.canPromoteToMap ? item.station.geoConfidence ?? "medium" : item.station.geoConfidence ?? "low"} />
                    <input type="hidden" name="geoSource" value={item.station.geoSource ?? "manual"} />

                    <Button
                      type="submit"
                      name="decision"
                      value="approve"
                      disabled={!item.canPromoteToMap}
                      onClick={() => {
                        void trackProductEvent({
                          eventType: "territorial_curation_item_action" as any,
                          pagePath: "/admin/ops/qualidade",
                          payload: { action: "approve", stationId: item.station.id, city: item.station.city }
                        });
                      }}
                      className="h-11 text-xs font-black uppercase tracking-[0.18em]"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Promover para mapa
                    </Button>

                    <Button
                      type="submit"
                      name="decision"
                      value="adjust"
                      variant="secondary"
                      className="h-11 text-xs font-black uppercase tracking-[0.18em]"
                      onClick={() => {
                        void trackProductEvent({
                          eventType: "territorial_curation_item_action" as any,
                          pagePath: "/admin/ops/qualidade",
                          payload: { action: "adjust", stationId: item.station.id, city: item.station.city }
                        });
                      }}
                    >
                      <PencilLine className="h-4 w-4" />
                      Ajustar
                    </Button>

                    <Button
                      type="submit"
                      name="decision"
                      value="hide"
                      variant="secondary"
                      className="h-11 text-xs font-black uppercase tracking-[0.18em] text-red-300 hover:bg-red-500/10"
                      onClick={() => {
                        void trackProductEvent({
                          eventType: "territorial_curation_item_action" as any,
                          pagePath: "/admin/ops/qualidade",
                          payload: { action: "hide", stationId: item.station.id, city: item.station.city }
                        });
                      }}
                    >
                      <EyeOff className="h-4 w-4" />
                      Manter oculto
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-4">
          <SectionCard className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">Resumo por cidade</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Operação em lote</h3>
              </div>
              <Badge variant="outline">{citySummaries.length} cidades</Badge>
            </div>

            <div className="space-y-3">
              {citySummaries.map((summary) => {
                const cityItems = items.filter((item) => item.station.city === summary.city);
                const neighborhoods = groupByNeighborhood(cityItems);
                return (
                  <div key={summary.city} className="space-y-3 rounded-[22px] border border-white/8 bg-black/25 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">{summary.city}</p>
                        <p className="text-xs text-white/44">{summary.total} na fila · {summary.promotable} promovíveis</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 px-3 text-[10px] font-black uppercase tracking-[0.18em]"
                          onClick={() => void copyCityReport(summary.city)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {copiedCity === summary.city ? "Copiado" : "Copiar"}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] text-white/44">
                      <div className="rounded-[16px] border border-white/8 bg-white/5 px-3 py-2">Sem coord.: {summary.needsCoordinate}</div>
                      <div className="rounded-[16px] border border-white/8 bg-white/5 px-3 py-2">Baixa conf.: {summary.lowConfidence}</div>
                      <div className="rounded-[16px] border border-white/8 bg-white/5 px-3 py-2">Ocultos: {summary.hidden}</div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <form action={updateTerritorialCurationAction}>
                        <input type="hidden" name="stationIds" value={cityItems.map((item) => item.station.id).join(",")} />
                        <Button
                          type="submit"
                          name="decision"
                          value="approve"
                          disabled={cityItems.every((item) => !item.canPromoteToMap)}
                          className="h-9 w-full text-[10px] font-black uppercase tracking-[0.18em]"
                          onClick={() => {
                            void trackProductEvent({
                              eventType: "territorial_curation_item_action" as any,
                              pagePath: "/admin/ops/qualidade",
                              payload: { action: "approve_city", city: summary.city, count: cityItems.length }
                            });
                          }}
                        >
                          Promover cidade
                        </Button>
                      </form>
                      <form action={updateTerritorialCurationAction}>
                        <input type="hidden" name="stationIds" value={cityItems.map((item) => item.station.id).join(",")} />
                        <Button
                          type="submit"
                          name="decision"
                          value="hide"
                          variant="secondary"
                          className="h-9 w-full text-[10px] font-black uppercase tracking-[0.18em]"
                          onClick={() => {
                            void trackProductEvent({
                              eventType: "territorial_curation_item_action" as any,
                              pagePath: "/admin/ops/qualidade",
                              payload: { action: "hide_city", city: summary.city, count: cityItems.length }
                            });
                          }}
                        >
                          Ocultar cidade
                        </Button>
                      </form>
                    </div>

                    <div className="space-y-2">
                      {neighborhoods.map((neighborhoodGroup) => (
                        <div key={neighborhoodGroup.neighborhood} className="rounded-[18px] border border-white/8 bg-white/5 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-white">{neighborhoodGroup.neighborhood}</p>
                              <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">{neighborhoodGroup.items.length} postos</p>
                            </div>
                            <Badge variant="outline">{neighborhoodGroup.priority}</Badge>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <form action={updateTerritorialCurationAction} className="flex-1">
                              <input type="hidden" name="stationIds" value={neighborhoodGroup.items.map((item) => item.station.id).join(",")} />
                              <Button type="submit" name="decision" value="approve" disabled={neighborhoodGroup.items.every((item) => !item.canPromoteToMap)} className="h-9 w-full text-[10px] font-black uppercase tracking-[0.18em]">
                                Promover lote
                              </Button>
                            </form>
                            <form action={updateTerritorialCurationAction} className="flex-1">
                              <input type="hidden" name="stationIds" value={neighborhoodGroup.items.map((item) => item.station.id).join(",")} />
                              <Button type="submit" name="decision" value="hide" variant="secondary" className="h-9 w-full text-[10px] font-black uppercase tracking-[0.18em]">
                                Ocultar lote
                              </Button>
                            </form>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

