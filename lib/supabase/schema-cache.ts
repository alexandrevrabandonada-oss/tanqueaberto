export function isMissingSchemaError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "PGRST205" || /schema cache|table .* not found/i.test(candidate.message ?? "");
}

