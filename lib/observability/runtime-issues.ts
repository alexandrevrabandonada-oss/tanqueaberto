export type RuntimeIssueCategory =
  | "public_blocker"
  | "public_warning"
  | "ops_warning"
  | "ops_missing_schema"
  | "debug_noise";

export type RuntimeIssueScope = "public" | "ops" | "audit" | "admin" | "beta" | "internal";

export interface RuntimeIssueContext {
  scope: RuntimeIssueScope;
  surface: string;
  fallback?: string;
  optional?: boolean;
  schemaSensitive?: boolean;
}

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { code?: string; message?: string };
  return candidate.code ?? null;
}

function getErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { message?: string };
  return candidate.message ?? null;
}

export function isMissingSchemaError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "PGRST205" || /schema cache|table .* not found/i.test(candidate.message ?? "");
}

export function classifyRuntimeIssue(error: unknown, context: RuntimeIssueContext): RuntimeIssueCategory {
  const hasFallback = Boolean(context.fallback) || context.optional;

  if (isMissingSchemaError(error)) {
    return context.scope === "public" ? (hasFallback ? "public_warning" : "public_blocker") : "ops_missing_schema";
  }

  if (context.scope === "public") {
    return hasFallback ? "public_warning" : "public_blocker";
  }

  if (context.scope === "admin" || context.scope === "ops" || context.scope === "audit" || context.scope === "beta") {
    return hasFallback || context.schemaSensitive ? "ops_warning" : "ops_warning";
  }

  return hasFallback ? "debug_noise" : "ops_warning";
}

function formatContext(context: RuntimeIssueContext) {
  return `${context.scope}/${context.surface}`;
}

export function logRuntimeIssue(message: string, error: unknown, context: RuntimeIssueContext) {
  const category = classifyRuntimeIssue(error, context);
  if (category === "debug_noise") return category;

  const summary = {
    category,
    surface: formatContext(context),
    message,
    code: getErrorCode(error),
    fallback: context.fallback ?? null,
    error: getErrorMessage(error)
  };

  if (category === "public_blocker") {
    console.error(`[${category}] ${summary.surface}: ${message}`, summary);
    return category;
  }

  console.warn(`[${category}] ${summary.surface}: ${message}`, summary);
  return category;
}

