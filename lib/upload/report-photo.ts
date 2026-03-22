export const REPORT_PHOTO_BUCKET = "price-report-photos";
export const MAX_REPORT_PHOTO_SIZE = 5 * 1024 * 1024;
export const ALLOWED_REPORT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

function cleanSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function buildReportPhotoPath(stationId: string, suffix: string) {
  return `reports/${cleanSegment(stationId)}/${suffix}`;
}

export function validateReportPhoto(file: File) {
  if (!ALLOWED_REPORT_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_REPORT_PHOTO_TYPES)[number])) {
    return "Envie uma foto em JPG, PNG ou WEBP.";
  }

  if (file.size > MAX_REPORT_PHOTO_SIZE) {
    return "A foto precisa ter no máximo 5 MB.";
  }

  return null;
}
