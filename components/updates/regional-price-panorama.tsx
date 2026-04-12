import type { Route } from "next";
import { ArrowUpRight, Layers3, Radar, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { fuelLabels, publicFuelFilters } from "@/lib/format/labels";
import { formatDateTimeBR, formatRecencyLabel } from "@/lib/format/time";
import type { FuelType } from "@/lib/types";
import type { PanoramaRow, RegionalPricePanorama } from "@/lib/panorama/regional-prices";

interface RegionalPricePanoramaProps {
  panorama: RegionalPricePanorama;
}

function readScopeLabel(row: PanoramaRow) {
  if (row.scope === "region") return row.label;
  if (row.scope === "city") return `${row.label} · ${row.regionLabel}`;
  return `${row.label} · ${row.cityLabel}`;
}

function readScopeSupport(row: PanoramaRow) {
  if (row.scope === "region") return "Leitura ampla do eixo funcional.";
  if (row.scope === "city") return "Cidade dentro do recorte regional atual.";
  return "Bairro comparado contra sua região funcional.";
}

function buildFuelHref(fuelType: FuelType) {
  return `/atualizacoes/panorama?fuel=${fuelType}` as Route;
}

function buildStationHref(stationId: string, fuelType: FuelType) {
  return `/postos/${stationId}?fuel=${fuelType}` as Route;
}

function PanoramaRowCard({ row, fuelType }: { row: PanoramaRow; fuelType: FuelType }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">{row.scope}</p>
          <h3 className="mt-1 text-base font-semibold text-white">{readScopeLabel(row)}</h3>
          <p className="mt-1 text-sm text-white/48">{readScopeSupport(row)}</p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-2xl font-black tracking-tight text-white">{formatCurrencyBRL(row.minPrice)}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">menor preço</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Media</p>
          <p className="mt-1 text-sm font-semibold text-white">{formatCurrencyBRL(row.averagePrice)}</p>
        </div>
        <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Faixa</p>
          <p className="mt-1 text-sm font-semibold text-white">{formatCurrencyBRL(row.priceRange)}</p>
        </div>
        <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Leituras</p>
          <p className="mt-1 text-sm font-semibold text-white">{row.sampleSize}</p>
        </div>
        <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Base mais nova</p>
          <p className="mt-1 text-sm font-semibold text-white">{formatRecencyLabel(row.newestReportedAt)}</p>
        </div>
        <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Base mais velha</p>
          <p className="mt-1 text-sm font-semibold text-white">{formatRecencyLabel(row.oldestReportedAt)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {row.signals.length > 0 ? row.signals.map((signal) => (
          <Badge key={`${row.key}-${signal.kind}`} variant={signal.variant} className="text-[10px]">
            {signal.label}
          </Badge>
        )) : <Badge variant="secondary" className="text-[10px]">Sem sinal relevante agora</Badge>}
      </div>

      <div className="mt-3 rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Leitura prudente</p>
        <p className="mt-1 text-sm text-white/56">
          {row.signals[0]?.detail ?? "Não há padrão territorial forte o suficiente para chamar atenção neste recorte agora."}
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Ponto mais barato deste recorte</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">{row.cheapestStation.name}</p>
          <p className="text-xs text-white/46">
            {[row.cheapestStation.neighborhood, row.cheapestStation.city].filter(Boolean).join(" · ")} · {formatRecencyLabel(row.cheapestStation.reportedAt)}
          </p>
        </div>
        <ButtonLink href={buildStationHref(row.cheapestStation.id, fuelType)} variant="secondary" className="min-h-10 justify-center px-4 text-[10px] font-black uppercase tracking-[0.16em]">
          Ver posto
        </ButtonLink>
      </div>
    </div>
  );
}

function ScopeSection({ title, eyebrow, description, rows, fuelType }: { title: string; eyebrow: string; description: string; rows: PanoramaRow[]; fuelType: FuelType }) {
  return (
    <SectionCard className="space-y-4 xl:p-4">
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/34">{eyebrow}</p>
        <h2 className="text-[1.55rem] font-semibold leading-none text-white xl:text-[1.35rem]">{title}</h2>
        <p className="text-sm text-white/56 xl:text-[13px]">{description}</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[22px] border border-white/8 bg-black/25 px-4 py-5 text-sm text-white/56">
          Ainda não existe base recente suficiente para abrir este recorte com prudência.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => <PanoramaRowCard key={row.key} row={row} fuelType={fuelType} />)}
        </div>
      )}
    </SectionCard>
  );
}

export function RegionalPricePanoramaView({ panorama }: RegionalPricePanoramaProps) {
  const visibleFuelFilters = publicFuelFilters.filter((item): item is { value: FuelType; label: string } => item.value !== "all");

  return (
    <div className="space-y-4">
      <SectionCard className="space-y-4 xl:p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/34">Atualizações &gt; panorama regional</p>
            <h1 className="text-[1.9rem] font-semibold leading-none text-white xl:text-[1.6rem]">Menores preços por região, cidade e bairro</h1>
            <p className="max-w-3xl text-sm leading-relaxed text-white/56 xl:text-[13px]">
              A home continua resolvendo decisão rápida pessoal. Aqui a leitura é territorial: menor preço, média, faixa, volume de leituras e sinais prudentes de concentração ou sincronia.
            </p>
          </div>
          <Badge variant="accent" className="self-start text-[10px]">{fuelLabels[panorama.fuelType]}</Badge>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {visibleFuelFilters.map((item) => (
            <a
              key={item.value}
              href={buildFuelHref(item.value)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                panorama.fuelType === item.value
                  ? "bg-[color:var(--color-accent)] text-black"
                  : "border border-white/10 bg-white/5 text-white/66"
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/34">
              <Layers3 className="h-4 w-4 text-[color:var(--color-accent)]" />
              Regiões
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{panorama.regionalRows.length}</p>
            <p className="mt-1 text-sm text-white/48">Recortes regionais com base recente.</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/34">
              <Radar className="h-4 w-4 text-[color:var(--color-accent)]" />
              Leituras
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{panorama.totalReadings}</p>
            <p className="mt-1 text-sm text-white/48">Base recente ativa neste combustível.</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/34">
              <ShieldAlert className="h-4 w-4 text-[color:var(--color-accent)]" />
              Sinais
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{panorama.suspiciousSignals}</p>
            <p className="mt-1 text-sm text-white/48">Padrões públicos que merecem acompanhamento.</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/34">
              <ArrowUpRight className="h-4 w-4 text-[color:var(--color-accent)]" />
              Base
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{formatDateTimeBR(panorama.generatedAt)}</p>
            <p className="mt-1 text-sm text-white/48">Gerado com a fotografia pública mais recente.</p>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white/56">
          A linguagem aqui é prudente por desenho. O produto aponta suspeita, concentração e sincronia quando há padrão estatístico simples, mas não afirma cartel automaticamente.
        </div>
      </SectionCard>

      <ScopeSection
        eyebrow="Região"
        title="Melhor preço da região"
        description="Visão ampla do eixo funcional ou do agrupamento territorial equivalente. Boa para entender o piso regional sem confundir isso com a melhor ida pessoal."
        rows={panorama.regionalRows.slice(0, 6)}
        fuelType={panorama.fuelType}
      />

      <ScopeSection
        eyebrow="Cidade"
        title="Cidades dentro do panorama"
        description="Comparação por município para enxergar quem está segurando preço melhor e quem está cobrando acima da média do eixo regional."
        rows={panorama.cityRows.slice(0, 8)}
        fuelType={panorama.fuelType}
      />

      <ScopeSection
        eyebrow="Bairro"
        title="Bairros com base suficiente"
        description="Leitura territorial fina para ver onde o preço abre, fecha ou fica concentrado demais dentro da malha urbana."
        rows={panorama.neighborhoodRows.slice(0, 10)}
        fuelType={panorama.fuelType}
      />
    </div>
  );
}
