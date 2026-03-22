export type FuelType = "gasolina_comum" | "gasolina_aditivada" | "etanol" | "diesel_s10" | "diesel_comum" | "gnv";

export type ReportStatus = "pending" | "approved" | "rejected" | "flagged";

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
