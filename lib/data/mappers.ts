import type { Station, StationWithReports, PriceReport, ReportWithStation } from "@/lib/types";
import type { PriceReportRow, StationRow } from "@/types/supabase";

function mapStationRow(row: StationRow): Station {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    address: row.address,
    city: row.city,
    neighborhood: row.neighborhood,
    lat: row.lat,
    lng: row.lng,
    isActive: row.is_active,
    createdAt: row.created_at
  };
}

function mapReportRow(row: PriceReportRow): PriceReport {
  return {
    id: row.id,
    stationId: row.station_id,
    fuelType: row.fuel_type,
    price: row.price,
    photoUrl: row.photo_url,
    photoTakenAt: row.photo_taken_at,
    reportedAt: row.reported_at,
    createdAt: row.created_at,
    reporterNickname: row.reporter_nickname,
    status: row.status,
    moderationNote: row.moderation_note
  };
}

function dedupeLatestByFuel(reports: PriceReport[]) {
  const latestByFuel = new Map<string, PriceReport>();

  for (const report of reports) {
    if (!latestByFuel.has(report.fuelType)) {
      latestByFuel.set(report.fuelType, report);
    }
  }

  return Array.from(latestByFuel.values());
}

export function assembleStationWithReports(station: Station, reports: PriceReport[]): StationWithReports {
  const sortedReports = [...reports].sort((left, right) => new Date(right.reportedAt).getTime() - new Date(left.reportedAt).getTime());
  const latestReports = dedupeLatestByFuel(sortedReports);

  return {
    ...station,
    latestReports,
    recentReports: sortedReports.slice(0, 6),
    photoGallery: sortedReports.slice(0, 3).map((report) => report.photoUrl)
  };
}

export function groupReportsByStation(stations: Station[], reports: PriceReport[]) {
  const reportsByStation = new Map<string, PriceReport[]>();

  for (const report of reports) {
    const list = reportsByStation.get(report.stationId) ?? [];
    list.push(report);
    reportsByStation.set(report.stationId, list);
  }

  return stations.map((station) => assembleStationWithReports(station, reportsByStation.get(station.id) ?? []));
}

export function mapReportsWithStations(reports: PriceReport[], stations: Station[]) {
  const stationsById = new Map(stations.map((station) => [station.id, station] as const));

  return reports.map((report) => {
    const station = stationsById.get(report.stationId);

    return {
      ...report,
      station: {
        id: station?.id ?? report.stationId,
        name: station?.name ?? "Posto",
        brand: station?.brand ?? "",
        city: station?.city ?? "",
        neighborhood: station?.neighborhood ?? ""
      }
    } satisfies ReportWithStation;
  });
}

export { mapStationRow, mapReportRow };
