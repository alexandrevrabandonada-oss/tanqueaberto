import type { NextRequest } from "next/server";

export function isAuthorizedCronRequest(request: NextRequest) {
  const expected = process.env.OPS_CRON_SECRET ?? process.env.CRON_SECRET ?? null;
  const providedHeader = request.headers.get("x-cron-secret");
  const providedQuery = request.nextUrl.searchParams.get("secret");

  if (!expected) {
    return request.headers.get("x-vercel-cron") === "1" || request.headers.get("user-agent")?.includes("vercel-cron");
  }

  return providedHeader === expected || providedQuery === expected || request.headers.get("x-vercel-cron") === "1";
}
