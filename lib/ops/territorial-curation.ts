import { priorityCities } from "@/lib/navigation/home-context";
import { detectGenericStationName, getStationPublicName, isValidStationCoordinate } from "@/lib/quality/stations";
import type { Station } from "@/lib/types";

export interface TerritorialCurationQueueItem {
  station: Station;
  publicName: string;
  priorityScore: number;
  reasons: string[];
  canPromoteToMap: boolean;
  needsCoordinate: boolean;
  lowConfidence: boolean;
  importantCity: boolean;
}

export interface TerritorialCitySummary {
  city: string;
  total: number;
  promotable: number;
  hidden: number;
  needsCoordinate: number;
  lowConfidence: number;
  priority: number;
}

export type TerritorialCurationDecision = "approve" | "adjust" | "hide";

function normalize(value: string) {
  return value.trim().toUpperCase();
}

export function canPromoteStationToMap(station: Station) {
  return isValidStationCoordinate(station.lat, station.lng) && (station.geoConfidence === "high" || station.geoConfidence === "medium") && station.geoReviewStatus === "ok";
}

export function getTerritorialCurationQueue(stations: Station[], limit = 40): TerritorialCurationQueueItem[] {
  const items = stations
    .filter((station) => station.geoReviewStatus === "pending" || station.geoReviewStatus === "manual_review" || !isValidStationCoordinate(station.lat, station.lng) || station.geoConfidence === "low")
    .map((station) => {
      const publicName = getStationPublicName(station);
      const needsCoordinate = !isValidStationCoordinate(station.lat, station.lng);
      const lowConfidence = station.geoConfidence === "low" || !station.geoConfidence;
      const importantCity = priorityCities.some((city) => normalize(city) === normalize(station.city));
      const reasons: string[] = [];
      let priorityScore = 0;

      if (needsCoordinate) {
        priorityScore += 100;
        reasons.push("Sem coordenada válida");
      }

      if (lowConfidence) {
        priorityScore += 50;
        reasons.push("Confiança baixa");
      }

      if (station.geoReviewStatus === "manual_review") {
        priorityScore += 30;
        reasons.push("Revisão manual pendente");
      }

      if (importantCity) {
        priorityScore += 20;
        reasons.push("Cidade prioritária do beta");
      }

      if (detectGenericStationName(publicName)) {
        priorityScore += 10;
        reasons.push("Nome público genérico");
      }

      if (station.geoSource === "manual") {
        priorityScore += 5;
        reasons.push("Fonte geográfica manual");
      }

      return {
        station,
        publicName,
        priorityScore,
        reasons,
        canPromoteToMap: canPromoteStationToMap(station),
        needsCoordinate,
        lowConfidence,
        importantCity
      };
    });

  return items
    .sort((left, right) => {
      if (right.priorityScore !== left.priorityScore) return right.priorityScore - left.priorityScore;
      if (left.station.city.localeCompare(right.station.city, "pt-BR") !== 0) return left.station.city.localeCompare(right.station.city, "pt-BR");
      return left.publicName.localeCompare(right.publicName, "pt-BR");
    })
    .slice(0, limit);
}

export function summarizeTerritorialCurationByCity(items: TerritorialCurationQueueItem[]): TerritorialCitySummary[] {
  const map = new Map<string, TerritorialCitySummary>();

  for (const item of items) {
    const city = item.station.city || "Sem cidade";
    const current = map.get(city) ?? {
      city,
      total: 0,
      promotable: 0,
      hidden: 0,
      needsCoordinate: 0,
      lowConfidence: 0,
      priority: 0
    };

    current.total += 1;
    current.priority += item.priorityScore;
    if (item.canPromoteToMap) current.promotable += 1;
    if (item.station.visibilityStatus === "hidden") current.hidden += 1;
    if (item.needsCoordinate) current.needsCoordinate += 1;
    if (item.lowConfidence) current.lowConfidence += 1;

    map.set(city, current);
  }

  return [...map.values()].sort((left, right) => right.priority - left.priority || right.total - left.total || left.city.localeCompare(right.city, "pt-BR"));
}

export function buildTerritorialCityReport(city: string, items: TerritorialCurationQueueItem[]) {
  const cityItems = items.filter((item) => item.station.city === city);
  const lines = [
    `Cidade: ${city}`,
    `Total na fila: ${cityItems.length}`,
    `Promovíveis para mapa: ${cityItems.filter((item) => item.canPromoteToMap).length}`,
    `Sem coordenada: ${cityItems.filter((item) => item.needsCoordinate).length}`,
    `Confiança baixa: ${cityItems.filter((item) => item.lowConfidence).length}`,
    "",
    "Prioridade:",
    ...cityItems.slice(0, 10).map((item, index) => {
      const reasons = item.reasons.length > 0 ? item.reasons.join("; ") : "Sem pendência crítica";
      return `${index + 1}. ${item.publicName} | ${item.station.neighborhood} | ${reasons}`;
    })
  ];

  return lines.join("\n");
}
