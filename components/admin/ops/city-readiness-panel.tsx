import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import type { CityReadinessRow } from "@/lib/ops/types";

interface CityReadinessPanelProps {
  rows: CityReadinessRow[];
}

function resolveBadgeVariant(light: CityReadinessRow["trafficLight"]) {
  if (light === "green") return "default";
  if (light === "yellow") return "warning";
  return "danger";
}

export function CityReadinessPanel({ rows }: CityReadinessPanelProps) {
  return (
    <SectionCard className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Readiness por cidade</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Onde o teste de rua pode começar</h2>
          <p className="mt-1 text-sm text-white/58">Score simples, sem semântica jurídica, para decidir onde abrir primeiro com menos chute.</p>
        </div>
        <Badge variant="warning">Gate operacional</Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((row) => (
          <div key={row.citySlug} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-white">{row.city}</p>
                <p className="mt-1 text-sm text-white/54">{row.visibleStations} postos visíveis · {row.stationsWithRecentPrice} com preço recente</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={resolveBadgeVariant(row.trafficLight)}>{row.trafficLight}</Badge>
                <span className="text-3xl font-semibold text-white">{row.score}</span>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs text-white/42">
              <div className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-2">Preço recente<br /><span className="text-white/72">{row.stationsWithRecentPrice}</span></div>
              <div className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-2">Reports recentes<br /><span className="text-white/72">{row.approvedReportsRecent}</span></div>
              <div className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-2">Feedback negativo<br /><span className="text-white/72">{row.negativeFeedback}</span></div>
            </div>

            <div className="mt-3 space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-white/42">Principais gargalos</p>
              {row.gaps.length === 0 ? (
                <p className="text-sm text-white/58">Sem gargalo crítico agora.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {row.gaps.map((gap) => (
                    <Badge key={gap} variant="outline">{gap}</Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <Badge variant={row.recommendation === "pronta para ampliar" ? "default" : row.recommendation === "testar pequeno" ? "warning" : "danger"}>{row.recommendation}</Badge>
              <Link href={`/auditoria/comparar?city=${row.citySlug}`} className="text-sm text-[color:var(--color-accent)]">Ver na auditoria</Link>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
