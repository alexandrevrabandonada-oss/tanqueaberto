export const NETWORK_SIM_COOKIE = "bomba_aberta_net_sim";

export type NetworkSimulationMode = "normal" | "slow" | "timeout" | "upload_fail" | "offline";

const modes = new Set<NetworkSimulationMode>(["normal", "slow", "timeout", "upload_fail", "offline"]);

export function normalizeNetworkSimulationMode(value?: string | null): NetworkSimulationMode {
  if (!value) {
    return "normal";
  }

  const normalized = value.trim().toLowerCase() as NetworkSimulationMode;
  return modes.has(normalized) ? normalized : "normal";
}

export function getNetworkSimulationLabel(mode: NetworkSimulationMode) {
  switch (mode) {
    case "slow":
      return "rede lenta";
    case "timeout":
      return "timeout de teste";
    case "upload_fail":
      return "falha de upload";
    case "offline":
      return "modo offline";
    default:
      return "normal";
  }
}

export function getNetworkSimulationDelayMs(mode: NetworkSimulationMode) {
  switch (mode) {
    case "slow":
      return 1800;
    case "timeout":
      return 5000;
    case "upload_fail":
      return 700;
    case "offline":
      return 300;
    default:
      return 0;
  }
}
