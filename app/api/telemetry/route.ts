import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { recordOperationalEvent } from "@/lib/ops/logs";
import { getSubmissionClientIp, hashSubmissionIp } from "@/lib/ops/rate-limit";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const currentHeaders = await headers();
  const ip = getSubmissionClientIp(currentHeaders as Headers);
  const payload = (body.payload as Record<string, unknown> | undefined) ?? {};

  await recordOperationalEvent({
    eventType: readString(body.eventType) || "telemetry_event",
    severity: "info",
    scopeType: readString(body.scopeType) || "product",
    scopeId: readString(body.scopeId) || readString(body.pagePath) || null,
    stationId: readString(body.stationId) || null,
    city: readString(body.city) || null,
    fuelType: readString(body.fuelType) || null,
    ipHash: hashSubmissionIp(ip),
    reason: readString(body.reason) || null,
    payload: {
      pagePath: readString(body.pagePath) || "/",
      pageTitle: readString(body.pageTitle) || null,
      source: readString(payload.source),
      queryLength: typeof payload.queryLength === "number" ? payload.queryLength : null,
      ...payload
    }
  });

  return NextResponse.json({ ok: true });
}
