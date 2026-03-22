import type { AuditComparisonItem, AuditWindowDays } from "@/lib/audit/types";
import type { FuelType } from "@/lib/types";

export interface AuditReportTemplate {
  title: string;
  subtitle: string;
  scopeType: "region" | "city" | "station" | "group";
  scopeLabel: string;
  fuelType: FuelType;
  days: AuditWindowDays;
  sections: string[];
}

export function buildCityDossierTemplate(city: string, fuelType: FuelType, days: AuditWindowDays): AuditReportTemplate {
  return {
    title: `Dossiê cívico de ${city}`,
    subtitle: `Série histórica pública de ${days} dias para ${fuelType}`,
    scopeType: "city",
    scopeLabel: city,
    fuelType,
    days,
    sections: ["resumo executivo", "série temporal", "alertas", "cobertura e confiança", "metodologia", "limitações"]
  };
}

export function buildRegionalDossierTemplate(fuelType: FuelType, days: AuditWindowDays, label = "Sul Fluminense"): AuditReportTemplate {
  return {
    title: `Dossiê regional ${label}`,
    subtitle: `Monitoramento popular e série histórica de ${days} dias`,
    scopeType: "region",
    scopeLabel: label,
    fuelType,
    days,
    sections: ["resumo executivo", "comparação entre cidades", "alertas", "cobertura e confiança", "metodologia", "limitações"]
  };
}

export function buildFuelDossierTemplate(fuelType: FuelType, days: AuditWindowDays, scopeLabel: string): AuditReportTemplate {
  return {
    title: `Dossiê territorial de ${scopeLabel}`,
    subtitle: `Leitura por combustível e período de ${days} dias`,
    scopeType: "group",
    scopeLabel,
    fuelType,
    days,
    sections: ["resumo executivo", "série temporal", "alertas", "cobertura e confiança", "metodologia", "limitações"]
  };
}

export function buildComparisonHeadline(items: AuditComparisonItem[], fuelType: FuelType, days: AuditWindowDays) {
  const top = items[0];
  return {
    title: `Comparação entre cidades · ${fuelType}`,
    subtitle: top ? `${top.city} lidera a mediana no recorte de ${days} dias` : `Sem dados suficientes para ${days} dias`,
  };
}
