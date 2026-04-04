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
  const routing = String(report.metadata?.submission_routing ?? "").toLowerCase();
  const trustLevel = String(report.metadata?.contributor_trust_level ?? "").toUpperCase();
  const riskLevel = String(report.metadata?.submission_risk_level ?? "").toLowerCase();

  if (context.betaInviteCode) {
    const trustedPrefixes = ["BA-EQUIPE", "BA-VIP", "EQUIPE", "MKT"];
    if (trustedPrefixes.some((prefix) => context.betaInviteCode?.startsWith(prefix))) {
      score += 60;
    } else {
      score += 20;
    }
  }

  const priorityCities = ["VOLTA REDONDA", "BARRA MANSA", "RESENDE", "BARRA DO PIRAI"];
  if (station?.city && priorityCities.includes(station.city.trim().toUpperCase())) {
    score += 25;
  }

  if (station?.geoReviewStatus === "ok") {
    score += 15;
  }

  if (report.sourceKind === "admin") {
    score += 100;
  }

  if (report.locationConfidence === "low") {
    score -= 30;
  } else if (report.locationConfidence === "high") {
    score += 10;
  }

  if (report.metadata?.price_discrepancy) {
    score -= 40;
  }

  if (report.metadata?.potential_photo_reuse) {
    score -= 50;
  }

  if (routing === "fast_lane") {
    score += 35;
  }

  if (riskLevel === "high") {
    score -= 35;
  } else if (riskLevel === "low") {
    score += 8;
  }

  if (trustLevel === "N3") {
    score += 28;
  } else if (trustLevel === "N2") {
    score += 18;
  } else if (trustLevel === "N0") {
    score -= 12;
  }

  if (context.reporterTrustScore !== undefined) {
    if (context.reporterTrustScore >= 90) {
      score += 65;
    } else if (context.reporterTrustScore >= 70) {
      score += 45;
    } else if (context.reporterTrustScore < 40) {
      score -= 40;
    }
  }

  return Math.max(-100, Math.min(100, score));
}
