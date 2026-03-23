import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { Layers, MapPin, AlertCircle, CheckCircle2, Siren } from "lucide-react";
import type { GroupReadinessRow } from "@/lib/ops/types";

interface GroupReadinessPanelProps {
  rows: GroupReadinessRow[];
}

function resolveBadgeVariant(light: GroupReadinessRow["trafficLight"]) {
  if (light === "green") return "default";
  if (light === "yellow") return "warning";
  return "danger";
}

function resolveRecommendationStyle(rec: GroupReadinessRow["recommendation"]) {
  switch (rec) {
    case "pronto para teste na rua":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "testar com 2 ou 3 pessoas":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "revisar cadastro antes":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "segurar e densificar base":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-white/5 text-white/42 border-white/10";
  }
}

export function GroupReadinessPanel({ rows }: GroupReadinessPanelProps) {
  return (
    <SectionCard className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-[color:var(--color-accent)]/10 p-2">
            <Layers className="h-5 w-5 text-[color:var(--color-accent)]" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/42">Readiness por Grupo / Corredor</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Nível de prontidão territorial</h2>
            <p className="mt-1 text-sm text-white/58">Leitura granular para validar o início do teste presencial.</p>
          </div>
        </div>
        <Badge variant="outline" className="border-[color:var(--color-accent)]/30 text-[color:var(--color-accent)]">
          Foco Operacional
        </Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((row) => (
          <div key={row.groupSlug} className="group relative overflow-hidden rounded-[22px] border border-white/8 bg-black/30 p-5 transition-all hover:border-white/16">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">{row.groupName}</span>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-white/30">
                    {row.groupType}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-white/42">
                  <MapPin className="h-3.5 w-3.5" />
                  {row.city || "Multi-cidade"}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${row.trafficLight === 'green' ? 'bg-green-500 animate-pulse' : row.trafficLight === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  <span className="text-3xl font-black tracking-tighter text-white">{row.score}</span>
                </div>
                <Badge variant={resolveBadgeVariant(row.trafficLight)} className="text-[10px] uppercase">
                  {row.trafficLight === 'green' ? 'Pronto' : row.trafficLight === 'yellow' ? 'Alerta' : 'Crítico'}
                </Badge>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="flex flex-col rounded-xl bg-white/5 p-3">
                <span className="text-[10px] uppercase tracking-wider text-white/30">Visíveis</span>
                <span className="text-lg font-semibold text-white">{row.visibleStations}</span>
              </div>
              <div className="flex flex-col rounded-xl bg-white/5 p-3">
                <span className="text-[10px] uppercase tracking-wider text-white/30">Com Preço</span>
                <span className="text-lg font-semibold text-white">{row.stationsWithRecentPrice}</span>
              </div>
              <div className="flex flex-col rounded-xl bg-white/5 p-3">
                <span className="text-[10px] uppercase tracking-wider text-white/30">Reports</span>
                <span className="text-lg font-semibold text-white">{row.approvedReportsRecent}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Gargalos Detectados</p>
                {row.gapDensity > 0.3 && <Siren className="h-3.5 w-3.5 text-orange-500" />}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {row.gaps.length > 0 ? (
                  row.gaps.map((gap) => (
                    <Badge key={gap} variant="secondary" className="bg-white/5 text-[10px] font-normal text-white/60 hover:bg-white/10">
                      {gap}
                    </Badge>
                  ))
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-green-400/70">
                    <CheckCircle2 className="h-3 w-3" />
                    Fluxo de dados saudável
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
              <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${resolveRecommendationStyle(row.recommendation)}`}>
                <AlertCircle className="h-3.5 w-3.5" />
                {row.recommendation}
              </div>
              <Link
                href={`/auditoria/comparar?group=${row.groupSlug}`}
                className="text-xs font-semibold text-[color:var(--color-accent)] transition-colors hover:text-white"
              >
                Abrir Auditoria →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
