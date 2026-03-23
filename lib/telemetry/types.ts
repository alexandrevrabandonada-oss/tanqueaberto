export type ProductTelemetryEventType =
  | "home_opened"
  | "home_search_used"
  | "station_clicked"
  | "station_opened"
  | "submit_opened"
  | "submission_started"
  | "submission_step"
  | "submission_abandoned"
  | "submission_failed"
  | "submission_accepted"
  | "audit_opened"
  | "feedback_opened"
  | "beta_feedback_received";

export interface ProductTelemetryEventInput {
  eventType: ProductTelemetryEventType;
  pagePath: string;
  pageTitle?: string | null;
  stationId?: string | null;
  city?: string | null;
  fuelType?: string | null;
  scopeType?: string | null;
  scopeId?: string | null;
  reason?: string | null;
  payload?: Record<string, unknown>;
}

