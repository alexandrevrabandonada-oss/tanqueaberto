import { type RecorteActivity } from "./recorte-activity";

export type SmartActionKind = 'MISSION' | 'GAP_HUNT' | 'REDUCE_SILENCE' | 'MOVE_TO_HOTSPOT' | 'CHECK_RECENT_STATION';

export interface SmartAction {
  kind: SmartActionKind;
  label: string;
  description: string;
  link: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

export function getSuggestedCollectorAction(city: string, activity: RecorteActivity): SmartAction {
  // Heurísticas de Smart Action
  
  // 1. Prioridade Máxima: Área com pouquíssima cobertura
  if (activity.collaborationProgress < 30) {
    return {
      kind: 'MISSION',
      label: "Explorar este Recorte Agora",
      description: "Área branca detectada. Seja o primeiro a mapear este território.",
      link: "/beta/missoes",
      priority: 'high',
      icon: 'Zap'
    };
  }

  // 2. Muitos postos sem foto
  if (activity.stationsAwaitingPhoto > 5) {
    return {
      kind: 'GAP_HUNT',
      label: "Completar Fotos Pendentes",
      description: `Há ${activity.stationsAwaitingPhoto} postos sem prova de vida em ${city}.`,
      link: "/postos/sem-foto",
      priority: 'high',
      icon: 'Camera'
    };
  }

  // 3. Área Fria (Inatividade)
  if (activity.status === 'weak') {
    return {
      kind: 'REDUCE_SILENCE',
      label: "Reativar Coleta Local",
      description: "Nenhum preço reportado recentemente. Vamos quebrar o silêncio?",
      link: "/enviar",
      priority: 'medium',
      icon: 'Mic'
    };
  }

  // 4. Área Quente mas com postos antigos
  if (activity.collaborationProgress > 70 && activity.collaborationDensity < 40) {
    return {
      kind: 'CHECK_RECENT_STATION',
      label: "Validar Posto Próximo",
      description: "A cobertura está boa, mas precisamos garantir que os preços ainda são reais.",
      link: "/",
      priority: 'low',
      icon: 'CheckCircle2'
    };
  }

  // 5. Default: Manter cobertura
  return {
    kind: 'MOVE_TO_HOTSPOT',
    label: "Explorar Área Ativa",
    description: "Continue o bom trabalho mantendo os preços atualizados.",
    link: "/",
    priority: 'low',
    icon: 'MapPin'
  };
}
