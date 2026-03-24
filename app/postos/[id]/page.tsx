import Image from "next/image";
import { notFound } from "next/navigation";
import type { Route } from "next";
import { ArrowLeft, ArrowRight, Camera, Clock3, MapPinned, Share2, ShieldCheck, History, Info } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { ProductEvent } from "@/components/telemetry/product-event";
import { PriceTable } from "@/components/station/price-table";
import { RememberStationVisit } from "@/components/navigation/remember-station";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { HistoryChart } from "@/components/audit/history-chart";
import { Metadata } from "next";
import { getStationDetail } from "@/lib/data";
import { getStationAuditDetail } from "@/lib/audit/queries";
import { getKillSwitches } from "@/lib/ops/kill-switches";
import { 
  getStationMarketPresence, 
  getStationMarketPresenceLabel, 
  getStationPublicName, 
  hasPendingStationLocationReview,
  getStationStatus,
  getStationStatusLabel
} from "@/lib/quality/stations";
import { trackProductEvent } from "@/lib/telemetry/client";
import { fuelLabels } from "@/lib/format/labels";
import { formatDateTimeBR, formatRecencyLabel, getRecencyTone, recencyToneToBadgeVariant } from "@/lib/format/time";
import { formatCurrencyBRL } from "@/lib/format/currency";
import type { FuelType, PriceReport } from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const station = await getStationDetail(id);
  
  if (!station) {
    return { title: "Posto não encontrado | Bomba Aberta" };
  }

  const name = getStationPublicName(station);
  const latest = station.latestReports[0];
  const priceLabel = latest ? ` | ${formatCurrencyBRL(latest.price)} (${fuelLabels[latest.fuelType]})` : "";

  return {
    title: `${name}${priceLabel} | Bomba Aberta`,
    description: `Veja preços reais, prova de vida e histórico de ${name} em ${station.neighborhood}, ${station.city}. Dados validados pela comunidade.`,
    openGraph: {
      title: `${name}${priceLabel}`,
      description: `Preço real e prova de vida em ${station.neighborhood}, ${station.city}.`,
      images: latest ? [latest.photoUrl] : [],
    }
  };
}

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

function ShareButton({ id, name, city }: { id: string, name: string, city: string }) {
  const handleShare = async () => {
    const shareData = {
      title: `${name} | Bomba Aberta`,
      text: `Confira preços reais e prova de vida do posto ${name} em ${city}.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        void trackProductEvent({
          eventType: "station_page_shared",
          pagePath: window.location.pathname,
          pageTitle: document.title,
          stationId: id,
          payload: { method: "native" }
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copiado para a área de transferência!");
        void trackProductEvent({
          eventType: "station_page_shared",
          pagePath: window.location.pathname,
          pageTitle: document.title,
          stationId: id,
          payload: { method: "clipboard" }
        });
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  return (
    <Button variant="secondary" onClick={handleShare} className="gap-2">
      <Share2 className="h-4 w-4" />
      Compartilhar
    </Button>
  );
}

export default async function StationPage({ params, searchParams }: StationPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const selectedFuel = parseFuel(query.fuel);
  const selectedDays = parseDays(query.days);
  const returnToHref = safeReturnTo(query.returnTo);
  const [station, audit, killSwitches] = await Promise.all([
    getStationDetail(id), 
    getStationAuditDetail(id, selectedFuel, selectedDays),
    getKillSwitches()
  ]);

  if (!station || !audit) {
    notFound();
  }

  const latest = station.latestReports[0];
  const stationStatus = getStationStatus(station);
  const stationAuditHref = (`/auditoria/posto/${id}?fuel=${selectedFuel}&days=${selectedDays}` as Route);
  const sendPriceHref = (`/enviar?stationId=${id}&fuel=${selectedFuel}&returnTo=${encodeURIComponent(returnToHref)}#photo` as Route);
  const backHref = returnToHref as Route;
  const publicName = getStationPublicName(station);

  return (
    <AppShell killSwitches={killSwitches}>
      <ProductEvent 
        eventType="station_opened" 
        pagePath={"/postos/" + id} 
        pageTitle={publicName} 
        stationId={id} 
        city={station.city} 
        fuelType={latest?.fuelType ?? null} 
        scopeType="station" 
        scopeId={id} 
      />
      <RememberStationVisit stationId={id} stationName={publicName} city={station.city} />
      
      <SectionCard className="space-y-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <ButtonLink href={backHref} variant="secondary" className="h-9 px-3">
              <ArrowLeft className="h-4 w-4" /> Voltar ao mapa
            </ButtonLink>
            <ShareButton id={id} name={publicName} city={station.city} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
               <Badge 
                 variant={stationStatus === "active" ? "default" : stationStatus === "stale" ? "warning" : "outline"}
                 className="uppercase tracking-widest text-[9px]"
               >
                 {getStationStatusLabel(stationStatus)}
               </Badge>
               {hasPendingStationLocationReview(station) && (
                 <Badge variant="outline" className="text-orange-400 border-orange-400/20 text-[9px] uppercase tracking-widest">
                   Localização sob revisão
                 </Badge>
               )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white leading-tight">
              {publicName}
            </h1>
            <div className="flex items-center gap-2 text-white/44 text-sm">
              <MapPinned className="h-4 w-4 text-[color:var(--color-accent)]" />
              <span>{station.neighborhood}, {station.city}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ButtonLink
            href={sendPriceHref}
            className="w-full bg-[color:var(--color-accent)] text-black font-bold h-12"
            onClick={() => {
              void trackProductEvent({
                eventType: "camera_opened_from_station",
                pagePath: sendPriceHref,
                pageTitle: publicName,
                stationId: station.id,
                city: station.city,
                fuelType: selectedFuel,
                payload: { source: "station-page-hero" }
              });
            }}
          >
            <Camera className="h-5 w-5" />
            ATUALIZAR PREÇO AGORA
          </ButtonLink>
          <ButtonLink href="/postos/sem-atualizacao" variant="secondary" className="w-full h-12">
            <Info className="h-4 w-4" /> Ver lacunas do mapa
          </ButtonLink>
        </div>
      </SectionCard>

      {/* Proof of Life / Main Evidence */}
      {latest ? (
        <SectionCard className="p-0 overflow-hidden border-white/10 group">
          <div className="relative aspect-video w-full">
            <Image 
              src={latest.photoUrl} 
              alt={`Prova de vida: ${publicName}`} 
              fill
              className="object-cover transition duration-700 group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">Última Prova de Vida</p>
                <p className="text-lg font-bold text-white">{formatCurrencyBRL(latest.price)} · {fuelLabels[latest.fuelType]}</p>
                <p className="text-xs text-white/40">{formatRecencyLabel(latest.reportedAt)} por {latest.reporterNickname || "colaborador"}</p>
              </div>
              <Badge variant="secondary" className="bg-black/40 backdrop-blur-md border-white/10">
                 Confiança Alta
              </Badge>
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard className="border-dashed border-white/10 bg-white/5 py-8 text-center">
            <Camera className="h-10 w-10 text-white/20 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white/80">Aguardando primeira evidência</h3>
            <p className="text-sm text-white/40 mt-1 max-w-[240px] mx-auto">
              Este posto ainda não tem uma série histórica validada por fotos. Seja o primeiro!
            </p>
        </SectionCard>
      )}

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Preços Atuais</h3>
          </div>
          <Badge variant="outline" className="text-[10px]">{station.latestReports.length} Faixas</Badge>
        </div>
        
        {station.latestReports.length === 0 ? (
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-6 text-center text-sm text-white/40 italic">
            Nenhum preço recente aprovado.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {station.latestReports.map((report) => {
              const previous = station.recentReports.find((item) => item.fuelType === report.fuelType && item.id !== report.id);
              return (
                <div key={report.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4 transition hover:bg-white/8">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/30">{fuelLabels[report.fuelType]}</p>
                    <p className="text-2xl font-black text-white">{formatCurrencyBRL(report.price)}</p>
                    <p className="text-[10px] text-white/40">{formatRecencyLabel(report.reportedAt)}</p>
                  </div>
                  {previous && (
                    <div className={cn(
                      "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full",
                      report.price > previous.price ? "text-orange-400 bg-orange-400/10" : "text-emerald-400 bg-emerald-400/10"
                    )}>
                      {formatTrend(previous.price, report.price)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <History className="h-5 w-5 text-blue-400" />
             <h3 className="text-lg font-semibold text-white">Histórico e Auditoria</h3>
          </div>
          <ButtonLink href={stationAuditHref} variant="secondary" className="h-8 text-[10px] font-bold">
            DETALHES <ArrowRight className="h-3 w-3" />
          </ButtonLink>
        </div>
        <div className="pt-2">
           <HistoryChart series={audit.series} />
        </div>
        <p className="text-[10px] text-white/30 leading-relaxed">
          O gráfico mostra a variação de <strong>{fuelLabels[selectedFuel]}</strong> nos últimos {selectedDays} dias. 
          A auditoria completa ajuda a identificar padrões e anomalias territoriais.
        </p>
      </SectionCard>

      {audit.recentReports.length > 0 && (
        <SectionCard className="space-y-4">
          <div className="flex items-center gap-2">
             <Camera className="h-5 w-5 text-white/40" />
             <h3 className="text-lg font-semibold text-white">Evidências Recentes</h3>
          </div>
          <PriceTable reports={audit.recentReports.slice(0, 5) as PriceReport[]} />
          <div className="rounded-2xl bg-black/40 p-4 border border-white/5">
             <p className="text-[11px] text-white/50 leading-relaxed italic">
              &quot;A prova de vida é o que diferencia o Bomba Aberta. Cada preço acima corresponde a uma foto real do painel do posto, auditada para garantir honestidade territorial.&quot;
             </p>
          </div>
        </SectionCard>
      )}

      <div className="grid gap-3 sm:grid-cols-2 pt-4">
        <ButtonLink href={sendPriceHref} className="w-full justify-center h-14 text-sm font-black bg-[color:var(--color-accent)] text-black">
          ADICIONAR NOVO PREÇO
          <ArrowRight className="h-4 w-4" />
        </ButtonLink>
        <ButtonLink href={backHref} variant="secondary" className="w-full justify-center h-14 text-sm font-black">
          VOLTAR AO MAPA
        </ButtonLink>
      </div>
    </AppShell>
  );
}








