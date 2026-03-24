import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { recordOperationalEvent } from "./logs";

export type TrustStage = 'novo' | 'confiável' | 'muito_confiável' | 'em_revisão' | 'bloqueado';

export interface CollectorTrust {
  nickname: string | null;
  ipHash: string | null;
  score: number;
  totalReports: number;
  approvedReports: number;
  rejectedReports: number;
  trustStage: TrustStage;
}

/**
 * Define o estágio de confiança baseado no score e volume real
 */
export function getTrustStage(score: number, totalReports: number): TrustStage {
  if (score < 20) return 'bloqueado';
  if (score < 45) return 'em_revisão';
  if (score >= 90 && totalReports >= 15) return 'muito_confiável';
  if (score >= 70 && totalReports >= 3) return 'confiável';
  return 'novo';
}

/**
 * Interface para os sinais de qualidade de um envio
 */
export interface ReputationSignals {
  action: 'approve' | 'reject';
  reason?: string;
  photoQuality?: number; // 0-100
  locationConfidence?: 'high' | 'low';
  isConsistencyBonus?: boolean;
}

/**
 * Calcula o delta de score considerando múltiplos sinais operacionais
 */
export function calculateScoreDelta(signals: ReputationSignals): number {
  let delta = 0;

  if (signals.action === 'approve') {
    delta += 2; // Ganho base por aprovação

    // Bônus de Qualidade de Foto (Heurística)
    if (signals.photoQuality && signals.photoQuality >= 85) delta += 3;
    
    // Bônus de Proximidade (Geo Confidence)
    if (signals.locationConfidence === 'high') delta += 2;

    // Bônus de Consistência (Mesmo posto/região recorrente)
    if (signals.isConsistencyBonus) delta += 1;
  } else {
    // Penalidades por rejeição (Gravidade)
    if (signals.reason?.includes('fraude') || signals.reason?.includes('fake')) {
      return -60; // Penalidade crítica
    }
    
    if (signals.reason?.includes('duplicata')) delta -= 10;
    if (signals.reason?.includes('foto ruim')) delta -= 8;
    if (signals.reason?.includes('preco errado')) delta -= 12;
    
    if (delta === 0) delta = -15; // Default rejection penalty
  }
  
  return delta;
}

/**
 * Garante que o coletor existe na tabela de trust e retorna seus dados
 */
export async function getOrCreateCollectorTrust(nickname: string | null, ipHash: string | null): Promise<CollectorTrust> {
  const supabase = createSupabaseServiceClient();
  
  const { data, error } = await supabase
    .from('collector_trust')
    .select('*')
    .eq('nickname', nickname || '')
    .eq('ip_hash', ipHash || '')
    .maybeSingle();

  if (data) {
    return {
      nickname: data.nickname,
      ipHash: data.ip_hash,
      score: data.score,
      totalReports: data.total_reports,
      approvedReports: data.approved_reports,
      rejectedReports: data.rejected_reports,
      trustStage: data.trust_stage as TrustStage
    };
  }

  const defaultTrust = {
    nickname: nickname || '',
    ip_hash: ipHash || '',
    score: 50,
    total_reports: 0,
    trust_stage: 'novo' as TrustStage
  };

  const { data: created, error: createError } = await supabase
    .from('collector_trust')
    .insert(defaultTrust)
    .select('*')
    .single();

  if (createError) {
    console.error("Failed to create collector trust", createError);
    return {
      nickname,
      ipHash,
      score: 50,
      totalReports: 0,
      approvedReports: 0,
      rejectedReports: 0,
      trustStage: 'novo'
    };
  }

  return {
    nickname: created.nickname,
    ipHash: created.ip_hash,
    score: created.score,
    totalReports: created.total_reports,
    approvedReports: created.approved_reports,
    rejectedReports: created.rejected_reports,
    trustStage: created.trust_stage as TrustStage
  };
}

/**
 * Atualiza o score após uma ação de moderação, processando sinais
 */
export async function updateCollectorScore(
  nickname: string | null, 
  ipHash: string | null, 
  signals: ReputationSignals
) {
  const supabase = createSupabaseServiceClient();
  const delta = calculateScoreDelta(signals);
  
  const current = await getOrCreateCollectorTrust(nickname, ipHash);
  
  const nextScore = Math.max(0, Math.min(100, current.score + delta));
  const nextTotal = current.totalReports + 1;
  const nextApproved = current.approvedReports + (signals.action === 'approve' ? 1 : 0);
  const nextRejected = current.rejectedReports + (signals.action === 'reject' ? 1 : 0);
  const nextStage = getTrustStage(nextScore, nextTotal);

  await supabase
    .from('collector_trust')
    .update({
      score: nextScore,
      total_reports: nextTotal,
      approved_reports: nextApproved,
      rejected_reports: nextRejected,
      trust_stage: nextStage,
      last_report_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('nickname', nickname || '')
    .eq('ip_hash', ipHash || '');

  await recordOperationalEvent({
    eventType: 'collector_trust_updated',
    severity: delta < 0 ? 'warning' : 'info',
    scopeType: 'collector',
    scopeId: `${nickname || 'anon'}:${ipHash || 'unknown'}`,
    reason: signals.action,
    payload: {
      action: signals.action,
      reason: signals.reason,
      delta,
      newScore: nextScore,
      newStage: nextStage,
      signals
    }
  });
}
