import { createHash } from "node:crypto";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { FuelType } from "@/lib/types";

export interface SubmissionRateLimitResult {
  allowed: boolean;
  attemptCount: number;
  blockedUntil: string | null;
  windowStart: string;
  bucketKey: string;
  scopeKind: "ip" | "device" | "session" | "surface";
  reason: string | null;
}

function getWindowStart(windowMinutes: number, now = new Date()) {
  const start = new Date(now);
  const bucket = Math.floor(start.getTime() / (windowMinutes * 60 * 1000));
  return new Date(bucket * windowMinutes * 60 * 1000).toISOString();
}

export function hashSubmissionIp(ip: string) {
  return createHash("sha256").update(ip.trim()).digest("hex");
}

export function getSubmissionClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for") ?? "";
  const realIp = headers.get("x-real-ip") ?? "";
  const cfConnectingIp = headers.get("cf-connecting-ip") ?? "";
  const candidate = forwardedFor.split(",")[0]?.trim() || realIp.trim() || cfConnectingIp.trim();
  return candidate || "unknown";
}

function buildBucketKey(input: {
  scopeKind: SubmissionRateLimitResult["scopeKind"];
  scopeId: string;
  ipHash: string;
  stationId: string;
  fuelType: FuelType;
  windowStart: string;
}) {
  return createHash("sha256").update(`${input.scopeKind}:${input.scopeId}:${input.ipHash}:${input.stationId}:${input.fuelType}:${input.windowStart}`).digest("hex");
}

async function checkSubmissionRateLimitBucket(input: {
  scopeKind: SubmissionRateLimitResult["scopeKind"];
  scopeId: string;
  ipHash: string;
  stationId: string;
  fuelType: FuelType;
  windowMinutes: number;
  limit: number;
}) {
  const supabase = createSupabaseServiceClient();
  const windowStart = getWindowStart(input.windowMinutes);
  const bucketKey = buildBucketKey({
    scopeKind: input.scopeKind,
    scopeId: input.scopeId,
    ipHash: input.ipHash,
    stationId: input.stationId,
    fuelType: input.fuelType,
    windowStart
  });
  const now = new Date().toISOString();

  const { data: existing, error: lookupError } = await supabase
    .from("report_submission_rate_limits")
    .select("bucket_key,attempt_count,blocked_until,window_start,window_minutes")
    .eq("bucket_key", bucketKey)
    .eq("window_start", windowStart)
    .maybeSingle();

  if (lookupError) {
    return {
      allowed: false,
      attemptCount: 0,
      blockedUntil: now,
      windowStart,
      bucketKey,
      scopeKind: input.scopeKind,
      reason: "proteção temporariamente indisponível"
    } as const;
  }

  if (existing?.blocked_until && new Date(existing.blocked_until).getTime() > Date.now()) {
    return {
      allowed: false,
      attemptCount: existing.attempt_count,
      blockedUntil: existing.blocked_until,
      windowStart,
      bucketKey,
      scopeKind: input.scopeKind,
      reason: "limite excedido"
    } as const;
  }

  const nextAttemptCount = (existing?.attempt_count ?? 0) + 1;
  const blockedUntil = nextAttemptCount > input.limit ? new Date(Date.now() + input.windowMinutes * 60 * 1000).toISOString() : null;

  const payload = {
    bucket_key: bucketKey,
    ip_hash: input.ipHash,
    station_id: input.stationId,
    fuel_type: input.fuelType,
    scope_kind: input.scopeKind,
    window_minutes: input.windowMinutes,
    window_start: windowStart,
    attempt_count: nextAttemptCount,
    blocked_until: blockedUntil,
    last_attempt_at: now,
    updated_at: now
  };

  const { error: saveError } = await supabase.from("report_submission_rate_limits").upsert(payload, { onConflict: "bucket_key" });

  if (saveError) {
    return {
      allowed: false,
      attemptCount: 0,
      blockedUntil: now,
      windowStart,
      bucketKey,
      scopeKind: input.scopeKind,
      reason: "proteção temporariamente indisponível"
    } as const;
  }

  return {
    allowed: nextAttemptCount <= input.limit,
    attemptCount: nextAttemptCount,
    blockedUntil,
    windowStart,
    bucketKey,
    scopeKind: input.scopeKind,
    reason: nextAttemptCount <= input.limit ? null : "limite excedido"
  } as const;
}

export async function checkSubmissionRateLimit(input: {
  ipHash: string;
  stationId: string;
  fuelType: FuelType;
  deviceId?: string | null;
  sessionId?: string | null;
  surfaceType?: string | null;
  surfaceId?: string | null;
}) {
  const buckets = [
    { scopeKind: "ip" as const, scopeId: input.ipHash, windowMinutes: 15, limit: 3 },
    { scopeKind: "device" as const, scopeId: input.deviceId || input.ipHash, windowMinutes: 30, limit: 6 },
    { scopeKind: "session" as const, scopeId: input.sessionId || `${input.ipHash}:sessionless`, windowMinutes: 20, limit: 4 },
    { scopeKind: "surface" as const, scopeId: `${input.surfaceType || "submit"}:${input.surfaceId || input.stationId}`, windowMinutes: 8, limit: 3 }
  ];

  const results = [] as Array<Awaited<ReturnType<typeof checkSubmissionRateLimitBucket>>>;
  for (const bucket of buckets) {
    const result = await checkSubmissionRateLimitBucket({
      ...bucket,
      ipHash: input.ipHash,
      stationId: input.stationId,
      fuelType: input.fuelType
    });
    results.push(result);
    if (!result.allowed) {
      return {
        allowed: false,
        attemptCount: result.attemptCount,
        blockedUntil: result.blockedUntil,
        windowStart: result.windowStart,
        bucketKey: result.bucketKey,
        scopeKind: result.scopeKind,
        reason: result.reason ?? "limite excedido",
        results
      } as const;
    }
  }

  return {
    allowed: true,
    attemptCount: Math.max(...results.map((result) => result.attemptCount), 0),
    blockedUntil: null,
    windowStart: results[0]?.windowStart ?? new Date().toISOString(),
    bucketKey: results[0]?.bucketKey ?? "",
    scopeKind: results[0]?.scopeKind ?? "ip",
    reason: null,
    results
  } as const;
}

