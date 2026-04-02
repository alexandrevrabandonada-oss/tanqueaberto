export function isMissingSchemaError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "PGRST204"
    || candidate.code === "PGRST205"
    || /schema cache|not found|does not exist|could not find/i.test(candidate.message ?? "");
}

