export interface StationRow {
  id: string;
  name: string;
  brand: string;
  address: string;
  city: string;
  neighborhood: string;
  lat: number;
  lng: number;
  is_active: boolean;
  created_at: string;
}

export interface PriceReportRow {
  id: string;
  station_id: string;
  fuel_type: "gasolina_comum" | "gasolina_aditivada" | "etanol" | "diesel_s10" | "diesel_comum" | "gnv";
  price: number;
  photo_url: string;
  photo_taken_at: string | null;
  reported_at: string;
  created_at: string;
  reporter_nickname: string | null;
  status: "pending" | "approved" | "rejected" | "flagged";
  moderation_note: string | null;
}
