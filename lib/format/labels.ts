import type { FuelType, ReportStatus } from "@/lib/types";

export const fuelLabels: Record<FuelType, string> = {
  gasolina_comum: "Gasolina comum",
  gasolina_aditivada: "Gasolina aditivada",
  etanol: "Etanol",
  diesel_s10: "Diesel S10",
  diesel_comum: "Diesel comum",
  gnv: "GNV"
};

export const reportStatusLabels: Record<ReportStatus, string> = {
  pending: "Aguardando moderação",
  approved: "Aprovado",
  rejected: "Rejeitado",
  flagged: "Sinalizado"
};
