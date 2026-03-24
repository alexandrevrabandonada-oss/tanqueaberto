"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { getOrCreateCollectorTrust, type CollectorTrust } from "@/lib/ops/collector-trust";
import { getSubmissionClientIp, hashSubmissionIp } from "@/lib/ops/rate-limit";
import { headers } from "next/headers";

import { getRecorteActivity, type RecorteActivity } from "@/lib/ops/recorte-activity";

/**
 * Busca os dados de confiança do coletor atual baseado nos cookies/IP
 */
export async function getCollectorTrustAction(nickname?: string | null): Promise<CollectorTrust | null> {
  try {
    const currentHeaders = await headers();
    const ip = getSubmissionClientIp(currentHeaders as Headers);
    const ipHash = hashSubmissionIp(ip);

    // Se não tiver nickname nem IP (improvável), não retorna nada
    if (!nickname && !ipHash) return null;

    return await getOrCreateCollectorTrust(nickname || null, ipHash);
  } catch (error) {
    console.error("Failed to get collector trust action", error);
    return null;
  }
}

/**
 * Busca reforço de prova de vida para um recorte territorial
 */
export async function getTerritorialReinforcementAction(city: string, groupSlug?: string): Promise<RecorteActivity | null> {
  try {
    return await getRecorteActivity(city, groupSlug);
  } catch (error) {
    console.error("Failed to get territorial reinforcement action", error);
    return null;
  }
}
