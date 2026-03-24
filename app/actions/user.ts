"use server";

import { getOrCreateCollectorTrust, getUtilityStatus, type UtilityStatus, type CollectorTrust } from "@/lib/ops/collector-trust";

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
    console.error("Failed to fetch utility status", error);
    return null;
  }
}
