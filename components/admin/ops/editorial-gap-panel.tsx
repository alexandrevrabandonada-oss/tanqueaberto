"use client";

import { useMemo, useState } from "react";
import { Copy, Download, MapPinned, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import type { EditorialGapDashboard, EditorialGapItem } from "@/lib/ops/editorial-gaps";
import { cn } from "@/lib/utils";

interface EditorialGapPanelProps {
  data: EditorialGapDashboard;
  className?: string;
}

function resolveVariant(recommendation: EditorialGapItem["recommendation"]) {
  if (recommendation === "vale pedir coleta já") return "danger";
  if (recommendation === "pode esperar") return "warning";
  return "outline";
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function EditorialGapPanel({ data, className }: EditorialGapPanelProps) {
  const [copied, setCopied] = useState(false);
  const topCities = useMemo(() => data.cityRows.slice(0, 3), [data.cityRows]);

  async function copySummary() {
    await navigator.clipboard.writeText(data.summary.copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <SectionCard className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Lacunas editoriais</p>
          <h2 className="mt-1 text-xl font-semibold text-white">O que está mais feio e o que vale atacar amanhã</h2>
          <p className="mt-1 text-sm text-white/58">Leitura rápida por cidade, bairro, grupo e combustível para orientar coleta sem abrir BI pesado.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="warning">{countLabel(data.summary.topGapCount, "lacuna")}</Badge>
          <Badge variant="outline">{countLabel(data.summary.urgent, "urgente")}</Badge>
          <Badge variant="outline">{countLabel(data.summary.review, "revisão")}</Badge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[20px] border border-white/8 bg-black/24 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Vale pedir coleta já</p>
          <p className="mt-2 text-3xl font-semibold text-white">{data.summary.urgent}</p>
          <p className="mt-1 text-sm text-white/56">Lacunas com prioridade de rua.</p>
        </div>
        <div className="rounded-[20px] border border-white/8 bg-black/24 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Pode esperar</p>
          <p className="mt-2 text-3xl font-semibold text-white">{data.summary.wait}</p>
          <p className="mt-1 text-sm text-white/56">Segue no radar, sem pressão imediata.</p>
        </div>
        <div className="rounded-[20px] border border-white/8 bg-black/24 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Revisar base primeiro</p>
          <p className="mt-2 text-3xl font-semibold text-white">{data.summary.review}</p>
          <p className="mt-1 text-sm text-white/56">Casos em que a base ainda está fraca.</p>
        </div>
        <div className="rounded-[20px] border border-white/8 bg-black/24 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Convites por cidade</p>
          <p className="mt-2 text-3xl font-semibold text-white">{data.inviteTargets.length}</p>
          <p className="mt-1 text-sm text-white/56">Lotes sugeridos para testers prioritários.</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-[22px] border border-white/8 bg-black/28 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Resumo acionável</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Top 10 lacunas</h3>
            </div>
            <Badge variant="warning">{data.items.length} itens</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {data.items.map((item, index) => (
              <div key={item.id} className="rounded-[20px] border border-white/8 bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm uppercase tracking-[0.2em] text-white/40">#{index + 1} · {item.scopeType}</p>
                    <h4 className="truncate text-base font-semibold text-white">{item.scopeLabel}</h4>
                    <p className="mt-1 text-sm text-white/54">{item.city}{item.neighborhood ? ` · ${item.neighborhood}` : ""}{item.groupName ? ` · ${item.groupName}` : ""}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={resolveVariant(item.recommendation)}>{item.recommendation}</Badge>
                    <span className="text-2xl font-semibold text-white">{item.score}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/58">
                  <Badge variant="outline">{item.visibleStations} visíveis</Badge>
                  <Badge variant="outline">{item.recentPriceStations} com preço recente</Badge>
                  <Badge variant="outline">{item.missingPriceStations} sem preço</Badge>
                  <Badge variant="outline">Lacuna {Math.round(item.gapDensity * 100)}%</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.reasons.slice(0, 3).map((reason) => (
                    <Badge key={reason} variant="outline">{reason}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[22px] border border-white/8 bg-black/28 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">Resumo diário</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Leitura rápida para reunião</h3>
              </div>
              <Sparkles className="h-4 w-4 text-white/42" />
            </div>
            <div className="mt-3 space-y-2 text-sm text-white/66">
              <p>{data.repeatedFeedback[0] ? `Feedback mais repetido: ${data.repeatedFeedback[0].label} (${data.repeatedFeedback[0].count})` : "Sem feedback repetido relevante hoje."}</p>
              <p>{data.topErrors[0] ? `Erro mais repetido: ${data.topErrors[0].label} (${data.topErrors[0].count})` : "Sem erro recorrente forte hoje."}</p>
              <p>{data.improvedCities[0] ? `Melhorando: ${data.improvedCities[0].city} (+${data.improvedCities[0].delta})` : "Sem cidade claramente melhorando hoje."}</p>
              <p>{data.worsenedCities[0] ? `Piorando: ${data.worsenedCities[0].city} (${data.worsenedCities[0].delta})` : "Sem cidade claramente piorando hoje."}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => void copySummary()}>
                <Copy className="h-4 w-4" />
                {copied ? "Resumo copiado" : "Copiar resumo"}
              </Button>
              <ButtonLink href="/admin/ops/export?kind=gaps" variant="ghost">
                <Download className="h-4 w-4" />
                CSV lacunas
              </ButtonLink>
            </div>
          </div>

          <div className="rounded-[22px] border border-white/8 bg-black/28 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Lotes sugeridos</p>
              <Badge variant="outline">{data.inviteTargets.length}</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {data.inviteTargets.length === 0 ? (
                <p className="text-sm text-white/56">Sem cidade com prioridade forte agora.</p>
              ) : (
                data.inviteTargets.map((item) => (
                  <div key={item.city} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-white">{item.city}</span>
                      <Badge variant="warning">{item.score}</Badge>
                    </div>
                    <p className="mt-1 text-white/54">{item.reason}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/8 bg-black/28 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Feedback repetido</p>
              <div className="mt-3 space-y-2">
                {data.repeatedFeedback.slice(0, 5).map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-2 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2 text-sm">
                    <span className="text-white/74">{item.label}</span>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-black/28 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Erros recorrentes</p>
              <div className="mt-3 space-y-2">
                {data.topErrors.slice(0, 5).map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-2 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2 text-sm">
                    <span className="text-white/74">{item.label}</span>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/8 bg-black/28 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">Melhoraram</p>
                <MapPinned className="h-4 w-4 text-white/42" />
              </div>
              <div className="mt-3 space-y-2">
                {data.improvedCities.length === 0 ? (
                  <p className="text-sm text-white/56">Sem alta clara nesta janela.</p>
                ) : (
                  data.improvedCities.map((item) => (
                    <div key={item.city} className="flex items-center justify-between gap-2 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2 text-sm">
                      <span className="text-white/74">{item.city}</span>
                      <Badge variant="default">+{item.delta}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-black/28 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">Pioraram</p>
                <MapPinned className="h-4 w-4 text-white/42" />
              </div>
              <div className="mt-3 space-y-2">
                {data.worsenedCities.length === 0 ? (
                  <p className="text-sm text-white/56">Sem queda clara nesta janela.</p>
                ) : (
                  data.worsenedCities.map((item) => (
                    <div key={item.city} className="flex items-center justify-between gap-2 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2 text-sm">
                      <span className="text-white/74">{item.city}</span>
                      <Badge variant="danger">{item.delta}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-white/8 bg-black/28 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Ponte com convites</p>
            <p className="mt-2 text-sm text-white/56">Use esses lotes como base para chamar testers onde a cobertura ainda pede mais coleta.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {topCities.map((item) => (
                <Badge key={item.id} variant="outline">
                  {item.city} · {item.recommendation}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

