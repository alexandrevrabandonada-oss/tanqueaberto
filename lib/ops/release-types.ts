export type GroupReleaseStatus = "ready" | "validating" | "limited" | "hidden";

export function getStatusColor(status: GroupReleaseStatus) {
  switch (status) {
    case "ready": return "text-green-400";
    case "validating": return "text-yellow-400";
    case "limited": return "text-orange-400";
    case "hidden": return "text-white/40";
    default: return "text-white";
  }
}

export function getStatusLabel(status: GroupReleaseStatus) {
  switch (status) {
    case "ready": return "Pronto para Uso";
    case "validating": return "Em Validação";
    case "limited": return "Acesso Limitado";
    case "hidden": return "Oculto";
    default: return "Status Desconhecido";
  }
}
