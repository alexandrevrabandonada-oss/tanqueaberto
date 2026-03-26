export type HomePriorityState =
  | "critical-offline"
  | "mission-active"
  | "first-visit"
  | "street-mode"
  | "operation-normal"
  | "senior-hub";

export interface HomeOrchestrationInput {
  online: boolean;
  geoError: string | null;
  missionActive: boolean;
  role: string | null;
  submissionsCount: number;
  recentCount: number;
  favoriteCount: number;
  streetMode: boolean;
  isWarm: boolean;
  isRefreshing: boolean;
  selectedCity: string;
  hasFilters: boolean;
}

export interface HomeOrchestration {
  state: HomePriorityState;
  label: string;
  subtitle: string;
  showGuide: boolean;
  showSecondaryShelf: boolean;
  showQuickAccess: boolean;
  showMemoryBar: boolean;
  showTerritoryWidget: boolean;
  showFilters: boolean;
  showIntroLead: boolean;
}

export function orchestrateHomeState(input: HomeOrchestrationInput): HomeOrchestration {
  const isTrueBeginner = input.role === "iniciante" && input.submissionsCount === 0;
  const isSenior = input.role === "senior";
  const hasOperationalDepth = input.favoriteCount > 0 || input.recentCount > 0 || input.submissionsCount > 0;
  const isOfflineSevere = !input.online || Boolean(input.geoError && !input.isWarm && !input.isRefreshing);

  if (isOfflineSevere) {
    return {
      state: "critical-offline",
      label: "Offline severo",
      subtitle: "A leitura prioriza a recuperação da conexão e do cache antes de qualquer outra explicação.",
      showGuide: false,
      showSecondaryShelf: false,
      showQuickAccess: false,
      showMemoryBar: false,
      showTerritoryWidget: false,
      showFilters: false,
      showIntroLead: false,
    };
  }

  if (input.missionActive) {
    return {
      state: "mission-active",
      label: "Missão ativa",
      subtitle: "A home mostra a missão e reduz o ruído lateral para o próximo envio.",
      showGuide: false,
      showSecondaryShelf: false,
      showQuickAccess: false,
      showMemoryBar: false,
      showTerritoryWidget: false,
      showFilters: false,
      showIntroLead: false,
    };
  }

  if (isTrueBeginner) {
    return {
      state: "first-visit",
      label: "Primeira visita",
      subtitle: "A primeira dobra fica orientada para ativação clara, sem competição visual.",
      showGuide: true,
      showSecondaryShelf: false,
      showQuickAccess: false,
      showMemoryBar: false,
      showTerritoryWidget: false,
      showFilters: false,
      showIntroLead: false,
    };
  }

  if (input.streetMode) {
    return {
      state: "street-mode",
      label: "Modo rua",
      subtitle: "A home fica mais direta para operação de campo e retomada de fluxo.",
      showGuide: false,
      showSecondaryShelf: true,
      showQuickAccess: true,
      showMemoryBar: true,
      showTerritoryWidget: Boolean(input.selectedCity),
      showFilters: false,
      showIntroLead: false,
    };
  }

  if (isSenior || hasOperationalDepth) {
    return {
      state: "senior-hub",
      label: "Hub",
      subtitle: "A largura extra vira continuidade: memória curta, fila e próximos passos.",
      showGuide: false,
      showSecondaryShelf: true,
      showQuickAccess: true,
      showMemoryBar: true,
      showTerritoryWidget: Boolean(input.selectedCity),
      showFilters: true,
      showIntroLead: false,
    };
  }

  return {
    state: "operation-normal",
    label: "Operação normal",
    subtitle: "A home preserva um foco único e abre espaço só para leitura útil.",
    showGuide: false,
    showSecondaryShelf: true,
    showQuickAccess: false,
    showMemoryBar: true,
    showTerritoryWidget: Boolean(input.selectedCity),
    showFilters: true,
    showIntroLead: true,
  };
}

