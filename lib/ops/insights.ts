import { getBetaFeedbackSummary } from "@/lib/beta/feedback";
import { getBetaInviteSummary } from "@/lib/beta/invites";
import { getOperationalDashboard } from "@/lib/ops/reports";
import { getOperationalTelemetry } from "@/lib/ops/observability";
import type { BetaOpsAlert, BetaOpsDailySummary } from "./types";

function summarizeDropoff(label: string, value: number) {
  return { label, value };
}

function buildAlerts(input: {
  dashboard: Awaited<ReturnType<typeof getOperationalDashboard>>;
  todayTelemetry: Awaited<ReturnType<typeof getOperationalTelemetry>>;
  feedbackSummary: Awaited<ReturnType<typeof getBetaFeedbackSummary>>;
}): BetaOpsAlert[] {
  const alerts: BetaOpsAlert[] = [];
  const todayFailed = input.todayTelemetry.funnel.submissionFailed;
  const todayStarted = input.todayTelemetry.funnel.submissionStarted;
  const avgFailed = input.dashboard.observability.funnel.submissionFailed / 7;
  const avgOpened = input.dashboard.observability.funnel.homeOpened / 7;
  const todayOpened = input.todayTelemetry.funnel.homeOpened;
  const uploadErrors = input.todayTelemetry.summary.uploadErrors;
  const mostConfusing = input.feedbackSummary.byScreen[0];
  const mostRepeatedCity = input.feedbackSummary.byCity[0];
  const weakCoverage = input.dashboard.coverageRows.filter((row) => row.coverageRatio < 0.35).slice(0, 3);

  if (todayFailed >= 3 && (avgFailed === 0 || todayFailed >= Math.max(3, Math.ceil(avgFailed * 2)))) {
    alerts.push({
      kind: "submission_failure_spike",
      title: "Falhas de envio acima do normal",
      description: `${todayFailed} falhas hoje; a fila merece revisão antes de abrir mais testers.`,
      severity: "danger",
      count: todayFailed
    });
  }

  if (todayStarted > 0 && uploadErrors >= 2) {
    alerts.push({
      kind: "upload_error_spike",
      title: "Upload com falha recorrente",
      description: `${uploadErrors} erros de upload na janela curta. Vale checar câmera, tamanho e rede.`,
      severity: "danger",
      count: uploadErrors
    });
  }

  if (avgOpened > 0 && todayOpened < Math.max(3, Math.floor(avgOpened * 0.5))) {
    alerts.push({
      kind: "usage_dropoff",
      title: "Uso caiu abaixo da média",
      description: `A home abriu menos hoje (${todayOpened}) do que a média recente. Pode ser problema de acesso ou engajamento.`,
      severity: "warning",
      count: todayOpened
    });
  }

  if (mostConfusing && mostConfusing.count >= 4) {
    alerts.push({
      kind: "confusing_screen",
      title: "Tela com feedback repetido",
      description: `A tela ${mostConfusing.screenGroup} concentrou ${mostConfusing.count} retornos.`,
      severity: "warning",
      screen: mostConfusing.screenGroup,
      count: mostConfusing.count
    });
  }

  if (mostRepeatedCity && mostRepeatedCity.count >= 4) {
    alerts.push({
      kind: "city_feedback_cluster",
      title: "Cidade com mais retorno repetido",
      description: `${mostRepeatedCity.city} puxou ${mostRepeatedCity.count} feedbacks na janela.`,
      severity: "warning",
      city: mostRepeatedCity.city,
      count: mostRepeatedCity.count
    });
  }

  if (weakCoverage.length > 0) {
    const cityList = weakCoverage.map((row) => row.city).join(", ");
    alerts.push({
      kind: "coverage_gap",
      title: "Cobertura ainda fraca em parte da base",
      description: `Cidades com cobertura baixa: ${cityList}.`,
      severity: "warning",
      count: weakCoverage.length
    });
  }

  const topWeakStations = input.dashboard.priorityTargets.slice(0, 3);
  if (topWeakStations.length > 0) {
    alerts.push({
      kind: "collection_priority",
      title: "Lacunas para coleta prioritária",
      description: topWeakStations.map((station) => station.stationName).join(" · "),
      severity: "info",
      count: topWeakStations.length
    });
  }

  return alerts.slice(0, 6);
}

function buildDailySummary(input: {
  todayTelemetry: Awaited<ReturnType<typeof getOperationalTelemetry>>;
  todayFeedback: Awaited<ReturnType<typeof getBetaFeedbackSummary>>;
  dashboard: Awaited<ReturnType<typeof getOperationalDashboard>>;
}): BetaOpsDailySummary {
  const uniqueTesters = new Set(input.todayTelemetry.recentEvents.map((event) => event.ipHash).filter((value): value is string => Boolean(value)));
  const dropoff = input.todayTelemetry.funnel.dropoffBetweenSteps[0];
  const confusingScreen = input.todayFeedback.byScreen[0];

  return {
    testersActiveToday: uniqueTesters.size,
    submissionsStartedToday: input.todayTelemetry.funnel.submissionStarted,
    submissionsCompletedToday: input.todayTelemetry.funnel.submissionAccepted,
    feedbackReceivedToday: input.todayFeedback.total,
    topDropoffStep: dropoff ? `${dropoff.from} → ${dropoff.to}` : null,
    topDropoffLost: dropoff?.lost ?? 0,
    topConfusingScreen: confusingScreen?.screenGroup ?? null,
    topConfusingScreenCount: confusingScreen?.count ?? 0,
    weakCities: input.dashboard.coverageRows
      .filter((row) => row.coverageRatio < 0.35)
      .slice(0, 5)
      .map((row) => ({ city: row.city, count: row.observations, coverageLabel: row.coverageLabel, confidenceLabel: row.confidenceLabel })),
    topPriorityTargets: input.dashboard.priorityTargets.slice(0, 5).map((target) => ({ stationName: target.stationName, city: target.city, reason: target.reason }))
  };
}

export async function getBetaOpsInsights() {
  const [dashboard, todayTelemetry, todayFeedback, inviteSummary] = await Promise.all([
    getOperationalDashboard(30),
    getOperationalTelemetry(1),
    getBetaFeedbackSummary(1),
    getBetaInviteSummary(25)
  ]);

  return {
    dashboard,
    todayTelemetry,
    todayFeedback,
    inviteSummary,
    daily: buildDailySummary({ dashboard, todayTelemetry, todayFeedback }),
    alerts: buildAlerts({ dashboard, todayTelemetry, feedbackSummary: todayFeedback })
  };
}
