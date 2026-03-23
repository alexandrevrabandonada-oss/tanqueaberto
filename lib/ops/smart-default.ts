import { calculateDistance } from "@/lib/geo/distance";
import type { EffectiveGroupStatus } from "@/lib/ops/release-control";
import type { MissionState } from "@/hooks/use-mission";

export type SmartDefaultReason = "mission" | "proximity" | "history" | "global_readiness" | "fallback";

export interface SmartDefaultResult {
  city: string;
  reason: SmartDefaultReason;
  status: string;
}

const PROXIMITY_THRESHOLD_KM = 30; // 30km is a reasonable "local" area

export function getSmartDefaultRecorte(
  territorialSummary: EffectiveGroupStatus[],
  storedCity: string | null,
  activeMission: MissionState | null,
  userCoords: { lat: number; lng: number } | null,
  stations: Array<{ lat: number; lng: number; city: string }>
): SmartDefaultResult {
  
  // 1. Mission Context
  if (activeMission && activeMission.groupName) {
    const group = territorialSummary.find(g => 
      g.name.trim().toUpperCase() === activeMission.groupName.trim().toUpperCase() ||
      g.slug === activeMission.groupId
    );
    if (group) {
        return { city: group.name, reason: "mission", status: group.status };
    }
  }

  // 2. Proximity to "Ready" or "Validating" groups
  if (userCoords && Array.isArray(stations) && stations.length > 0) {
    const nearbyStations = stations.map(s => ({
      ...s,
      distance: calculateDistance(userCoords.lat, userCoords.lng, s.lat, s.lng)
    })).filter(s => s.distance <= PROXIMITY_THRESHOLD_KM);

    if (nearbyStations.length > 0) {
      // Find cities of nearby stations and check their readiness
      const nearbyCities = Array.from(new Set(nearbyStations.map(s => s.city)));
      const readyNearby = territorialSummary
        .filter(g => nearbyCities.includes(g.name) && g.status === "ready")
        .sort((a, b) => b.score - a.score);
      
      if (readyNearby.length > 0) {
        return { city: readyNearby[0].name, reason: "proximity", status: readyNearby[0].status };
      }

      const validatingNearby = territorialSummary
        .filter(g => nearbyCities.includes(g.name) && g.status === "validating")
        .sort((a, b) => b.score - a.score);

      if (validatingNearby.length > 0) {
        return { city: validatingNearby[0].name, reason: "proximity", status: validatingNearby[0].status };
      }
    }
  }

  // 3. Last used (History) - Only if it's still a valid/published city
  if (storedCity && storedCity !== "all") {
    const group = territorialSummary.find(g => g.name.trim().toUpperCase() === storedCity.trim().toUpperCase());
    if (group && group.isPublished) {
      return { city: group.name, reason: "history", status: group.status };
    }
  }

  // 4. Global Readiness (Strongest group overall)
  const readyGroups = territorialSummary
    .filter(g => g.status === "ready" && g.isPublished)
    .sort((a, b) => b.score - a.score);

  if (readyGroups.length > 0) {
    return { city: readyGroups[0].name, reason: "global_readiness", status: readyGroups[0].status };
  }

  const validatingGroups = territorialSummary
    .filter(g => g.status === "validating" && g.isPublished)
    .sort((a, b) => b.score - a.score);

  if (validatingGroups.length > 0) {
    return { city: validatingGroups[0].name, reason: "global_readiness", status: validatingGroups[0].status };
  }

  // 5. Final Fallback
  return { city: "", reason: "fallback", status: "none" };
}

export function getSmartDefaultPhrase(result: SmartDefaultResult): string | null {
  switch (result.reason) {
    case "mission": return "Retomando sua missão ativa";
    case "proximity": return "Abrindo no recorte mais próximo de você";
    case "history": return "Voltando para onde você parou";
    case "global_readiness": return "Abrindo no recorte mais pronto para teste";
    default: return null;
  }
}
