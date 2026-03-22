import type { AuditReportRunItem, AuditWindowDays } from "@/lib/audit/types";
import type { FuelType } from "@/lib/types";
import { getComparableCities, summarizeComparison } from "@/lib/audit/city-compare";
import { recordAuditAlertHistory } from "@/lib/audit/alerts-history";
import { recordAuditReportRun } from "@/lib/audit/reports";
import { getAuditOverview, getCityAuditDetail } from "@/lib/audit/queries";
import { getAuditCitySlug } from "@/lib/audit/cities";
import { buildCityDossierTemplate, buildFuelDossierTemplate, buildRegionalDossierTemplate } from "@/lib/audit/templates";
import { getAuditGroups } from "@/lib/audit/groups";

const recurringFuelTypes: FuelType[] = ["gasolina_comum", "etanol"];
const cityFocus = ["Volta Redonda", "Barra Mansa", "Resende", "Barra do Piraí", "Porto Real", "Quatis", "Pinheiral"];

function getPeriodBounds(days: AuditWindowDays) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10)
  };
}

export async function generateRecurringAuditDossiers() {
  const createdRuns: AuditReportRunItem[] = [];
  const period7 = getPeriodBounds(7);
  const comparison = await getComparableCities("gasolina_comum", 30);
  const comparisonSummary = summarizeComparison(comparison);

  for (const city of cityFocus) {
    const citySlug = getAuditCitySlug(city);
    for (const fuelType of recurringFuelTypes) {
      const detail = await getCityAuditDetail(citySlug, fuelType, 7);
      if (!detail) {
        continue;
      }

      const template = buildCityDossierTemplate(city, fuelType, 7);
      await recordAuditReportRun({
        scopeType: "city",
        scopeLabel: city,
        citySlug,
        cityName: city,
        fuelType,
        days: 7,
        title: template.title,
        summary: {
          ...detail.summary,
          template: template.sections,
          scope: template.scopeType,
          coverage: detail.summary.coverageLabel,
          confidence: detail.summary.confidenceLabel,
          observations: detail.summary.observations,
          seriesLength: detail.series.length
        },
        alertsCount: detail.alerts.length,
        visibilityStatus: "public",
        artifactFormat: "pdf",
        createdBy: "scheduler"
      });

      createdRuns.push({
        id: `${citySlug}-${fuelType}-7`,
        scopeType: "city",
        scopeLabel: city,
        citySlug,
        cityName: city,
        stationId: null,
        stationName: null,
        groupId: null,
        groupSlug: null,
        groupName: null,
        fuelType,
        days: 7,
        periodStart: period7.periodStart,
        periodEnd: period7.periodEnd,
        title: template.title,
        summary: { template: template.sections },
        alertsCount: detail.alerts.length,
        visibilityStatus: "public",
        artifactFormat: "pdf",
        artifactPath: null,
        artifactUrl: null,
        createdBy: "scheduler",
        generatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      for (const alert of detail.alerts.slice(0, 5)) {
        await recordAuditAlertHistory({
          alert,
          scopeType: "city",
          scopeLabel: city,
          fuelType,
          periodDays: 7,
          periodStart: period7.periodStart,
          periodEnd: period7.periodEnd,
          citySlug,
          cityName: city,
          intensity: typeof alert.value === "number" ? Math.round(alert.value * 10) / 10 : null
        });
      }
    }
  }

  const monthlyTemplate = buildRegionalDossierTemplate("gasolina_comum", 30, "Sul Fluminense");
  const monthlyOverview = await getAuditOverview("gasolina_comum", 30);
  await recordAuditReportRun({
    scopeType: "region",
    scopeLabel: monthlyTemplate.scopeLabel,
    fuelType: monthlyTemplate.fuelType,
    days: 30,
    title: monthlyTemplate.title,
    summary: {
      ...monthlyOverview.summary,
      template: monthlyTemplate.sections,
      comparison: {
        leadingCity: comparisonSummary.leadingCity?.city ?? null,
        trailingCity: comparisonSummary.trailingCity?.city ?? null,
        spread: comparisonSummary.spread,
        sampleSize: comparison.length
      }
    },
    alertsCount: monthlyOverview.alerts.length,
    artifactFormat: "pdf",
    visibilityStatus: "public",
    createdBy: "scheduler"
  });

  const groups = await getAuditGroups();
  for (const group of groups.slice(0, 6)) {
    const template = buildFuelDossierTemplate("gasolina_comum", 30, group.name);
    await recordAuditReportRun({
      scopeType: "group",
      scopeLabel: group.name,
      fuelType: template.fuelType,
      days: 30,
      title: template.title,
      summary: {
        template: template.sections,
        groupType: group.groupType,
        groupName: group.name,
        groupCity: group.city
      },
      alertsCount: 0,
      groupId: group.id,
      groupSlug: group.slug,
      groupName: group.name,
      artifactFormat: "pdf",
      visibilityStatus: "public",
      createdBy: "scheduler"
    });
  }

  return createdRuns;
}
