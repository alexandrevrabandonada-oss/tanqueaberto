import type { StationWithReports, PriceReport } from "@/lib/types";

export interface ModerationPriorityContext {
  betaInviteCode?: string | null;
  reporterTrustScore?: number;
}

export function getReportPriorityScore(
  report: Partial<PriceReport>,
  station: Partial<StationWithReports> | null,
  context: ModerationPriorityContext
): number {
  let score = 0;

  // 1. Trusted Beta Source (Higher weight)
  if (context.betaInviteCode) {
    const trustedPrefixes = ["BA-EQUIPE", "BA-VIP", "EQUIPE", "MKT"];
    if (trustedPrefixes.some(prefix => context.betaInviteCode?.startsWith(prefix))) {
      score += 60;
    } else {
      score += 20; // Regular beta
    }
  }

  // 2. Station Readiness (Green cities)
  const priorityCities = ["VOLTA REDONDA", "BARRA MANSA", "RESENDE", "BARRA DO PIRAI"];
  if (station?.city && priorityCities.includes(station.city.trim().toUpperCase())) {
    score += 25;
  }

  // 3. High Fidelity Station (Reviewed)
  if (station?.geoReviewStatus === "ok") {
    score += 15;
  }

  // 4. Manual/Admin source (Internal)
  if (report.sourceKind === "admin") {
    score += 100; // Instant priority
  }

  // 5. Geographic Confidence Signal (Hardening)
  if (report.locationConfidence === "low") {
    score -= 30; // Significant penalty for distant reports
  } else if (report.locationConfidence === "high") {
    score += 10; // Small bonus for proximity
  }

  // 6. Price Discrepancy (Hardening)
  if (report.metadata?.price_discrepancy) {
    score -= 40; // Heavy penalty for suspicious prices
  }

  return Math.max(-100, Math.min(100, score));
}
