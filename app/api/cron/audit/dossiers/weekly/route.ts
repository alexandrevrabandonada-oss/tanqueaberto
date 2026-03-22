import { NextResponse, type NextRequest } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/ops/cron";
import { runAuditDossiersJob } from "@/lib/ops/scheduler";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runAuditDossiersJob({ cadence: "cron_weekly", triggeredBy: "cron" });
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
