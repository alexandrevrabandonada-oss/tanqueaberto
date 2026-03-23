export type ProductTelemetryEventType =
  | "home_opened"
  | "home_search_used"
  | "station_clicked"
  | "station_opened"
  | "submit_opened"
  | "submission_camera_opened"
  | "camera_opened_from_station"
  | "submission_started"
  | "submission_step"
  | "submission_draft_restored"
  | "submission_photo_reselected"
  | "submission_photo_lost"
  | "submission_abandoned_before_photo"
  | "submission_abandoned_after_photo"
  | "submission_retry_clicked"
  | "submission_series_continued"
  | "submission_queue_added"
  | "submission_queue_retried"
  | "submission_queue_completed"
  | "submission_queue_discarded"
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
