import type { FuelType, ReportStatus } from "@/lib/types";
import type { RecencyFilter } from "@/lib/filters/public";

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

export const publicFuelFilters: Array<{ value: "all" | FuelType; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "gasolina_comum", label: "Gasolina comum" },
  { value: "gasolina_aditivada", label: "Gasolina aditivada" },
  { value: "etanol", label: "Etanol" },
  { value: "diesel_s10", label: "Diesel S10" },
  { value: "diesel_comum", label: "Diesel comum" },
  { value: "gnv", label: "GNV" }
];

export const recencyFilters: Array<{ value: RecencyFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "24h", label: "24h" },
  { value: "48h", label: "48h" }
];
