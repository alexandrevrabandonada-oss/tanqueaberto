import { createHash } from "node:crypto";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { FuelType } from "@/lib/types";

export interface SubmissionRateLimitResult {
  allowed: boolean;
  attemptCount: number;
  blockedUntil: string | null;
  windowStart: string;
}

const SUBMISSION_WINDOW_MINUTES = 15;
const SUBMISSION_LIMIT = 3;

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

export function getSubmissionBucketKey(input: { ipHash: string; stationId: string; fuelType: FuelType; windowStart: string }) {
  return createHash("sha256").update(`${input.ipHash}:${input.stationId}:${input.fuelType}:${input.windowStart}`).digest("hex");
}

export async function checkSubmissionRateLimit(input: { ipHash: string; stationId: string; fuelType: FuelType }) {
  const supabase = createSupabaseServiceClient();
  const windowStart = getWindowStart(SUBMISSION_WINDOW_MINUTES);
  const bucketKey = getSubmissionBucketKey({ ipHash: input.ipHash, stationId: input.stationId, fuelType: input.fuelType, windowStart });
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
      reason: "proteção temporariamente indisponível"
    } as const;
  }

  if (existing?.blocked_until && new Date(existing.blocked_until).getTime() > Date.now()) {
    return {
      allowed: false,
      attemptCount: existing.attempt_count,
      blockedUntil: existing.blocked_until,
      windowStart,
      reason: "limite excedido"
    } as const;
  }

  const nextAttemptCount = (existing?.attempt_count ?? 0) + 1;
  const blockedUntil = nextAttemptCount > SUBMISSION_LIMIT ? new Date(Date.now() + SUBMISSION_WINDOW_MINUTES * 60 * 1000).toISOString() : null;

  const payload = {
    bucket_key: bucketKey,
    ip_hash: input.ipHash,
    station_id: input.stationId,
    fuel_type: input.fuelType,
    window_minutes: SUBMISSION_WINDOW_MINUTES,
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
      reason: "proteção temporariamente indisponível"
    } as const;
  }

  return {
    allowed: nextAttemptCount <= SUBMISSION_LIMIT,
    attemptCount: nextAttemptCount,
    blockedUntil,
    windowStart,
    reason: nextAttemptCount <= SUBMISSION_LIMIT ? null : "limite excedido"
  } as const;
}
