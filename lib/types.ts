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
  geoReviewStatus?: "ok" | "pending" | "manual_review";
  nameOfficial?: string | null;
  namePublic?: string | null;
  priorityScore?: number;
  visibilityStatus?: "public" | "review" | "hidden";
  curationNote?: string | null;
  coordinateReviewedAt?: string | null;
  releaseStatus?: "ready" | "validating" | "limited" | "hidden";
  distance?: number; // In meters
  updatedAt?: string | null;
}

export interface PriceReport {
  id: string;
  stationId: string;
  fuelType: FuelType;
  price: number;
  photoUrl: string;
  photoTakenAt: string | null;
  observedAt: string;
  submittedAt: string;
  reportedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  reporterNickname: string | null;
  ipHash: string | null;
  status: ReportStatus;
  moderationNote: string | null;
  moderationReason: string | null;
  moderatedBy: string | null;
  sourceKind: "community" | "seed" | "official_reference" | "import" | "admin";
  photoHash: string | null;
  locationDistance: number | null;
  locationConfidence: "high" | "low" | "none" | null;
  reconciliationId: string | null;
  isConfirmation: boolean | null;
  metadata: Record<string, any> | null;
  version: number;
}

export interface StationWithReports extends Station {
  latestReports: PriceReport[];
  recentReports: PriceReport[];
  photoGallery: string[];
}

export interface ReportWithStation extends PriceReport {
  station: Pick<Station, "id" | "name" | "brand" | "city" | "neighborhood">;
  priorityScore?: number;
  collectorTrustScore?: number;
  collectorTrustStage?: "new" | "trusted" | "review_needed" | "blocked";
}
