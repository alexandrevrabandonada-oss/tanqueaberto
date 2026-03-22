import PDFDocument from "pdfkit";
import type { NextRequest } from "next/server";

import { buildCsv, buildCityExportRows, buildOverviewExportRows, buildStationExportRows } from "@/lib/audit/export";
import { getAuditOverview, getCityAuditDetail, getStationAuditDetail } from "@/lib/audit/queries";
import { auditMethodologyPoints } from "@/lib/audit/methodology";
import { fuelLabels } from "@/lib/format/labels";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { getStationById } from "@/lib/data/queries";
import type { AuditWindowDays } from "@/lib/audit/types";
import type { FuelType } from "@/lib/types";

type PdfDoc = InstanceType<typeof PDFDocument>;

export const runtime = "nodejs";

function parseDays(value: string | null): AuditWindowDays {
  const parsed = Number(value ?? "30");
  if (parsed === 7 || parsed === 30 || parsed === 90) return parsed;
  return 30;
}

function parseFuelType(value: string | null): FuelType {
  const allowed: FuelType[] = ["gasolina_comum", "gasolina_aditivada", "etanol", "diesel_s10", "diesel_comum", "gnv"];
  return allowed.includes(value as FuelType) ? (value as FuelType) : "gasolina_comum";
}

function pdfBufferFromDocument(builder: (doc: PdfDoc) => void) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 44, info: { Title: "Bomba Aberta - Auditoria" } });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer | Uint8Array) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    builder(doc);
    doc.end();
  });
}

function drawChart(doc: PdfDoc, values: Array<number | null>, x: number, y: number, width: number, height: number) {
  const numericValues = values.filter((value): value is number => typeof value === "number");
  doc.roundedRect(x, y, width, height, 12).fillColor("#0b0b0b").fillAndStroke("#0b0b0b", "#2a2a2a");

  if (numericValues.length === 0) {
    doc.fillColor("#777").fontSize(10).text("Sem dados suficientes para desenhar o histórico.", x + 14, y + 18, { width: width - 28 });
    return;
  }

  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const safeRange = max - min || 1;
  const innerX = x + 12;
  const innerY = y + 12;
  const innerWidth = width - 24;
  const innerHeight = height - 24;
  const step = values.length <= 1 ? innerWidth / 2 : innerWidth / (values.length - 1);

  doc.strokeColor("#ffc700").lineWidth(2.5);
  let started = false;
  values.forEach((value, index) => {
    if (typeof value !== "number") return;
    const px = innerX + step * index;
    const py = innerY + innerHeight - ((value - min) / safeRange) * innerHeight;
    if (!started) {
      doc.moveTo(px, py);
      started = true;
    } else {
      doc.lineTo(px, py);
    }
  });
  doc.stroke();

  values.forEach((value, index) => {
    if (typeof value !== "number") return;
    const px = innerX + step * index;
    const py = innerY + innerHeight - ((value - min) / safeRange) * innerHeight;
    doc.circle(px, py, 2.5).fillColor("#ffc700").fill();
  });
}

function drawHeader(doc: PdfDoc, title: string, subtitle: string, meta: string) {
  doc.fillColor("#111").fontSize(22).text("Bomba Aberta");
  doc.moveDown(0.1);
  doc.fontSize(11).fillColor("#666").text("Observatório regional de preços e transparência popular");
  doc.moveDown(0.8);
  const x = doc.page.margins.left;
  const y = doc.y;
  doc.roundedRect(x, y, 515, 76, 16).fillAndStroke("#111111", "#2b2b2b");
  doc.fillColor("#ffc700").fontSize(15).text(title, x + 16, y + 12, { width: 300 });
  doc.fillColor("#f5f5f5").fontSize(9.5).text(subtitle, x + 16, y + 36, { width: 340, lineGap: 2 });
  doc.fillColor("#999").fontSize(8.5).text(meta, x + 16, y + 58, { width: 350 });
  doc.y = y + 98;
}

function drawSummaryBlocks(doc: PdfDoc, blocks: Array<{ label: string; value: string; note?: string }>) {
  const left = doc.page.margins.left;
  const gap = 10;
  const width = (515 - gap * 3) / 4;
  const startY = doc.y;

  blocks.slice(0, 4).forEach((block, index) => {
    const x = left + index * (width + gap);
    doc.roundedRect(x, startY, width, 72, 14).fillAndStroke("#111111", "#2c2c2c");
    doc.fillColor("#999").fontSize(8).text(block.label.toUpperCase(), x + 12, startY + 10, { width: width - 24 });
    doc.fillColor("#f5f5f5").fontSize(16).text(block.value, x + 12, startY + 24, { width: width - 24 });
    if (block.note) {
      doc.fillColor("#777").fontSize(7.5).text(block.note, x + 12, startY + 48, { width: width - 24 });
    }
  });

  doc.y = startY + 88;
}

function drawAlertSection(doc: PdfDoc, alerts: Array<{ title: string; description: string }>) {
  doc.fillColor("#111").fontSize(13).text("Padrões e indícios");
  doc.moveDown(0.35);

  if (alerts.length === 0) {
    doc.roundedRect(doc.page.margins.left, doc.y, 515, 56, 14).fillAndStroke("#111111", "#2c2c2c");
    doc.fillColor("#888").fontSize(10).text("Sem alertas relevantes neste recorte. Isso não elimina leitura cautelosa; apenas indica que a janela não mostrou mudança brusca suficiente.", doc.page.margins.left + 14, doc.y + 12, { width: 487 });
    doc.y += 70;
    return;
  }

  alerts.slice(0, 5).forEach((alert) => {
    const boxHeight = Math.max(54, doc.heightOfString(alert.description, { width: 484 }) + 22);
    doc.roundedRect(doc.page.margins.left, doc.y, 515, boxHeight, 14).fillAndStroke("#111111", "#2c2c2c");
    doc.fillColor("#ffc700").fontSize(10).text(alert.title, doc.page.margins.left + 14, doc.y + 10, { width: 484 });
    doc.fillColor("#ddd").fontSize(9).text(alert.description, doc.page.margins.left + 14, doc.y + 26, { width: 484, lineGap: 2 });
    doc.y += boxHeight + 8;
  });
}

function drawMethodologyBox(doc: PdfDoc) {
  doc.fillColor("#111").fontSize(13).text("Metodologia resumida");
  doc.moveDown(0.25);
  const x = doc.page.margins.left;
  const y = doc.y;
  doc.roundedRect(x, y, 515, 94, 14).fillAndStroke("#111111", "#2c2c2c");
  const points = auditMethodologyPoints.slice(0, 2).map((point) => `${point.title}: ${point.text}`).join("\n\n");
  doc.fillColor("#d7d7d7").fontSize(9).text(points, x + 14, y + 12, { width: 487, lineGap: 2 });
  doc.y = y + 110;
}

function drawRecentRows(doc: PdfDoc, rows: Array<{ label: string; price: number; reportedAt: string; note?: string }>, heading: string) {
  doc.fillColor("#111").fontSize(13).text(heading);
  doc.moveDown(0.3);

  if (rows.length === 0) {
    doc.roundedRect(doc.page.margins.left, doc.y, 515, 48, 14).fillAndStroke("#111111", "#2c2c2c");
    doc.fillColor("#888").fontSize(9.5).text("Sem observações recentes para este recorte.", doc.page.margins.left + 14, doc.y + 14, { width: 487 });
    doc.y += 60;
    return;
  }

  rows.slice(0, 7).forEach((row) => {
    const boxHeight = 42;
    doc.roundedRect(doc.page.margins.left, doc.y, 515, boxHeight, 12).fillAndStroke("#111111", "#2c2c2c");
    doc.fillColor("#f5f5f5").fontSize(10).text(row.label, doc.page.margins.left + 14, doc.y + 11, { width: 220 });
    doc.fillColor("#ffc700").fontSize(10).text(formatCurrencyBRL(row.price), doc.page.margins.left + 250, doc.y + 11, { width: 70, align: "right" });
    doc.fillColor("#aaa").fontSize(8.5).text(row.note ?? row.reportedAt, doc.page.margins.left + 335, doc.y + 12, { width: 165, align: "right" });
    doc.y += boxHeight + 6;
  });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") ?? "overview";
  const format = url.searchParams.get("format") ?? "csv";
  const fuelType = parseFuelType(url.searchParams.get("fuel"));
  const days = parseDays(url.searchParams.get("days"));

  if (scope === "station") {
    const stationId = url.searchParams.get("stationId");
    if (!stationId) {
      return Response.json({ error: "stationId obrigatório" }, { status: 400 });
    }

    const [station, detail] = await Promise.all([getStationById(stationId), getStationAuditDetail(stationId, fuelType, days)]);
    if (!station || !detail) {
      return Response.json({ error: "Posto não encontrado" }, { status: 404 });
    }

    if (format === "pdf") {
      const buffer = await pdfBufferFromDocument((doc) => {
        drawHeader(doc, "Dossiê cívico por posto", `${station.name} · ${station.city} · ${fuelLabels[fuelType]}`, `Janela de análise: ${days} dias · Cobertura ${Math.round(detail.summary.coverageRatio * 100)}% · Confiança ${detail.summary.confidenceLabel}`);
        drawSummaryBlocks(doc, [
          { label: "Observações", value: String(detail.summary.observations), note: `Cobertura ${detail.summary.coverageLabel}` },
          { label: "Mínimo / máximo", value: `${detail.summary.minPrice ? formatCurrencyBRL(detail.summary.minPrice) : "-"} / ${detail.summary.maxPrice ? formatCurrencyBRL(detail.summary.maxPrice) : "-"}` },
          { label: "Mediana", value: detail.summary.medianPrice ? formatCurrencyBRL(detail.summary.medianPrice) : "-", note: `Tendência ${detail.summary.trend}` },
          { label: "Variação", value: detail.summary.changePercent !== null ? `${detail.summary.changePercent.toFixed(1)}%` : "-", note: `Δ ${detail.summary.changeAbsolute !== null ? formatCurrencyBRL(detail.summary.changeAbsolute) : "-"}` }
        ]);
        drawChart(doc, detail.series.map((point) => point.medianPrice), doc.page.margins.left, doc.y, 515, 170);
        doc.y += 186;
        drawAlertSection(doc, detail.alerts);
        drawMethodologyBox(doc);
        drawRecentRows(
          doc,
          detail.recentReports.slice(0, 7).map((report) => ({
            label: `${new Date(report.reportedAt).toLocaleDateString("pt-BR")} · ${fuelLabels[report.fuelType]}`,
            price: report.price,
            reportedAt: report.reportedAt,
            note: report.reporterNickname ?? "anônimo"
          })),
          "Observações recentes"
        );
      });

      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="bomba-aberta-auditoria-posto.pdf"`
        }
      });
    }

    const rows = buildStationExportRows(detail, station.name, station.city);
    return new Response(buildCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bomba-aberta-auditoria-posto.csv"`
      }
    });
  }

  if (scope === "city") {
    const citySlug = url.searchParams.get("citySlug");
    if (!citySlug) {
      return Response.json({ error: "citySlug obrigatório" }, { status: 400 });
    }

    const detail = await getCityAuditDetail(citySlug, fuelType, days);
    if (!detail) {
      return Response.json({ error: "Cidade não encontrada" }, { status: 404 });
    }

    if (format === "pdf") {
      const buffer = await pdfBufferFromDocument((doc) => {
        drawHeader(doc, "Dossiê cívico por cidade", `${detail.city} · ${fuelLabels[fuelType]}`, `Janela de análise: ${days} dias · Cobertura ${Math.round(detail.summary.coverageRatio * 100)}% · Confiança ${detail.summary.confidenceLabel}`);
        drawSummaryBlocks(doc, [
          { label: "Observações", value: String(detail.summary.observations), note: `Postos ${detail.summary.stations}` },
          { label: "Mínimo / máximo", value: `${detail.summary.minPrice ? formatCurrencyBRL(detail.summary.minPrice) : "-"} / ${detail.summary.maxPrice ? formatCurrencyBRL(detail.summary.maxPrice) : "-"}` },
          { label: "Mediana", value: detail.summary.medianPrice ? formatCurrencyBRL(detail.summary.medianPrice) : "-", note: `Tendência ${detail.summary.trend}` },
          { label: "Variação", value: detail.summary.changePercent !== null ? `${detail.summary.changePercent.toFixed(1)}%` : "-", note: `Δ ${detail.summary.changeAbsolute !== null ? formatCurrencyBRL(detail.summary.changeAbsolute) : "-"}` }
        ]);
        drawChart(doc, detail.series.map((point) => point.medianPrice), doc.page.margins.left, doc.y, 515, 170);
        doc.y += 186;
        drawAlertSection(doc, detail.alerts);
        drawMethodologyBox(doc);
        drawRecentRows(
          doc,
          detail.recentReports.slice(0, 7).map((report) => ({
            label: `${report.stationName} · ${new Date(report.reportedAt).toLocaleDateString("pt-BR")}`,
            price: report.price,
            reportedAt: report.reportedAt,
            note: report.reporterNickname ?? "anônimo"
          })),
          "Observações recentes"
        );
      });

      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="bomba-aberta-auditoria-cidade.pdf"`
        }
      });
    }

    const rows = buildCityExportRows(detail);
    return new Response(buildCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bomba-aberta-auditoria-cidade.csv"`
      }
    });
  }

  const overview = await getAuditOverview(fuelType, days);
  if (format === "pdf") {
    const buffer = await pdfBufferFromDocument((doc) => {
      drawHeader(doc, "Panorama regional da auditoria", "Série histórica pública, padrões e indícios por combustível", `Combustível ${fuelLabels[fuelType]} · Janela de ${days} dias · Cobertura ${Math.round(overview.summary.coverageRatio * 100)}% · Confiança ${overview.summary.confidenceLabel}`);
      drawSummaryBlocks(doc, [
        { label: "Observações", value: String(overview.summary.observations), note: `Postos ${overview.summary.stations}` },
        { label: "Mínimo / máximo", value: `${overview.summary.minPrice ? formatCurrencyBRL(overview.summary.minPrice) : "-"} / ${overview.summary.maxPrice ? formatCurrencyBRL(overview.summary.maxPrice) : "-"}` },
        { label: "Mediana", value: overview.summary.medianPrice ? formatCurrencyBRL(overview.summary.medianPrice) : "-", note: `Tendência ${overview.summary.trend}` },
        { label: "Variação", value: overview.summary.changePercent !== null ? `${overview.summary.changePercent.toFixed(1)}%` : "-", note: `Δ ${overview.summary.changeAbsolute !== null ? formatCurrencyBRL(overview.summary.changeAbsolute) : "-"}` }
      ]);
      drawChart(doc, overview.series.map((point) => point.medianPrice), doc.page.margins.left, doc.y, 515, 170);
      doc.y += 186;
      drawAlertSection(doc, overview.alerts);
      drawMethodologyBox(doc);
      drawRecentRows(
        doc,
        overview.topCities.slice(0, 6).map((city) => ({
          label: city.city,
          price: city.medianPrice ?? 0,
          reportedAt: city.lastReportedAt ?? "",
          note: `${city.observations} observações · cobertura ${city.coverageLabel}`
        })),
        "Cidades com histórico mais consistente"
      );
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bomba-aberta-auditoria-panorama.pdf"`
      }
    });
  }

  return new Response(buildCsv(buildOverviewExportRows(overview)), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bomba-aberta-auditoria-panorama.csv"`
    }
  });
}
