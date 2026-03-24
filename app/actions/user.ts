"use server";

import { getOrCreateCollectorTrust, getUtilityStatus, type UtilityStatus, type CollectorTrust } from "@/lib/ops/collector-trust";

export async function getUtilityStatusAction(nickname: string | null, ipHash: string | null): Promise<{
  trust: CollectorTrust;
  status: UtilityStatus;
} | null> {
  try {
    const trust = await getOrCreateCollectorTrust(nickname, ipHash);
    const status = getUtilityStatus(trust);
    
    return { trust, status };
  } catch (error) {
    console.error("Failed to fetch utility status", error);
    return null;
  }
}
