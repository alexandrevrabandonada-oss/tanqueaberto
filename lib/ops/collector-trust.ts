import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { recordOperationalEvent } from "./logs";

export type TrustStage = 'new' | 'trusted' | 'very_trusted' | 'review_needed' | 'blocked';

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
 * Define o estágio de confiança baseado no score e volume
 */
export function getTrustStage(score: number, totalReports: number): TrustStage {
  if (score < 20) return 'blocked';
  if (score < 40) return 'review_needed';
  if (score >= 90 && totalReports >= 25) return 'very_trusted';
  if (score >= 70 && totalReports >= 5) return 'trusted';
  return 'new';
}

/**
 * Calcula o delta de score para um evento de moderação
 */
export function calculateScoreDelta(action: 'approve' | 'reject', reason?: string): number {
  if (action === 'approve') {
    return 2; // Ganho gradual (pode ser expandido conforme sinais de qualidade)
  }
  
  // Penalidades por rejeição
  if (reason?.includes('fraude') || reason?.includes('má fé') || reason?.includes('fake')) return -50;
  if (reason?.includes('duplicata')) return -5;
  if (reason?.includes('foto ruim') || reason?.includes('preco errado')) return -8;
  
  return -12; // Default rejection penalty
}

/**
 * Garante que o coletor existe na tabela de trust e retorna seus dados
 */
export async function getOrCreateCollectorTrust(nickname: string | null, ipHash: string | null): Promise<CollectorTrust> {
  const supabase = createSupabaseServiceClient();
  
  const { data, error } = await supabase
    .from('collector_trust')
    .select('*')
    .eq('nickname', nickname || '') // Handle null as empty string for unique constraint consistency if needed
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

  // Se não existe, cria (usando empty strings para cases nulos se a constraint for rígida)
  const defaultTrust: Partial<any> = {
    nickname: nickname || '',
    ip_hash: ipHash || '',
    score: 50,
    total_reports: 0,
    trust_stage: 'new'
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
      trustStage: 'new'
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
 * Atualiza o score após uma ação de moderação
 */
export async function updateCollectorScore(nickname: string | null, ipHash: string | null, action: 'approve' | 'reject', reason?: string) {
  const supabase = createSupabaseServiceClient();
  const delta = calculateScoreDelta(action, reason);
  
  // Primeiro garantimos que existe
  const current = await getOrCreateCollectorTrust(nickname, ipHash);
  
  const nextScore = Math.max(0, Math.min(100, current.score + delta));
  const nextTotal = current.totalReports + 1;
  const nextApproved = current.approvedReports + (action === 'approve' ? 1 : 0);
  const nextRejected = current.rejectedReports + (action === 'reject' ? 1 : 0);
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
    reason: action,
    payload: {
      action,
      reason,
      delta,
      newScore: nextScore,
      newStage: nextStage
    }
  });
}
