import { NextResponse, type NextRequest } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/ops/cron";
import { runAuditRefreshJob } from "@/lib/ops/scheduler";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runAuditRefreshJob({ cadence: "cron_daily", triggeredBy: "cron" });
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
