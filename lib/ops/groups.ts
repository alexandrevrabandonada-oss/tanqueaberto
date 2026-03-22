import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { mapStationRow } from "@/lib/data/mappers";
import type { Station } from "@/lib/types";
import type { StationRow } from "@/types/supabase";

interface SeedGroupDefinition {
  slug: string;
  name: string;
  description: string;
  groupType: "corredor" | "bairro" | "regiao" | "operacional";
  city: string | null;
  keywords: string[];
}

const seedGroups: SeedGroupDefinition[] = [
  {
    slug: "volta-redonda-centro-retiro",
    name: "Volta Redonda · Centro e Retiro",
    description: "Eixo central com maior visibilidade pública e fluxo urbano.",
    groupType: "corredor",
    city: "Volta Redonda",
    keywords: ["centro", "retiro", "aterrado", "vila santa cecilia", "conforto"]
  },
  {
    slug: "volta-redonda-saidas-urbanas",
    name: "Volta Redonda · Entradas e saídas urbanas",
    description: "Pontos de entrada/saída com leitura operacional para coleta recorrente.",
    groupType: "operacional",
    city: "Volta Redonda",
    keywords: ["roma", "sideropolis", "niteroi", "sao geraldo", "17 de julho"]
  },
  {
    slug: "barra-mansa-centro-eixos",
    name: "Barra Mansa · Centro e eixos",
    description: "Centro expandido e corredores urbanos com maior circulação.",
    groupType: "corredor",
    city: "Barra Mansa",
    keywords: ["centro", "ano bom", "boa sorte", "sao luis", "barbara", "vista alegre"]
  },
  {
    slug: "resende-urbanos",
    name: "Resende · Eixos urbanos",
    description: "Eixos urbanos prioritários para cobertura e comparação.",
    groupType: "corredor",
    city: "Resende",
    keywords: ["centro", "campos eliseos", "manejo", "jardim jalisco", "itapuca", "paraíso", "paraiso"]
  },
  {
    slug: "barra-do-pirai-acessos",
    name: "Barra do Piraí · Acessos urbanos",
    description: "Entradas, saídas e área central para leitura territorial curta.",
    groupType: "operacional",
    city: "Barra do Piraí",
    keywords: ["centro", "estacao", "oficinas", "sao luiz", "dorandia"]
  },
  {
    slug: "porto-real-quatis-pinheiral",
    name: "Porto Real, Quatis e Pinheiral · Base territorial",
    description: "Recorte de cobertura para cidades menores e seus vínculos regionais.",
    groupType: "regiao",
    city: null,
    keywords: ["porto real", "quatis", "pinheiral"]
  }
];

function matchesGroup(station: Station, definition: SeedGroupDefinition) {
  const text = [station.name, station.namePublic, station.address, station.neighborhood, station.city, station.brand]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const cityMatch = !definition.city || station.city.toLowerCase() === definition.city.toLowerCase();
  const keywordMatch = definition.keywords.some((keyword) => text.includes(keyword));
  return cityMatch && (keywordMatch || !definition.city);
}

function isMissingSchemaError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "PGRST205" || /schema cache|table .* not found/i.test(candidate.message ?? "");
}

export async function seedOperationalGroups() {
  const supabase = createSupabaseServiceClient();
  const { data: stationRows, error: stationError } = await supabase
    .from("stations")
    .select("id,name,name_official,name_public,brand,address,city,neighborhood,lat,lng,is_active,created_at,cnpj,source,source_id,official_status,sigaf_status,products,distributor_name,last_synced_at,import_notes,geo_source,geo_confidence,geo_review_status,priority_score,visibility_status,curation_note,coordinate_reviewed_at,updated_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (stationError || !stationRows) {
    if (isMissingSchemaError(stationError)) {
      console.warn("Tabela de grupos operacionais ainda não existe no banco remoto. Seed adiado.");
      return [] as Array<{ slug: string; members: number }>;
    }

    throw new Error("Falha ao carregar postos para a curadoria dos grupos.");
  }

  const stations = (stationRows as StationRow[]).map(mapStationRow);
  const results: Array<{ slug: string; members: number }> = [];

  for (const definition of seedGroups) {
    const { data: existingGroup, error: existingError } = await supabase
      .from("audit_station_groups")
      .select("id")
      .eq("slug", definition.slug)
      .maybeSingle();

    if (existingError) {
      if (isMissingSchemaError(existingError)) {
        console.warn("Tabela audit_station_groups ainda não existe no banco remoto. Seed adiado.");
        return results;
      }

      console.error(`Failed to read group ${definition.slug}`, existingError);
      continue;
    }

    let groupId = existingGroup?.id ?? null;

    if (!groupId) {
      const upsertResult = await supabase
        .from("audit_station_groups")
        .upsert(
          {
            slug: definition.slug,
            name: definition.name,
            description: definition.description,
            group_type: definition.groupType,
            city: definition.city,
            is_active: true,
            updated_at: new Date().toISOString()
          },
          { onConflict: "slug" }
        )
        .select("id")
        .single();

      if (upsertResult.error || !upsertResult.data) {
        if (isMissingSchemaError(upsertResult.error)) {
          console.warn("Tabela audit_station_groups ainda não existe no banco remoto. Seed adiado.");
          return results;
        }

        console.error(`Failed to upsert group ${definition.slug}`, upsertResult.error);
        continue;
      }

      groupId = upsertResult.data.id;
    }

    const matchedStations = stations.filter((station) => matchesGroup(station, definition));

    if (matchedStations.length === 0 && definition.city) {
      matchedStations.push(...stations.filter((station) => station.city.toLowerCase() === definition.city!.toLowerCase()).slice(0, 4));
    }

    await supabase.from("audit_station_group_members").delete().eq("group_id", groupId);

    if (matchedStations.length > 0) {
      const { error } = await supabase.from("audit_station_group_members").insert(
        matchedStations.map((station) => ({
          group_id: groupId,
          station_id: station.id,
          notes: definition.description
        }))
      );

      if (error) {
        if (isMissingSchemaError(error)) {
          console.warn("Tabela audit_station_group_members ainda não existe no banco remoto. Seed adiado.");
          return results;
        }

        console.error(`Failed to seed members for ${definition.slug}`, error);
        continue;
      }
    }

    results.push({ slug: definition.slug, members: matchedStations.length });
  }

  return results;
}
