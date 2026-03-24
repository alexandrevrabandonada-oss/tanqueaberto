"use client";

import React, { useEffect, useState } from "react";
import { Clock, AlertTriangle, TrendingDown, TrendingUp, Gauge } from "lucide-react";
import { getCycleLatencyMetricsAction } from "@/app/admin/ops/actions";
import { type CycleLatencyMetrics } from "@/lib/ops/cycle-latency";
import { cn } from "@/lib/utils";

export function CycleLatencySummary() {
  const [metrics, setMetrics] = useState<CycleLatencyMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getCycleLatencyMetricsAction();
      setMetrics(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !metrics) return (
    <div className="h-40 w-full animate-pulse bg-white/5 rounded-2xl" />
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
          <Gauge className="w-3 h-3 text-blue-400" />
          Velocidade do Ciclo (TMC)
        </h3>
        <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded-full">
          Geral: {metrics.avgModerationMinutes} min
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
          <p className="text-[10px] text-white/40 uppercase font-black tracking-tighter mb-1">Moderação (P50)</p>
          <div className="flex items-end gap-2">
            <span className="text-xl font-black text-white">{metrics.medianModerationMinutes}m</span>
            {metrics.medianModerationMinutes < 15 ? (
              <TrendingDown className="w-3.5 h-3.5 text-green-500 mb-1" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5 text-amber-500 mb-1" />
            )}
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
          <p className="text-[10px] text-white/40 uppercase font-black tracking-tighter mb-1">No Mapa (P90 Est.)</p>
          <div className="flex items-end gap-2">
            <span className="text-xl font-black text-white">{metrics.avgVisibilityMinutes}m</span>
            <Clock className="w-3.5 h-3.5 text-blue-500 mb-1" />
          </div>
        </div>
      </div>

      {metrics.bottlenecks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-amber-500/70 uppercase font-black tracking-widest flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" />
            Gargalos de SLA
          </p>
          <div className="space-y-1.5">
            {metrics.bottlenecks.map((b, i) => (
              <div key={i} className="flex justify-between items-center bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg">
                <span className="text-[11px] font-bold text-white/80">{b.city}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-amber-400">{b.avgMinutes}m TMC</span>
                  <span className="text-[9px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200 font-bold">
                    {b.pendingCount} fila
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
