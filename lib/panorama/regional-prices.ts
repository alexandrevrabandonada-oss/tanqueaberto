import { getRecencyTone } from "@/lib/format/time";
import { getSelectedStationReport } from "@/lib/filters/public";
import { getFunctionalRegion } from "@/lib/geo/functional-regions";
import { normalizeContextValue } from "@/lib/navigation/home-context";
import { getStationPublicName } from "@/lib/quality/stations";
import type { FuelType, StationWithReports } from "@/lib/types";

export type PanoramaSignalKind =
  | "low_variation"
  | "suspicious_concentration"
  | "synchronized_adjustment"
  | "above_regional_average";

export interface PanoramaSignal {
  kind: PanoramaSignalKind;
  label: string;
  detail: string;
  variant: "secondary" | "warning" | "danger";
}

export interface PanoramaCheapestStation {
  id: string;
  name: string;
  city: string;
  neighborhood: string;
  price: number;
  reportedAt: string;
}

export interface PanoramaRow {
  scope: "region" | "city" | "neighborhood";
  key: string;
  label: string;
  regionKey: string;
  regionLabel: string;
  cityLabel: string | null;
  neighborhoodLabel: string | null;
  minPrice: number;
  averagePrice: number;
  maxPrice: number;
  priceRange: number;
  sampleSize: number;
  newestReportedAt: string;
  oldestReportedAt: string;
  signals: PanoramaSignal[];
  cheapestStation: PanoramaCheapestStation;
}

export interface RegionalPricePanorama {
  fuelType: FuelType;
  generatedAt: string;
  totalReadings: number;
  regionalRows: PanoramaRow[];
  cityRows: PanoramaRow[];
  neighborhoodRows: PanoramaRow[];
  highlightedRegion: PanoramaRow | null;
  suspiciousSignals: number;
}

type PriceChange = {
  direction: "up" | "down";
  delta: number;
  reportedAt: string;
};

type Entry = {
  station: StationWithReports;
  report: NonNullable<ReturnType<typeof getSelectedStationReport>>;
  regionKey: string;
  regionLabel: string;
  cityLabel: string;
  neighborhoodLabel: string;
  change: PriceChange | null;
};

type GroupDraft = {
  key: string;
  label: string;
  regionKey: string;
  regionLabel: string;
  cityLabel: string | null;
  neighborhoodLabel: string | null;
  entries: Entry[];
};

const SYNC_WINDOW_HOURS = 18;
const CHANGE_LOOKBACK_HOURS = 72;

function hoursAgo(value: string) {
  return (Date.now() - new Date(value).getTime()) / 3_600_000;
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sortByPriceThenAverage(left: PanoramaRow, right: PanoramaRow) {
  if (left.minPrice !== right.minPrice) return left.minPrice - right.minPrice;
  if (left.averagePrice !== right.averagePrice) return left.averagePrice - right.averagePrice;
  return right.sampleSize - left.sampleSize;
}

function resolveRegion(station: StationWithReports) {
  const region = getFunctionalRegion(station.city);
  if (region) {
    return { key: region.id, label: region.label };
  }

  const city = station.city.trim() || "Sem cidade";
  return { key: `city:${normalizeContextValue(city)}`, label: city };
}

function getLatestPriceChange(station: StationWithReports, fuelType: FuelType): PriceChange | null {
  const history = [...station.recentReports, ...station.latestReports]
    .filter((report) => report.fuelType === fuelType)
    .sort((left, right) => new Date(right.reportedAt).getTime() - new Date(left.reportedAt).getTime());

  const latest = history[0];
  if (!latest) return null;

  const previous = history.find((report) => report.id !== latest.id && Number(report.price) !== Number(latest.price));
  if (!previous) return null;
  if (hoursAgo(latest.reportedAt) > CHANGE_LOOKBACK_HOURS) return null;

  const delta = Number(latest.price) - Number(previous.price);
  if (Math.abs(delta) < 0.001) return null;

  return {
    direction: delta > 0 ? "up" : "down",
    delta: Math.abs(delta),
    reportedAt: latest.reportedAt
  };
}

function buildEntries(stations: StationWithReports[], fuelType: FuelType) {
  return stations
    .map((station) => {
      const report = getSelectedStationReport(station, fuelType);
      if (!report) return null;
      if (getRecencyTone(report.reportedAt) === "stale") return null;

      const region = resolveRegion(station);
      return {
        station,
        report,
        regionKey: region.key,
        regionLabel: region.label,
        cityLabel: station.city.trim() || "Sem cidade",
        neighborhoodLabel: station.neighborhood.trim() || "Sem bairro",
        change: getLatestPriceChange(station, fuelType)
      } satisfies Entry;
    })
    .filter((entry): entry is Entry => Boolean(entry));
}

function pushToGroup(map: Map<string, GroupDraft>, key: string, seed: Omit<GroupDraft, "entries">, entry: Entry) {
  const current = map.get(key);
  if (current) {
    current.entries.push(entry);
    return;
  }

  map.set(key, { ...seed, entries: [entry] });
}

function buildDrafts(entries: Entry[], scope: PanoramaRow["scope"]) {
  const groups = new Map<string, GroupDraft>();

  for (const entry of entries) {
    if (scope === "region") {
      pushToGroup(groups, entry.regionKey, {
        key: entry.regionKey,
        label: entry.regionLabel,
        regionKey: entry.regionKey,
        regionLabel: entry.regionLabel,
        cityLabel: null,
        neighborhoodLabel: null
      }, entry);
      continue;
    }

    if (scope === "city") {
      const key = `city:${normalizeContextValue(entry.cityLabel)}`;
      pushToGroup(groups, key, {
        key,
        label: entry.cityLabel,
        regionKey: entry.regionKey,
        regionLabel: entry.regionLabel,
        cityLabel: entry.cityLabel,
        neighborhoodLabel: null
      }, entry);
      continue;
    }

    const key = `neighborhood:${normalizeContextValue(entry.cityLabel)}:${normalizeContextValue(entry.neighborhoodLabel)}`;
    pushToGroup(groups, key, {
      key,
      label: entry.neighborhoodLabel,
      regionKey: entry.regionKey,
      regionLabel: entry.regionLabel,
      cityLabel: entry.cityLabel,
      neighborhoodLabel: entry.neighborhoodLabel
    }, entry);
  }

  return [...groups.values()];
}

function buildSignals(draft: GroupDraft, averageByRegion: Map<string, number>): PanoramaSignal[] {
  const prices = draft.entries.map((entry) => Number(entry.report.price));
  const range = Math.max(...prices) - Math.min(...prices);
  const averagePrice = mean(prices);
  const signals: PanoramaSignal[] = [];

  if (draft.entries.length >= 4 && range <= 0.06) {
    signals.push({
      kind: "low_variation",
      label: "Baixa variacao de precos",
      detail: "As leituras ficaram muito proximas entre si neste recorte.",
      variant: "secondary"
    });
  }

  if (draft.entries.length >= 5) {
    const priceBuckets = new Map<string, number>();
    for (const price of prices) {
      const key = Number(price).toFixed(2);
      priceBuckets.set(key, (priceBuckets.get(key) ?? 0) + 1);
    }
    const dominantShare = Math.max(...priceBuckets.values()) / draft.entries.length;
    if (dominantShare >= 0.7 && range <= 0.08) {
      signals.push({
        kind: "suspicious_concentration",
        label: "Concentracao suspeita de precos",
        detail: "Muita gente caiu praticamente no mesmo valor. Vale acompanhar a evolucao publica disso.",
        variant: "warning"
      });
    }
  }

  const recentChanges = draft.entries.filter((entry) => entry.change && hoursAgo(entry.change.reportedAt) <= SYNC_WINDOW_HOURS);
  const upwardChanges = recentChanges.filter((entry) => entry.change?.direction === "up");
  const downwardChanges = recentChanges.filter((entry) => entry.change?.direction === "down");
  const strongestDirection = upwardChanges.length >= downwardChanges.length ? upwardChanges : downwardChanges;
  if (strongestDirection.length >= 3 && strongestDirection.length / draft.entries.length >= 0.45) {
    signals.push({
      kind: "synchronized_adjustment",
      label: "Reajuste muito sincronizado",
      detail: "Varios postos mudaram quase juntos no mesmo sentido. E um padrao que merece monitoramento.",
      variant: "warning"
    });
  }

  const regionAverage = averageByRegion.get(draft.regionKey);
  if (regionAverage && draft.entries.length >= 3 && draft.regionKey && averagePrice - regionAverage >= 0.12 && draft.key !== draft.regionKey) {
    signals.push({
      kind: "above_regional_average",
      label: "Acima da media regional",
      detail: "Este recorte esta cobrando acima do eixo regional para o mesmo combustivel.",
      variant: "danger"
    });
  }

  return signals;
}

function finalizeRows(drafts: GroupDraft[], scope: PanoramaRow["scope"], averageByRegion: Map<string, number>) {
  return drafts
    .filter((draft) => draft.entries.length > 0)
    .map((draft) => {
      const prices = draft.entries.map((entry) => Number(entry.report.price));
      const cheapest = [...draft.entries].sort((left, right) => Number(left.report.price) - Number(right.report.price))[0];
      const newestReportedAt = [...draft.entries]
        .sort((left, right) => new Date(right.report.reportedAt).getTime() - new Date(left.report.reportedAt).getTime())[0]!
        .report.reportedAt;
      const oldestReportedAt = [...draft.entries]
        .sort((left, right) => new Date(left.report.reportedAt).getTime() - new Date(right.report.reportedAt).getTime())[0]!
        .report.reportedAt;

      return {
        scope,
        key: draft.key,
        label: draft.label,
        regionKey: draft.regionKey,
        regionLabel: draft.regionLabel,
        cityLabel: draft.cityLabel,
        neighborhoodLabel: draft.neighborhoodLabel,
        minPrice: Math.min(...prices),
        averagePrice: mean(prices),
        maxPrice: Math.max(...prices),
        priceRange: Math.max(...prices) - Math.min(...prices),
        sampleSize: draft.entries.length,
        newestReportedAt,
        oldestReportedAt,
        signals: buildSignals(draft, averageByRegion),
        cheapestStation: {
          id: cheapest.station.id,
          name: getStationPublicName(cheapest.station),
          city: cheapest.station.city,
          neighborhood: cheapest.station.neighborhood,
          price: Number(cheapest.report.price),
          reportedAt: cheapest.report.reportedAt
        }
      } satisfies PanoramaRow;
    })
    .sort(sortByPriceThenAverage);
}

export function buildRegionalPricePanorama(stations: StationWithReports[], fuelType: FuelType): RegionalPricePanorama {
  const entries = buildEntries(stations, fuelType);
  const regionalDrafts = buildDrafts(entries, "region");
  const averageByRegion = new Map<string, number>(
    regionalDrafts.map((draft) => [draft.regionKey, mean(draft.entries.map((entry) => Number(entry.report.price)))])
  );

  const regionalRows = finalizeRows(regionalDrafts, "region", averageByRegion);
  const cityRows = finalizeRows(buildDrafts(entries, "city"), "city", averageByRegion);
  const neighborhoodRows = finalizeRows(buildDrafts(entries, "neighborhood"), "neighborhood", averageByRegion)
    .filter((row) => row.sampleSize >= 2);
  const highlightedRegion = regionalRows.find((row) => row.regionKey === "eixo-sul-fluminense") ?? regionalRows[0] ?? null;

  return {
    fuelType,
    generatedAt: new Date().toISOString(),
    totalReadings: entries.length,
    regionalRows,
    cityRows,
    neighborhoodRows,
    highlightedRegion,
    suspiciousSignals: [...regionalRows, ...cityRows, ...neighborhoodRows].reduce((sum, row) => sum + row.signals.length, 0)
  };
}
