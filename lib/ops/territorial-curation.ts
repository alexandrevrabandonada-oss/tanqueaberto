import { priorityCities } from "@/lib/navigation/home-context";
import { detectGenericStationName, getStationProposalReviewSignal, getStationPublicName, isValidStationCoordinate } from "@/lib/quality/stations";
import type { Station } from "@/lib/types";

export interface TerritorialDuplicateCandidate {
  stationId: string;
  publicName: string;
  city: string;
  neighborhood: string;
  reason: string;
  score: number;
}

export interface TerritorialCurationQueueItem {
  station: Station;
  publicName: string;
  priorityScore: number;
  reasons: string[];
  canPromoteToMap: boolean;
  needsCoordinate: boolean;
  lowConfidence: boolean;
  importantCity: boolean;
  proposalReviewState: "boa_rapida" | "precisa_revisar" | "muito_vaga";
  proposalReviewLabel: string;
  proposalReviewReason: string;
  riskLabels: string[];
  duplicateCandidates: TerritorialDuplicateCandidate[];
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

export type TerritorialCurationDecision = "approve" | "review" | "reject" | "duplicate" | "adjust" | "hide";

function normalize(value: string) {
  return value.trim().toUpperCase();
}

function normalizeLoose(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function tokenize(value: string) {
  return normalizeLoose(value)
    .split(/\s+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function streetHint(address: string) {
  const cleaned = address.trim();
  if (!cleaned) return "";
  return cleaned.split(",")[0]?.trim() ?? "";
}

function hasStreetHint(address: string) {
  const hint = streetHint(address);
  if (!hint) return false;
  const normalized = normalizeLoose(hint);
  return normalized.length > 3 && !/^(sem rua|sem endereco|não informado|nao informado)$/i.test(normalized);
}

function haversineMeters(left: Station, right: Station) {
  if (!isValidStationCoordinate(left.lat, left.lng) || !isValidStationCoordinate(right.lat, right.lng)) {
    return null;
  }

  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const dLat = toRad((right.lat ?? 0) - (left.lat ?? 0));
  const dLng = toRad((right.lng ?? 0) - (left.lng ?? 0));
  const lat1 = toRad(left.lat ?? 0);
  const lat2 = toRad(right.lat ?? 0);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getTerritorialDuplicateCandidates(station: Station, catalog: Station[], limit = 3): TerritorialDuplicateCandidate[] {
  const targetName = normalizeLoose(getStationPublicName(station));
  const targetTokens = new Set(tokenize(targetName));
  const targetBrand = normalizeLoose(station.brand ?? "");
  const targetCity = normalizeLoose(station.city ?? "");
  const targetNeighborhood = normalizeLoose(station.neighborhood ?? "");
  const targetStreet = normalizeLoose(streetHint(station.address ?? ""));

  return catalog
    .filter((candidate) => candidate.id !== station.id)
    .map((candidate) => {
      let score = 0;
      const reasons: string[] = [];

      const candidateName = normalizeLoose(getStationPublicName(candidate));
      const candidateTokens = new Set(tokenize(candidateName));
      const overlap = [...targetTokens].filter((token) => candidateTokens.has(token)).length;

      if (candidateName && candidateName === targetName) {
        score += 60;
        reasons.push("nome igual");
      } else if (overlap >= 2) {
        score += 28;
        reasons.push("nome parecido");
      } else if (overlap === 1) {
        score += 12;
        reasons.push("nome semelhante");
      }

      if (targetBrand && targetBrand === normalizeLoose(candidate.brand ?? "")) {
        score += 18;
        reasons.push("mesma bandeira");
      }

      if (targetCity && targetCity === normalizeLoose(candidate.city ?? "")) {
        score += 14;
        reasons.push("mesma cidade");
      }

      if (targetNeighborhood && targetNeighborhood === normalizeLoose(candidate.neighborhood ?? "")) {
        score += 10;
        reasons.push("mesmo bairro");
      }

      const candidateStreet = normalizeLoose(streetHint(candidate.address ?? ""));
      if (targetStreet && candidateStreet && targetStreet === candidateStreet) {
        score += 16;
        reasons.push("mesma rua");
      }

      const distance = haversineMeters(station, candidate);
      if (distance !== null) {
        if (distance <= 400) {
          score += 18;
          reasons.push("muito perto");
        } else if (distance <= 1_200) {
          score += 10;
          reasons.push("perto");
        }
      }

      if (candidate.geoReviewStatus === "manual_review") {
        score -= 4;
      }

      if (candidate.geoConfidence === "low") {
        score -= 4;
      }

      if (candidate.visibilityStatus === "hidden") {
        score -= 8;
      }

      return {
        stationId: candidate.id,
        publicName: getStationPublicName(candidate),
        city: candidate.city,
        neighborhood: candidate.neighborhood,
        reason: reasons.slice(0, 2).join(" · ") || "posto parecido",
        score
      } satisfies TerritorialDuplicateCandidate;
    })
    .filter((candidate) => candidate.score >= 20)
    .sort((left, right) => right.score - left.score || left.publicName.localeCompare(right.publicName, "pt-BR"))
    .slice(0, limit);
}

export function canPromoteStationToMap(station: Station) {
  return isValidStationCoordinate(station.lat, station.lng) && (station.geoConfidence === "high" || station.geoConfidence === "medium") && station.geoReviewStatus === "ok";
}

export function getTerritorialCurationQueue(stations: Station[], limit = 40, catalogStations: Station[] = stations): TerritorialCurationQueueItem[] {
  const items = stations
    .filter((station) => station.geoReviewStatus === "pending" || station.geoReviewStatus === "manual_review" || !isValidStationCoordinate(station.lat, station.lng) || station.geoConfidence === "low")
    .map((station) => {
      const publicName = getStationPublicName(station);
      const needsCoordinate = !isValidStationCoordinate(station.lat, station.lng);
      const lowConfidence = station.geoConfidence === "low" || !station.geoConfidence;
      const importantCity = priorityCities.some((city) => normalize(city) === normalize(station.city));
      const duplicateCandidates = getTerritorialDuplicateCandidates(station, catalogStations);
      const reasons: string[] = [];
      const riskLabels: string[] = [];
      let priorityScore = 0;

      if (needsCoordinate) {
        priorityScore += 100;
        reasons.push("Sem coordenada válida");
        riskLabels.push("Sem geo");
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
        riskLabels.push("Nome genérico");
      }

      if (!hasStreetHint(station.address ?? "")) {
        priorityScore += 10;
        reasons.push("Sem rua/trecho útil");
        riskLabels.push("Sem rua/trecho");
      }

      if (station.geoSource === "manual") {
        priorityScore += 5;
        reasons.push("Fonte geográfica manual");
      }

      if (duplicateCandidates.length > 0) {
        priorityScore += 22;
        reasons.push(`Parecido com ${duplicateCandidates[0].publicName}`);
        riskLabels.push("Duplicidade provável");
      }

      const proposalReview = getStationProposalReviewSignal(station);
      reasons.unshift(`${proposalReview.label}: ${proposalReview.reason}`);

      return {
        station,
        publicName,
        priorityScore,
        reasons,
        canPromoteToMap: canPromoteStationToMap(station),
        needsCoordinate,
        lowConfidence,
        importantCity,
        proposalReviewState: proposalReview.state,
        proposalReviewLabel: proposalReview.label,
        proposalReviewReason: proposalReview.reason,
        riskLabels,
        duplicateCandidates
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
