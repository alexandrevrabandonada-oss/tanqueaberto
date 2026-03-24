"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { getOrCreateCollectorTrust, type CollectorTrust } from "@/lib/ops/collector-trust";
import { getSubmissionClientIp, hashSubmissionIp } from "@/lib/ops/rate-limit";
import { headers } from "next/headers";

import { getRecorteActivity, getCollectorTerritorialImpact, type RecorteActivity, type CollectorTerritorialImpact } from "@/lib/ops/recorte-activity";
import { getHubRecommendations, type HubRecommendation } from "@/lib/ops/hub-recommendation";

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

    const trust = await getOrCreateCollectorTrust(nickname || null, ipHash);
    
    return trust;
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

/**
 * Busca o impacto territorial do coletor (onde ele é mais ativo)
 */
export async function getCollectorTerritorialImpactAction(nickname: string): Promise<CollectorTerritorialImpact | null> {
  try {
    if (!nickname) return null;
    return await getCollectorTerritorialImpact(nickname);
  } catch (error) {
    console.error("Failed to get collector territorial impact action", error);
    return null;
  }
}

/**
 * Busca recomendações personalizadas de próximos passos para o hub
 */
export async function getHubRecommendationsAction(
  nickname: string, 
  lat?: number, 
  lng?: number
): Promise<HubRecommendation[]> {
  try {
    if (!nickname) return [];
    return await getHubRecommendations(nickname, lat, lng);
  } catch (error) {
    console.error("Failed to get hub recommendations action", error);
    return [];
  }
}
