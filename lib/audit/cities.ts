export interface AuditCityDefinition {
  slug: string;
  name: string;
}

export const auditCities: AuditCityDefinition[] = [
  { slug: "volta-redonda", name: "Volta Redonda" },
  { slug: "barra-mansa", name: "Barra Mansa" },
  { slug: "resende", name: "Resende" },
  { slug: "barra-do-pirai", name: "Barra do Piraí" },
  { slug: "porto-real", name: "Porto Real" },
  { slug: "quatis", name: "Quatis" },
  { slug: "pinheiral", name: "Pinheiral" }
];

export function getAuditCityBySlug(slug: string) {
  return auditCities.find((city) => city.slug === slug) ?? null;
}

export function getAuditCitySlug(cityName: string) {
  const normalized = cityName.trim().toLowerCase();
  return (
    auditCities.find((city) => city.name.toLowerCase() === normalized)?.slug ??
    normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  );
}
