import { Badge } from "@/components/ui/badge";
import type { HomeRecommendationTelemetryReadout } from "@/lib/ops/home-recommendation-telemetry";

type PanelStatus = "healthy" | "attention" | "problem";

function variantForRate(rate: number) {
  if (rate >= 45) return "warning" as const;
  if (rate >= 20) return "default" as const;
  return "secondary" as const;
}

function resolvePanelStatus(readout: HomeRecommendationTelemetryReadout): {
  status: PanelStatus;
  label: string;
  summary: string;
} {
  if (readout.totals.decisions === 0) {
    return {
      status: "attention",
      label: "Pouca leitura ainda",
      summary: "Ainda não há volume suficiente para dizer se a heurística está conservadora ou agressiva demais."
    };
  }

  if (readout.totals.nearOverrideRate >= 60 || readout.totals.bestAlignedRate <= 25) {
    return {
      status: "problem",
      label: "Troca agressiva demais",
      summary: "A home está trocando muito o posto mais próximo ou mantendo pouco alinhamento entre os cards. Vale rever thresholds."
    };
  }

  if (readout.totals.nearOverrideRate >= 40 || readout.totals.bestAlignedRate <= 45) {
    return {
      status: "attention",
      label: "Pede leitura curta",
      summary: "A heurística parece útil, mas já merece acompanhamento para evitar overfitting em poucos cenários."
    };
  }

  return {
    status: "healthy",
    label: "Equilíbrio saudável",
    summary: "A troca do mais próximo ainda parece controlada e os cards seguem convergindo em boa parte das decisões."
  };
}

function statusVariant(status: PanelStatus) {
  if (status === "problem") return "danger" as const;
  if (status === "attention") return "warning" as const;
  return "default" as const;
}

export function HomeRecommendationOpsPanel({ readout }: { readout: HomeRecommendationTelemetryReadout }) {
  const guardrail = resolvePanelStatus(readout);

  return (
    <section className="rounded-[28px] border border-white/8 bg-[#111] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/34">Home recommendation</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Quando a home troca o posto mais próximo</h2>
          <p className="mt-1 max-w-3xl text-sm text-white/54">Leitura operacional da heurística que mistura distância e preço para decidir o posto perto de você e o melhor para você.</p>
        </div>
        <Badge variant={variantForRate(readout.totals.nearOverrideRate)}>{readout.totals.decisions} decisões</Badge>
      </div>

      <div className="mt-4 rounded-[22px] border border-white/8 bg-black/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Guardrail da heurística</p>
            <p className="mt-2 text-lg font-semibold text-white">{guardrail.label}</p>
            <p className="mt-1 text-sm text-white/54">{guardrail.summary}</p>
          </div>
          <Badge variant={statusVariant(guardrail.status)}>{guardrail.status === "problem" ? "Problema" : guardrail.status === "attention" ? "Atenção" : "Saudável"}</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-[20px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Override do mais próximo</p>
          <p className="mt-2 text-2xl font-semibold text-white">{readout.totals.nearOverrideRate}%</p>
          <p className="mt-1 text-xs text-white/52">{readout.totals.nearOverridesAbsoluteNearest} vezes em que “perto” não foi o absoluto mais perto.</p>
        </div>
        <div className="rounded-[20px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Alinhamento entre cards</p>
          <p className="mt-2 text-2xl font-semibold text-white">{readout.totals.bestAlignedRate}%</p>
          <p className="mt-1 text-xs text-white/52">{readout.totals.bestAlignedWithNear} vezes em que “melhor para você” bateu com “perto de você”.</p>
        </div>
        <div className="rounded-[20px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Gap médio de distância</p>
          <p className="mt-2 text-2xl font-semibold text-white">{readout.totals.avgNearVsBestDistanceGap} m</p>
          <p className="mt-1 text-xs text-white/52">Distância extra média entre o posto “perto” e o “melhor”.</p>
        </div>
        <div className="rounded-[20px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Gap médio de preço</p>
          <p className="mt-2 text-2xl font-semibold text-white">R$ {readout.totals.avgNearVsBestPriceGap.toFixed(2)}</p>
          <p className="mt-1 text-xs text-white/52">Diferença média de preço entre o posto “melhor” e o “perto”.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Combustíveis com mais troca</p>
          <div className="mt-3 space-y-3">
            {readout.byFuel.map((item) => (
              <div key={item.fuelType} className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{item.fuelType}</p>
                  <Badge variant={variantForRate(item.nearOverrideRate)}>{item.decisions} decisões</Badge>
                </div>
                <p className="mt-2 text-xs text-white/56">Override do mais próximo: {item.nearOverrideRate}%</p>
                <p className="mt-1 text-xs text-white/56">Alinhamento entre cards: {item.bestAlignedRate}%</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Cidades com mais decisões</p>
          <div className="mt-3 space-y-3">
            {readout.topCities.map((item) => (
              <div key={item.city} className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{item.city}</p>
                  <Badge variant={variantForRate(item.nearOverrideRate)}>{item.decisions} decisões</Badge>
                </div>
                <p className="mt-2 text-xs text-white/56">Override do mais próximo: {item.nearOverrideRate}%</p>
                <p className="mt-1 text-xs text-white/56">Alinhamento entre cards: {item.bestAlignedRate}%</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Overrides mais fortes</p>
          <div className="mt-3 space-y-3">
            {readout.strongestOverrides.map((item, index) => (
              <div key={`${item.createdAt ?? "no-date"}-${index}`} className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3">
                <p className="text-sm font-semibold text-white">{item.city} · {item.fuelType}</p>
                <p className="mt-2 text-xs text-white/56">Gap de distância: {item.distanceGap} m</p>
                <p className="mt-1 text-xs text-white/56">Gap de preço: R$ {item.priceGap.toFixed(2)}</p>
                <p className="mt-1 text-xs text-white/56">Gap de score: {item.scoreGap.toFixed(4)}</p>
              </div>
            ))}
            {readout.strongestOverrides.length === 0 ? <p className="text-sm text-white/48">Ainda não há overrides suficientes nesta janela.</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}