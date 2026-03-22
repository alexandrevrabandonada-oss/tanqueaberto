import type { AuditOverview, StationAuditDetail, CityAuditDetail } from "@/lib/audit/types";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { fuelLabels } from "@/lib/format/labels";

function escapeCsv(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n;]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function buildCsv(content: Array<Record<string, string | number | null | undefined>>) {
  if (content.length === 0) return "";

  const headers = Object.keys(content[0]);
  const lines = [headers.map(escapeCsv).join(",")];

  for (const row of content) {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(","));
  }

  return lines.join("\n");
}

export function buildStationExportRows(detail: StationAuditDetail, stationName: string, city: string) {
  return detail.recentReports.map((report) => ({
    "posto": stationName,
    "cidade": city,
    "combustivel": fuelLabels[report.fuelType],
    "preco": formatCurrencyBRL(report.price),
    "enviado_em": report.reportedAt,
    "observado_em": report.observedAt,
    "submetido_em": report.submittedAt,
    "apelido": report.reporterNickname ?? "",
    "fonte": report.sourceKind,
    "foto_url": report.photoUrl
  }));
}

export function buildCityExportRows(detail: CityAuditDetail) {
  return detail.recentReports.map((report) => ({
    "cidade": detail.city,
    "posto": report.stationName,
    "combustivel": fuelLabels[report.fuelType],
    "preco": formatCurrencyBRL(report.price),
    "enviado_em": report.reportedAt,
    "observado_em": report.observedAt,
    "submetido_em": report.submittedAt,
    "apelido": report.reporterNickname ?? "",
    "fonte": report.sourceKind,
    "foto_url": report.photoUrl
  }));
}

export function buildOverviewExportRows(detail: AuditOverview) {
  return [
    {
      "combustivel": fuelLabels[detail.fuelType],
      "janela_dias": detail.days,
      "observacoes": detail.summary.observations,
      "postos": detail.summary.stations,
      "cidades": detail.summary.cities,
      "minimo": detail.summary.minPrice ? formatCurrencyBRL(detail.summary.minPrice) : "",
      "maximo": detail.summary.maxPrice ? formatCurrencyBRL(detail.summary.maxPrice) : "",
      "mediana": detail.summary.medianPrice ? formatCurrencyBRL(detail.summary.medianPrice) : "",
      "media": detail.summary.averagePrice ? formatCurrencyBRL(detail.summary.averagePrice) : "",
      "cobertura": `${Math.round(detail.summary.coverageRatio * 100)}%`,
      "confianca": detail.summary.confidenceLabel,
      "tendencia": detail.summary.trend,
      "variacao_absoluta": detail.summary.changeAbsolute !== null ? formatCurrencyBRL(detail.summary.changeAbsolute) : "",
      "variacao_percentual": detail.summary.changePercent !== null ? `${detail.summary.changePercent.toFixed(1)}%` : ""
    }
  ];
}
