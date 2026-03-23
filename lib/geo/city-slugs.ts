import { priorityCities } from "../navigation/home-context";

export function slugifyCity(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}

export function resolveCityFromSlug(slug: string): string | null {
  const normalizedSlug = slug.toLowerCase();
  
  // Try priority cities first
  const found = priorityCities.find(city => slugifyCity(city) === normalizedSlug);
  if (found) return found;

  // Fallback map for common cases if not in priorityCities
  const commonMap: Record<string, string> = {
    "volta-redonda": "VOLTA REDONDA",
    "barra-mansa": "BARRA MANSA",
    "resende": "RESENDE",
    "barra-do-pirai": "BARRA DO PIRAI",
    "pinheiral": "PINHEIRAL",
    "porto-real": "PORTO REAL",
    "itatiaia": "ITATIAIA",
    "quatis": "QUATIS",
    "pirai": "PIRAI",
    "rio-claro": "RIO CLARO"
  };

  return commonMap[normalizedSlug] || null;
}
