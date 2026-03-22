export type FuelType = "gasolina_comum" | "gasolina_aditivada" | "etanol" | "diesel_s10" | "diesel_comum" | "gnv";

export type ReportStatus = "pending" | "approved" | "rejected" | "flagged";

export type StationSource = "anp" | "manual" | "osm_enriched";
export type GeoSource = "anp" | "osm" | "manual";
export type GeoConfidence = "high" | "medium" | "low";

export interface Station {
  id: string;
  name: string;
  brand: string;
  address: string;
  city: string;
  neighborhood: string;
  lat: number;
  lng: number;
  isActive: boolean;
  createdAt: string;
  cnpj?: string | null;
  source?: StationSource;
  sourceId?: string | null;
  officialStatus?: string;
  sigafStatus?: string | null;
  products?: string[] | null;
  distributorName?: string | null;
  lastSyncedAt?: string | null;
  importNotes?: string | null;
  geoSource?: GeoSource;
  geoConfidence?: GeoConfidence;
  updatedAt?: string | null;
}

export interface PriceReport {
  id: string;
  stationId: string;
  fuelType: FuelType;
  price: number;
  photoUrl: string;
  photoTakenAt: string | null;
  reportedAt: string;
  createdAt: string;
  reporterNickname: string | null;
  status: ReportStatus;
  moderationNote: string | null;
}

export interface StationWithReports extends Station {
  latestReports: PriceReport[];
  recentReports: PriceReport[];
  photoGallery: string[];
}

export interface ReportWithStation extends PriceReport {
  station: Pick<Station, "id" | "name" | "brand" | "city" | "neighborhood">;
}
