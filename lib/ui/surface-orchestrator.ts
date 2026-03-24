export type SurfaceType = 
  | "CRITICAL_ALERT" 
  | "CONTEXT_HANDOFF" 
  | "ONBOARDING" 
  | "ACTION_PROMPT" 
  | "INFO_NOTICE";

export interface SurfacePriority {
  type: SurfaceType;
  priority: number;
}

export const SURFACE_PRIORITIES: Record<SurfaceType, number> = {
  CRITICAL_ALERT: 100,  // Conexão offline, erro fatal
  CONTEXT_HANDOFF: 80, // Volta de navegação externa
  ONBOARDING: 60,      // Guia de primeira visita
  ACTION_PROMPT: 40,   // Instalar PWA, Missão sugerida
  INFO_NOTICE: 20      // Beta fechado, Aviso territorial
};

export function getTopSurfaces(activeSurfaces: SurfaceType[], limit = 2): SurfaceType[] {
  return [...activeSurfaces]
    .sort((a, b) => SURFACE_PRIORITIES[b] - SURFACE_PRIORITIES[a])
    .slice(0, limit);
}
