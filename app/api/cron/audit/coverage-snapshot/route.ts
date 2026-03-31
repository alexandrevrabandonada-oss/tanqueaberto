import { NextResponse, type NextRequest } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/ops/cron";
import { runTerritorialCoverageSnapshotJob } from "@/lib/ops/scheduler";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cadence = request.nextUrl.searchParams.get("cadence") === "cron_weekly" ? "cron_weekly" : "cron_daily";
  const result = await runTerritorialCoverageSnapshotJob({ cadence, triggeredBy: "cron" });
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
