import type { FeedbackCluster } from "./feedback-clustering";

export type FeedbackIssueCategory = 'UX' | 'INFRA' | 'TERRITORY' | 'OTHER';

export interface FeedbackPattern {
  category: FeedbackIssueCategory;
  count: number;
  tags: string[];
  recentMessages: string[];
  suggestedAction: string;
}

export interface OperationalSynthesis {
  workingWell: string[];
  blockedBy: string[];
  focusTomorrow: string;
  topPatterns: FeedbackPattern[];
  topClusters?: FeedbackCluster[];
}

export function analyzeFeedbackBatch(feedbacks: any[]): FeedbackPattern[] {
  const patterns: Record<FeedbackIssueCategory, { count: number, tags: Set<string>, messages: string[] }> = {
    UX: { count: 0, tags: new Set(), messages: [] },
    INFRA: { count: 0, tags: new Set(), messages: [] },
    TERRITORY: { count: 0, tags: new Set(), messages: [] },
    OTHER: { count: 0, tags: new Set(), messages: [] },
  };

  feedbacks.forEach(f => {
    const tags = f.triage_tags || [];
    let category: FeedbackIssueCategory = 'OTHER';

    if (tags.some((t: string) => ['camera', 'rede', 'erro_tecnico', 'envio'].includes(t))) {
      category = 'INFRA';
    } else if (tags.some((t: string) => ['confusa', 'fluxo', 'ux_confusa'].includes(t))) {
      category = 'UX';
    } else if (tags.some((t: string) => ['cobertura', 'vazio', 'distância', 'mapa', 'mapas'].includes(t))) {
      category = 'TERRITORY';
    }

    patterns[category].count++;
    tags.forEach((t: string) => patterns[category].tags.add(t));
    if (f.message && patterns[category].messages.length < 3) {
      patterns[category].messages.push(f.message.slice(0, 60) + '...');
    }
  });

  return Object.entries(patterns)
    .filter(([_, data]) => data.count > 0)
    .map(([category, data]) => ({
      category: category as FeedbackIssueCategory,
      count: data.count,
      tags: Array.from(data.tags),
      recentMessages: data.messages,
      suggestedAction: getSuggestedActionForCategory(category as FeedbackIssueCategory, Array.from(data.tags))
    }))
    .sort((a, b) => b.count - a.count);
}

function getSuggestedActionForCategory(category: FeedbackIssueCategory, tags: string[]): string {
  switch (category) {
    case 'INFRA':
      return "Verificar logs de erro técnicos e latência de upload.";
    case 'UX':
      return "Revisar fluxos de navegação e clareza dos botões mencionados.";
    case 'TERRITORY':
      return tags.includes('cobertura') ? "Aumentar raio de missões ou disparar alerta de 'Área Fria'." : "Auditar localização dos postos no mapa.";
    default:
      return "Monitorar evolução dos feedbacks de usuários.";
  }
}

import { clusterFeedbacks } from "./feedback-clustering";

export function generateOperationalSynthesis(feedbacks: any[], activity: any): OperationalSynthesis {
  const patterns = analyzeFeedbackBatch(feedbacks);
  const clusters = clusterFeedbacks(feedbacks);
  
  const workingWell = [];
  const blockedBy = [];
  
  if (activity.collaborationProgress > 50) workingWell.push("Densidade de cobertura atingindo maturidade.");
  if (activity.recentCollaboratorsCount > 10) workingWell.push("Base de coletores ativos em crescimento.");
  
  const topIssue = patterns[0];
  if (topIssue) {
    blockedBy.push(`Fricção em ${topIssue.category}: ${topIssue.suggestedAction}`);
  }

  if (activity.stationsAwaitingPhoto > activity.totalStations * 0.5) {
    blockedBy.push("Grande volume de lacunas aguardando primeira prova de vida.");
  }

  return {
    workingWell: workingWell.length > 0 ? workingWell : ["Operação estável em volume moderado."],
    blockedBy: blockedBy.length > 0 ? blockedBy : ["Sem bloqueios operacionais críticos reportados."],
    focusTomorrow: activity.collaborationProgress < 70 ? "Focar em conversão de lacunas em áreas cinzentas." : "Refinar qualidade das fotos e moderação.",
    topPatterns: patterns.slice(0, 2),
    topClusters: clusters.slice(0, 5)
  };
}
