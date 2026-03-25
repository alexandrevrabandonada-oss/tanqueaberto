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
  streakDays: number;
  missionsCompleted: number;
  lastReportAt?: string | null;
  isTester?: boolean;
}

export type UtilityRole = 'iniciante' | 'ativo' | 'senior' | 'revisão' | 'bloqueado';

export interface UtilityStatus {
  role: UtilityRole;
  label: string;
  description: string;
  nextStep: string;
  color: string;
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
    .select('nickname, ip_hash, score, total_reports, approved_reports, rejected_reports, trust_stage, streak_days, missions_completed, last_report_at, is_tester')
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
      trustStage: data.trust_stage as TrustStage,
      streakDays: data.streak_days || 0,
      missionsCompleted: data.missions_completed || 0,
      lastReportAt: data.last_report_at,
      isTester: !!data.is_tester
    };
  }

  const defaultTrust = {
    nickname: nickname || '',
    ip_hash: ipHash || '',
    score: 50,
    total_reports: 0,
    trust_stage: 'novo' as TrustStage,
    streak_days: 0,
    missions_completed: 0,
    is_tester: false
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
      trustStage: 'novo',
      streakDays: 0,
      missionsCompleted: 0
    };
  }

  return {
    nickname: created.nickname,
    ipHash: created.ip_hash,
    score: created.score,
    totalReports: created.total_reports,
    approvedReports: created.approved_reports,
    rejectedReports: created.rejected_reports,
    trustStage: created.trust_stage as TrustStage,
    streakDays: created.streak_days || 0,
    missionsCompleted: created.missions_completed || 0,
    lastReportAt: created.last_report_at,
    isTester: !!created.is_tester
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
  const current = await getOrCreateCollectorTrust(nickname, ipHash);
  
  const now = new Date();
  const lastReportAt = current.lastReportAt ? new Date(current.lastReportAt) : null;
  
  let nextStreak = current.streakDays;
  if (!lastReportAt) {
    nextStreak = 1;
  } else {
    const hoursSinceLast = (now.getTime() - lastReportAt.getTime()) / (1000 * 3600);
    
    if (hoursSinceLast < 24) {
      // Já reportou hoje, mantém a streak
      nextStreak = current.streakDays || 1;
    } else if (hoursSinceLast < 48) {
      // Reportou ontem, incrementa
      nextStreak = (current.streakDays || 0) + 1;
    } else {
      // Quebrou a streak
      nextStreak = 1;
    }
  }

  const delta = calculateScoreDelta({ ...signals, isConsistencyBonus: nextStreak > 1 });
  
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
      streak_days: nextStreak,
      last_report_at: now.toISOString(),
      updated_at: now.toISOString()
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

/**
 * Mapeia o estado técnico para uma função de utilidade cívica com próximos passos contextuais
 */
export function getUtilityStatus(
  trust: CollectorTrust, 
  context?: { hasMission?: boolean; hasPending?: boolean }
): UtilityStatus {
  if (trust.trustStage === 'bloqueado') {
    return {
      role: 'bloqueado',
      label: 'Acesso Restrito',
      description: 'Sua conta está sob análise devido a envios inconsistentes.',
      nextStep: 'Aguarde a revisão da moderação.',
      color: 'red'
    };
  }

  if (trust.trustStage === 'em_revisão' || trust.score < 50) {
    return {
      role: 'revisão',
      label: 'Em Verificação',
      description: 'Estamos validando a precisão dos seus primeiros envios.',
      nextStep: context?.hasPending 
        ? 'Sincronize seus envios pendentes para avaliação.'
        : 'Continue coletando com atenção às fotos e preços.',
      color: 'amber'
    };
  }

  // SENIOR: Alta confiança + volume + missões
  if (trust.trustStage === 'muito_confiável' || (trust.approvedReports >= 20 && trust.streakDays >= 3)) {
    return {
      role: 'senior',
      label: 'Mantenedor Senior',
      description: 'Você é um pilar da rede. Suas confirmações têm peso imediato.',
      nextStep: context?.hasMission 
        ? 'Continue sua missão para manter a cobertura territorial.'
        : 'Focar em lacunas de dados críticas (High Priority Gaps).',
      color: 'indigo'
    };
  }

  // ATIVO: Já conhece o fluxo e tem constância
  if (trust.approvedReports >= 5 || trust.streakDays >= 2) {
    return {
      role: 'ativo',
      label: 'Colaborador Ativo',
      description: 'Sua regularidade mantém o mapa atualizado e confiável.',
      nextStep: context?.hasMission 
        ? 'Finalize sua missão ativa para subir de nível.'
        : 'Complete uma missão de grupo para ganhar mais score.',
      color: 'green'
    };
  }

  // INICIANTE: Primeiros passos
  return {
    role: 'iniciante',
    label: 'Coletor Iniciante',
    description: 'Começando a jornada de transparência territorial.',
    nextStep: context?.hasMission
      ? 'Complete sua primeira missão para validar seu status.'
      : 'Realize seu primeiro envio para validar o status.',
    color: 'blue'
  };
}
