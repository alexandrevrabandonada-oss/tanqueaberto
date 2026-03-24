export type GroupReleaseStatus = "ready" | "validating" | "limited" | "hidden";

export type PublicOpeningStage = 
  | "closed"           // Fechado (apenas admin/testers convidados)
  | "restricted_beta"  // Beta Restrito (visível na lista, mas com aviso de convite)
  | "public_beta"      // Beta Público Local (aberto para todos na cidade, mas com aviso de "em teste")
  | "consolidated";    // Consolidado (operação normal)

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

export function getPublicStageLabel(stage: PublicOpeningStage) {
  switch (stage) {
    case "closed": return "Em Breve";
    case "restricted_beta": return "Beta Restrito";
    case "public_beta": return "Beta Público";
    case "consolidated": return "Consolidado";
  }
}
