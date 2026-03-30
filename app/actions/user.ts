"use server";

import { headers } from "next/headers";

import { getOrCreateCollectorTrust, findCollectorTrust, getUtilityStatus, type UtilityStatus, type CollectorTrust } from "@/lib/ops/collector-trust";
import { getSubmissionClientIp, hashSubmissionIp } from "@/lib/ops/rate-limit";
import type { ProgressiveIdentityRemoteSnapshot } from "@/lib/identity/progressive";
import { logRuntimeIssue } from "@/lib/observability/runtime-issues";

export async function getUtilityStatusAction(
  nickname: string | null,
  ipHash: string | null,
  context?: { hasMission?: boolean; hasPending?: boolean }
): Promise<{
  trust: CollectorTrust;
  status: UtilityStatus;
} | null> {
  try {
    const trust = await getOrCreateCollectorTrust(nickname, ipHash);
    const status = getUtilityStatus(trust, context);

    return { trust, status };
  } catch (error) {
    logRuntimeIssue("Failed to fetch utility status", error, { scope: "public", surface: "actions/user.getUtilityStatusAction", fallback: "return-null", optional: true });
    return null;
  }
}

export async function getProgressiveIdentityAction(
  nickname?: string | null,
  context?: { hasMission?: boolean; hasPending?: boolean }
): Promise<ProgressiveIdentityRemoteSnapshot> {
  try {
    const currentHeaders = await headers();
    const ip = getSubmissionClientIp(currentHeaders as Headers);
    const ipHash = hashSubmissionIp(ip);
    const trust = await findCollectorTrust(nickname || null, ipHash);

    if (!trust) {
      return { trust: null, status: null };
    }

    return {
      trust,
      status: getUtilityStatus(trust, context)
    };
  } catch (error) {
    logRuntimeIssue("Failed to fetch progressive identity", error, { scope: "public", surface: "actions/user.getProgressiveIdentityAction", fallback: "return-null", optional: true });
    return { trust: null, status: null };
  }
}


