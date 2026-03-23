import Image from "next/image";
import { notFound } from "next/navigation";
import type { Route } from "next";
import { ArrowLeft, ArrowRight, Camera, Clock3, MapPinned } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { ProductEvent } from "@/components/telemetry/product-event";
import { PriceTable } from "@/components/station/price-table";
import { RememberStationVisit } from "@/components/navigation/remember-station";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { HistoryChart } from "@/components/audit/history-chart";
import { getStationDetail } from "@/lib/data";
import { getStationAuditDetail } from "@/lib/audit/queries";
import { getStationMarketPresence, getStationMarketPresenceLabel, getStationPublicName, hasPendingStationLocationReview } from "@/lib/quality/stations";
import { trackProductEvent } from "@/lib/telemetry/client";
import { fuelLabels } from "@/lib/format/labels";
import { formatDateTimeBR, formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { formatCurrencyBRL } from "@/lib/format/currency";
import type { FuelType } from "@/lib/types";

export const dynamic = "force-dynamic";

interface StationPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function parseFuel(value: string | string[] | undefined): FuelType {
  const allowed: FuelType[] = ["gasolina_comum", "gasolina_aditivada", "etanol", "diesel_s10", "diesel_comum", "gnv"];
  const candidate = Array.isArray(value) ? value[0] : value;
  return allowed.includes(candidate as FuelType) ? (candidate as FuelType) : "gasolina_comum";
}

function parseDays(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value ?? "30");
  return parsed === 7 || parsed === 30 || parsed === 90 ? parsed : 30;
}

function safeReturnTo(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value ?? "";
  return candidate.startsWith("/") ? candidate : "/";
}

function formatTrend(previous: number, current: number) {
  const delta = current - previous;
  const absolute = formatCurrencyBRL(Math.abs(delta));

  if (Math.abs(delta) < 0.005) {
    return "Sem variação";
  }

  return delta > 0 ? `Subiu ${absolute}` : `Caiu ${absolute}`;
}

export default async function StationPage({ params, searchParams }: StationPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const selectedFuel = parseFuel(query.fuel);
  const selectedDays = parseDays(query.days);
  const returnToHref = safeReturnTo(query.returnTo);
  const [station, audit] = await Promise.all([getStationDetail(id), getStationAuditDetail(id, selectedFuel, selectedDays)]);

  if (!station || !audit) {
    notFound();
  }

  const latest = station.latestReports[0];
  const marketPresence = getStationMarketPresence(station);
  const stationAuditHref = (`/auditoria/posto/${id}?fuel=${selectedFuel}&days=${selectedDays}` as Route);
  const sendPriceHref = (`/enviar?stationId=${id}&fuel=${selectedFuel}&returnTo=${encodeURIComponent(returnToHref)}#photo` as Route);
  const backHref = returnToHref as Route;

  return (
    <AppShell>
      <ProductEvent eventType="station_opened" pagePath={"/postos/" + id} pageTitle={getStationPublicName(station)} stationId={id} city={station.city} fuelType={latest?.fuelType ?? null} scopeType="station" scopeId={id} />
      <RememberStationVisit stationId={id} stationName={getStationPublicName(station)} city={station.city} />
      <SectionCard className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={backHref} variant="secondary">
                <ArrowLeft className="h-4 w-4" /> Voltar ao mapa
              </ButtonLink>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/42">{station.brand}</p>
            <h2 className="mt-2 text-[1.9rem] font-semibold leading-none text-white">{getStationPublicName(station)}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">Posto cadastrado</Badge>
              <Badge variant={marketPresence === "recent" ? "default" : "outline"}>{getStationMarketPresenceLabel(station)}</Badge>
              {hasPendingStationLocationReview(station) && !latest ? <Badge variant="warning">Localização em revisão</Badge> : null}
            </div>
          </div>
          <div className="text-right">
            {latest ? <Badge variant={recencyToneToBadgeVariant(getRecencyTone(latest.reportedAt))}>{formatRecencyLabel(latest.reportedAt)}</Badge> : <Badge variant="outline">Sem atualização recente</Badge>}
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/42">
              {station.neighborhood}, {station.city}
            </p>
          </div>
        </div>
        <div className="space-y-3 text-sm text-white/62">
          <div className="flex items-center gap-2">
            <MapPinned className="h-4 w-4 text-[color:var(--color-accent)]" />
            {station.address}, {station.neighborhood}, {station.city}
          </div>
          {latest ? (
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-[color:var(--color-accent)]" />
              Última atualização em {formatDateTimeBR(latest.reportedAt)}
            </div>
          ) : (
            <div className="rounded-[18px] border border-white/8 bg-black/25 px-4 py-3 text-sm text-white/58">
              Este posto já está cadastrado no território, mas ainda não tem preço recente aprovado.
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ButtonLink
            href={sendPriceHref}
            className="w-full"
            onClick={() => {
              void trackProductEvent({
                eventType: "camera_opened_from_station",
                pagePath: sendPriceHref,
                pageTitle: getStationPublicName(station),
                stationId: station.id,
                city: station.city,
                fuelType: selectedFuel,
                scopeType: "submission",
                scopeId: station.id,
                payload: { source: "station-page-top", compactMode: true }
              });
            }}
          >
            Abrir câmera
            <Camera className="h-4 w-4" />
          </ButtonLink>
          <ButtonLink href="/postos/sem-atualizacao" variant="secondary" className="w-full">
            Ver lacunas do mapa
          </ButtonLink>
        </div>
        {latest ? <div className="overflow-hidden rounded-[24px] border border-white/8 bg-black/30"><Image src={latest.photoUrl} alt={`Foto recente de ${getStationPublicName(station)}`} width={1280} height={720} className="h-56 w-full object-cover" /></div> : null}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Preço recente por combustível</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Resumo rápido</h3>
          </div>
          <Badge variant="warning">{station.latestReports.length} faixas ativas</Badge>
        </div>
        {station.latestReports.length === 0 ? (
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">
            Sem preços recentes aprovados para este posto. O cadastro existe, mas a série ainda está em formação. Se puder, envie a primeira foto.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {station.latestReports.map((report) => {
              const previous = station.recentReports.find((item) => item.fuelType === report.fuelType && item.id !== report.id);

              return (
                <div key={report.id} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{fuelLabels[report.fuelType]}</p>
                      <p className="text-xs text-white/46">{formatRecencyLabel(report.reportedAt)}</p>
                    </div>
                    <p className="text-lg font-semibold text-white">{formatCurrencyBRL(report.price)}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-white/56">
                    <Camera className="h-3.5 w-3.5 text-[color:var(--color-accent)]" />
                    {previous ? formatTrend(previous.price, report.price) : "Primeiro preço desta faixa"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Histórico longo</p>
            <h3 className="mt-1 text-xl font-semibold text-white">
              {fuelLabels[selectedFuel]} · {selectedDays} dias
            </h3>
          </div>
          <ButtonLink href={stationAuditHref} variant="secondary">
            Abrir auditoria
          </ButtonLink>
        </div>
        <HistoryChart series={audit.series} />
      </SectionCard>

      <SectionCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Indicadores públicos</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Padrões e indícios</h3>
        </div>
        {audit.alerts.length === 0 ? (
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">Sem alertas relevantes neste recorte.</div>
        ) : (
          <div className="space-y-3">
            {audit.alerts.map((alert) => (
              <div key={`${alert.kind}-${alert.stationId ?? alert.city ?? alert.title}`} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                <p className="text-base font-semibold text-white">{alert.title}</p>
                <p className="mt-1 text-sm text-white/58">{alert.description}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Recente validado</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Linha do tempo</h3>
        </div>
        {station.recentReports.length === 0 ? <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">Sem atualização recente para este posto. O cadastro continua visível no mapa.</div> : <PriceTable reports={station.recentReports} />}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Fotos recentes</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Evidências do envio</h3>
        </div>
        {audit.recentReports.length === 0 ? (
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">Ainda não há histórico longo suficiente.</div>
        ) : (
          <div className="space-y-3">
            {audit.recentReports.map((report) => (
              <div key={report.id} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{fuelLabels[report.fuelType]}</p>
                    <p className="text-sm text-white/50">{report.reporterNickname ?? "anônimo"} · {formatRecencyLabel(report.reportedAt)}</p>
                  </div>
                  <Badge variant={recencyToneToBadgeVariant(getRecencyTone(report.reportedAt))}>{formatRecencyLabel(report.reportedAt)}</Badge>
                </div>
                <div className="mt-3 text-xs text-white/46">{formatDateTimeBR(report.reportedAt)} · {report.sourceKind}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-3 sm:grid-cols-2">
        <ButtonLink href={sendPriceHref} className="w-full justify-center py-4">
          Enviar novo preço para este posto
          <ArrowRight className="h-4 w-4" />
        </ButtonLink>
        <ButtonLink href={backHref} variant="secondary" className="w-full justify-center py-4">
          Voltar ao mapa
        </ButtonLink>
      </div>
    </AppShell>
  );
}








