import { AppShell } from "@/components/layout/app-shell";
import { RegionalPricePanoramaView } from "@/components/updates/regional-price-panorama";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { getHomeStations } from "@/lib/data";
import { fuelLabels } from "@/lib/format/labels";
import { logRuntimeIssue } from "@/lib/observability/runtime-issues";
import { buildRegionalPricePanorama } from "@/lib/panorama/regional-prices";
import type { FuelType } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PanoramaRegionalPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function readFuel(value: string | string[] | undefined): FuelType {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized === "gasolina_aditivada" || normalized === "etanol" || normalized === "diesel_s10" || normalized === "diesel_comum" || normalized === "gnv"
    ? normalized
    : "gasolina_comum";
}

export default async function PanoramaRegionalPage({ searchParams }: PanoramaRegionalPageProps) {
  const params = (await searchParams) ?? {};
  const fuelType = readFuel(params.fuel);

  try {
    const stations = await getHomeStations();
    const panorama = buildRegionalPricePanorama(stations, fuelType);

    return (
      <AppShell
        activeNavPath="/atualizacoes"
        globalSubmitCta={{
          href: "/postos/sem-atualizacao",
          label: "Fechar lacunas",
          note: `Panorama em ${fuelLabels[fuelType]}. Se faltar base, complete o mapa com uma nova leitura.`
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] xl:items-start">
          <div className="min-w-0">
            <RegionalPricePanoramaView panorama={panorama} />
          </div>

          <aside className="hidden space-y-4 xl:sticky xl:top-24 xl:block">
            <SectionCard className="space-y-3 border-white/10 bg-white/5 xl:p-4">
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Dentro de atualizacoes</p>
                <h2 className="text-lg font-semibold text-white xl:text-base">Panorama territorial sem poluir a home</h2>
                <p className="text-sm leading-relaxed text-white/54 xl:text-[13px]">
                  A home fica pessoal e rápida. Esta superfície abre a leitura regional, municipal e de bairro com linguagem prudente.
                </p>
              </div>

              <div className="rounded-[22px] border border-white/8 bg-black/25 p-3.5 text-sm text-white/56 xl:text-[13px]">
                Use esta página para pressionar o debate público com dado visível, sem transformar coincidência de preço em acusação automática.
              </div>

              <div className="grid gap-2">
                <ButtonLink href={"/atualizacoes" as const} variant="secondary" className="justify-center">
                  Voltar ao feed
                </ButtonLink>
                <ButtonLink href={"/postos/sem-atualizacao" as const} className="justify-center">
                  Fechar lacunas
                </ButtonLink>
              </div>
            </SectionCard>
          </aside>
        </div>
      </AppShell>
    );
  } catch (err) {
    logRuntimeIssue("Failed to build regional panorama page", err, { scope: "public", surface: "pages/atualizacoes/panorama", fallback: "empty-panorama", optional: true });

    return (
      <AppShell
        activeNavPath="/atualizacoes"
        globalSubmitCta={{
          href: "/atualizacoes",
          label: "Voltar ao feed",
          note: "Falha temporária ao montar o panorama territorial."
        }}
      >
        <SectionCard className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/34">Panorama regional</p>
          <h1 className="text-2xl font-semibold text-white">Não foi possível abrir o panorama agora.</h1>
          <p className="text-sm text-white/56">Tente novamente em instantes ou volte ao feed de atualizações enquanto a base pública recarrega.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink href={"/atualizacoes" as const} variant="secondary">Voltar ao feed</ButtonLink>
            <ButtonLink href={"/postos/sem-atualizacao" as const}>Fechar lacunas</ButtonLink>
          </div>
        </SectionCard>
      </AppShell>
    );
  }
}
