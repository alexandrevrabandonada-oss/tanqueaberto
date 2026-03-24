import type { FeedbackIssueCategory } from "./feedback-analyzer";

export type OperationalActionType = 
  | 'REVISE_STATION' 
  | 'HOLD_ROLLOUT' 
  | 'ADJUST_RADIUS' 
  | 'NOTIFY_TEAM' 
  | 'NONE';

export interface StructuredOperationalAction {
  type: OperationalActionType;
  label: string;
  params: Record<string, any>;
}

export interface FeedbackCluster {
  id: string;
  motif: string;
  count: number;
  city?: string | null;
  stationId?: string | null;
  screenGroup?: string | null;
  tags: string[];
  recentMessages: string[];
  suggestedAction: string;
  suggestedActionData: StructuredOperationalAction;
  priority: 'baixa' | 'media' | 'alta';
}

export type FeedbackMotif = 
  | 'POSTO_AMBIGUO' 
  | 'CAMERA_FOTO' 
  | 'REDE_LATENCIA' 
  | 'MISSAO_RUIM' 
  | 'RECORTE_FRACO' 
  | 'MODERACAO_LENTA' 
  | 'UX_CONFUSA' 
  | 'OUTROS';

const MOTIF_LABELS: Record<FeedbackMotif, string> = {
  POSTO_AMBIGUO: "Posto Ambíguo ou Erro de Mapa",
  CAMERA_FOTO: "Problemas com Câmera/Foto",
  REDE_LATENCIA: "Instabilidade de Rede",
  MISSAO_RUIM: "Desenho de Missão Ineficiente",
  RECORTE_FRACO: "Falta de Postos ou Distância Alta",
  MODERACAO_LENTA: "Demora na Aprovação",
  UX_CONFUSA: "Atrito de Interface/UX",
  OUTROS: "Outros Feedbacks"
};

export function clusterFeedbacks(feedbacks: any[]): FeedbackCluster[] {
  const clusters: Record<string, FeedbackCluster> = {};

  feedbacks.forEach(f => {
    const motif = identifyMotif(f);
    const clusterKey = generateClusterKey(f, motif);

    if (!clusters[clusterKey]) {
      clusters[clusterKey] = {
        id: clusterKey,
        motif: MOTIF_LABELS[motif],
        count: 0,
        city: f.city,
        stationId: f.station_id,
        screenGroup: f.screen_group,
        tags: [],
        recentMessages: [],
        suggestedAction: getActionForMotif(motif, f),
        suggestedActionData: getStructuredActionForMotif(motif, f),
        priority: getPriorityForMotif(motif)
      };
    }

    clusters[clusterKey].count++;
    if (f.message && clusters[clusterKey].recentMessages.length < 3) {
      clusters[clusterKey].recentMessages.push(f.message);
    }
    
    if (f.triage_tags) {
      f.triage_tags.forEach((t: string) => {
        if (!clusters[clusterKey].tags.includes(t)) {
          clusters[clusterKey].tags.push(t);
        }
      });
    }
  });

  return Object.values(clusters).sort((a, b) => b.count - a.count);
}

function identifyMotif(f: any): FeedbackMotif {
  const msg = (f.message || "").toLowerCase();
  const tags = f.triage_tags || [];

  if (tags.includes('posto_ambiguo') || msg.includes('errado') || msg.includes('mapa') || msg.includes('localização')) return 'POSTO_AMBIGUO';
  if (tags.includes('camera') || tags.includes('foto') || msg.includes('camera') || msg.includes('foto') || msg.includes('qualidade')) return 'CAMERA_FOTO';
  if (tags.includes('rede') || msg.includes('lento') || msg.includes('internet') || msg.includes('carregar')) return 'REDE_LATENCIA';
  if (tags.includes('missao') || msg.includes('missao') || msg.includes('objetivo')) return 'MISSAO_RUIM';
  if (tags.includes('recorte_fraco') || msg.includes('distancia') || msg.includes('longe') || msg.includes('vazio')) return 'RECORTE_FRACO';
  if (tags.includes('moderacao_lenta') || msg.includes('fila') || msg.includes('demora') || msg.includes('aprov')) return 'MODERACAO_LENTA';
  if (tags.includes('ux_confusa') || msg.includes('confuso') || msg.includes('entendi') || msg.includes('botão')) return 'UX_CONFUSA';

  return 'OUTROS';
}

function generateClusterKey(f: any, motif: FeedbackMotif): string {
  // Group by motif and city if city exists, otherwise just motif
  const cityPart = f.city ? `city:${f.city}` : 'global';
  const stationPart = f.station_id ? `station:${f.station_id}` : 'no-station';
  
  // For some motifs, station granularity is key
  if (motif === 'POSTO_AMBIGUO' && f.station_id) {
    return `${motif}:${stationPart}`;
  }
  
  // For others, city is enough
  return `${motif}:${cityPart}`;
}

function getActionForMotif(motif: FeedbackMotif, f: any): string {
  return getStructuredActionForMotif(motif, f).label;
}

function getStructuredActionForMotif(motif: FeedbackMotif, f: any): StructuredOperationalAction {
  switch (motif) {
    case 'POSTO_AMBIGUO':
      return {
        type: 'REVISE_STATION',
        label: "Auditar coordenadas do posto e validar no mapa.",
        params: { stationId: f.station_id, city: f.city }
      };
    case 'CAMERA_FOTO':
      return {
        type: 'NOTIFY_TEAM',
        label: "Alertar time de Eng sobre latência de assets.",
        params: { screen: f.screen_group }
      };
    case 'REDE_LATENCIA':
      return {
        type: 'NOTIFY_TEAM',
        label: "Verificar estabilidade de rede por região.",
        params: { city: f.city }
      };
    case 'MISSAO_RUIM':
      return {
        type: 'ADJUST_RADIUS',
        label: "Aumentar raio de detecção para mitigar erro de GPS.",
        params: { city: f.city }
      };
    case 'RECORTE_FRACO':
      return {
        type: 'HOLD_ROLLOUT',
        label: "Retroceder estágio (Rollback) por falta de densidade.",
        params: { groupSlug: f.page_context?.includes('group:') ? f.page_context.split(':')[1] : null, city: f.city }
      };
    case 'MODERACAO_LENTA':
      return {
        type: 'NOTIFY_TEAM',
        label: "Escalar fila de moderação para este território.",
        params: { city: f.city }
      };
    case 'UX_CONFUSA':
      return {
        type: 'NOTIFY_TEAM',
        label: "Sinalizar atrito de UX para revisão de design.",
        params: { screen: f.screen_group }
      };
    default:
      return {
        type: 'NONE',
        label: "Monitorar evolução do sentimento do coletor.",
        params: {}
      };
  }
}

function getPriorityForMotif(motif: FeedbackMotif): 'baixa' | 'media' | 'alta' {
  if (['CAMERA_FOTO', 'POSTO_AMBIGUO'].includes(motif)) return 'alta';
  if (['REDE_LATENCIA', 'MODERACAO_LENTA', 'MISSAO_RUIM'].includes(motif)) return 'media';
  return 'baixa';
}

export function generateCopiableSummary(clusters: FeedbackCluster[]): string {
  const totalItems = clusters.reduce((acc, c) => acc + c.count, 0);
  let summary = `Resumo Voz da Rua - ${new Date().toLocaleDateString('pt-BR')}\n`;
  summary += `Total de retornos: ${totalItems}\n\n`;

  clusters.slice(0, 5).forEach((c, i) => {
    summary += `${i + 1}. [${c.priority.toUpperCase()}] ${c.motif} (${c.count} ocorrências)\n`;
    if (c.city) summary += `   Local: ${c.city}\n`;
    summary += `   Ação Sugerida: ${c.suggestedAction}\n\n`;
  });

  return summary;
}
