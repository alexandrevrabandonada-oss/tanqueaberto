import { type OperationalKillSwitches } from "./kill-switches";
import { type OperationalAlert } from "./alerts";
import { type RolloutRecommendation } from "./rollout-engine";
import { type OperationalSynthesis } from "./feedback-analyzer";

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface SystemHealthSignal {
  id: string;
  label: string;
  status: 'healthy' | 'degraded' | 'failing';
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

export interface CommandCenterState {
  healthSignals: SystemHealthSignal[];
  activeAlerts: OperationalAlert[];
  killSwitches: OperationalKillSwitches;
  moderationQueueCount: number;
  territorialRecommendations: RolloutRecommendation[];
  synthesis: OperationalSynthesis;
}
