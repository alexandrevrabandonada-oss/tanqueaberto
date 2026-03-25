export type SurfaceType = 
  | "CRITICAL_ALERT" 
  | "CONTEXT_HANDOFF" 
  | "MISSION_STATUS"
  | "ONBOARDING" 
  | "OPERATIONAL_RETENTION"
  | "STREET_MODE_PROMPT"
  | "ACTION_PROMPT" 
  | "INFO_NOTICE";

export const SURFACE_PRIORITIES: Record<SurfaceType, number> = {
  CRITICAL_ALERT: 100,      // Conexão offline, erro fatal
  CONTEXT_HANDOFF: 90,     // Volta de navegação externa
  MISSION_STATUS: 80,      // Assistente de Rota (RouteAssistant)
  ONBOARDING: 70,          // Guia de primeira visita
  OPERATIONAL_RETENTION: 60, // Retomada de missão, Pendência offline
  STREET_MODE_PROMPT: 50,  // Convite para Modo Rua
  ACTION_PROMPT: 40,       // Instalar PWA, Missão sugerida
  INFO_NOTICE: 20          // Beta fechado, Aviso territorial
};

export function getTopSurfaces(activeSurfaces: SurfaceType[], limit = 2): SurfaceType[] {
  return [...activeSurfaces]
    .sort((a, b) => SURFACE_PRIORITIES[b] - SURFACE_PRIORITIES[a])
    .slice(0, limit);
}
