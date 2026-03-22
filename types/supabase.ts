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
  cnpj?: string | null;
  source?: string;
  source_id?: string | null;
  official_status?: string;
  sigaf_status?: string | null;
  products?: string[] | null;
  distributor_name?: string | null;
  last_synced_at?: string | null;
  import_notes?: string | null;
  geo_source?: string;
  geo_confidence?: string;
  geo_review_status?: string;
  name_official?: string | null;
  name_public?: string | null;
  priority_score?: number;
  visibility_status?: string;
  curation_note?: string | null;
  coordinate_reviewed_at?: string | null;
  updated_at?: string | null;
}

export interface PriceReportRow {
  id: string;
  station_id: string;
  fuel_type: "gasolina_comum" | "gasolina_aditivada" | "etanol" | "diesel_s10" | "diesel_comum" | "gnv";
  price: number;
  photo_url: string;
  photo_taken_at: string | null;
  observed_at?: string | null;
  submitted_at?: string | null;
  reported_at: string;
  approved_at?: string | null;
  rejected_at?: string | null;
  created_at: string;
  reporter_nickname: string | null;
  status: "pending" | "approved" | "rejected" | "flagged";
  moderation_note: string | null;
  moderation_reason?: string | null;
  moderated_by?: string | null;
  source_kind?: string;
  photo_hash?: string | null;
  version?: number;
}

export interface PriceReportAuditEventRow {
  id: string;
  report_id: string;
  event_type: "created" | "moderated" | "revised" | "exported";
  payload: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
}
