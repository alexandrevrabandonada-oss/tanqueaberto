import type { PriceReport, StationWithReports, Station } from "@/lib/types";

export interface ModerationBatch {
  id: string; // Group ID (e.g., stationId-fuelType-windowId)
  stationId: string;
  stationName: string;
  fuelType: string;
  reports: PriceReport[];
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  priceVariance: number; // % difference
  timeRangeMinutes: number;
  isSafe: boolean; // True if variance is low
}

/**
 * Agrupa reports pendentes em clusters operacionais para moderação em lote.
 * Regras: Mesmo posto + Mesmo combustível + Janela de 4 horas + Preço próximo.
 */
export function groupReportsForModeration(reports: PriceReport[], stations: Station[]): ModerationBatch[] {
  const stationMap = new Map<string, Station>(stations.map(s => [s.id, s]));
  const groups: Record<string, PriceReport[]> = {};

  // 1. Agrupamento básico por Posto e Combustível
  reports.forEach(report => {
    const key = `${report.stationId}-${report.fuelType}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(report);
  });

  const batches: ModerationBatch[] = [];

  // 2. Refinamento por Janela de Tempo e Variância
  Object.entries(groups).forEach(([key, groupReports]) => {
    // Ordenar por tempo
    const sorted = [...groupReports].sort((a, b) => 
      new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime()
    );

    let currentBatch: PriceReport[] = [];
    let lastTime: number | null = null;

    sorted.forEach(report => {
      const time = new Date(report.reportedAt).getTime();
      
      // Janela de 4 horas (4 * 60 * 60 * 1000)
      if (lastTime && (time - lastTime > 4 * 60 * 60 * 1000)) {
        if (currentBatch.length > 1) {
          batches.push(createBatch(currentBatch, stationMap));
        }
        currentBatch = [];
      }
      
      currentBatch.push(report);
      lastTime = time;
    });

    if (currentBatch.length > 1) {
      batches.push(createBatch(currentBatch, stationMap));
    }
  });

  return batches.sort((a, b) => b.reports.length - a.reports.length);
}

function createBatch(reports: PriceReport[], stationMap: Map<string, Station>): ModerationBatch {
  const stationId = reports[0].stationId;
  const fuelType = reports[0].fuelType;
  const station = stationMap.get(stationId);
  const prices = reports.map(r => r.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  
  const variance = minPrice === 0 ? 0 : ((maxPrice - minPrice) / minPrice) * 100;
  
  const firstTime = new Date(reports[0].reportedAt).getTime();
  const lastTime = new Date(reports[reports.length - 1].reportedAt).getTime();
  const rangeMin = Math.round((lastTime - firstTime) / 60000);

  return {
    id: `batch-${stationId}-${fuelType}-${firstTime}`,
    stationId,
    stationName: station?.name || "Posto Desconhecido",
    fuelType,
    reports,
    avgPrice,
    minPrice,
    maxPrice,
    priceVariance: variance,
    timeRangeMinutes: rangeMin,
    isSafe: variance < 2.0 // Guardrail: Consideramos seguro até 2% de divergência
  };
}
