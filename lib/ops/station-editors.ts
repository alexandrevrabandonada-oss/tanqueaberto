import { createSupabaseServiceClient } from "@/lib/supabase/service";

export interface StationEditorSummary {
  userId: string;
  email: string;
  createdCount: number;
  activeCount: number;
  reviewCount: number;
  duplicateCount: number;
  lastSeedAt: string | null;
}

export interface StationEditorRoster {
  editors: StationEditorSummary[];
  totals: {
    editors: number;
    createdCount: number;
    activeCount: number;
    reviewCount: number;
    duplicateCount: number;
  };
}

export interface StationEditorTerritoryFilter {
  city?: string | null;
  neighborhood?: string | null;
}

interface AdminUserRow {
  user_id: string;
  email: string;
  role: string;
}

interface StationSeedRequestRow {
  station_id: string;
  creator_id: string;
  creator_email: string;
  status: string;
  created_at: string;
}

interface StationSeedStationRow {
  id: string;
  city: string | null;
  neighborhood: string | null;
  visibility_status: string | null;
  geo_review_status: string | null;
  duplicate_of_station_id: string | null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeTerritoryValue(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function matchesTerritory(station: StationSeedStationRow | undefined, territory?: StationEditorTerritoryFilter) {
  if (!territory) return true;
  if (!station) return false;
  if (territory.city && normalizeTerritoryValue(station.city) !== normalizeTerritoryValue(territory.city)) return false;
  if (territory.neighborhood && normalizeTerritoryValue(station.neighborhood) !== normalizeTerritoryValue(territory.neighborhood)) return false;
  return true;
}

export async function getStationEditorRoster(territory?: StationEditorTerritoryFilter): Promise<StationEditorRoster> {
  const supabase = createSupabaseServiceClient();

  const [{ data: adminRows, error: adminError }, { data: seedRows, error: seedError }] = await Promise.all([
    supabase.from("admin_users").select("user_id,email,role").eq("role", "station_editor").order("email", { ascending: true }),
    supabase.from("station_seed_requests").select("station_id,creator_id,creator_email,status,created_at").order("created_at", { ascending: false })
  ]);

  if (adminError) {
    console.error("Failed to load station editors", adminError);
  }

  if (seedError) {
    console.error("Failed to load station seed requests", seedError);
  }

  const adminUsers = (adminRows ?? []) as AdminUserRow[];
  const seedRequests = (seedRows ?? []) as StationSeedRequestRow[];
  const stationIds = Array.from(new Set(seedRequests.map((row) => row.station_id).filter(Boolean)));

  const { data: stationRows, error: stationError } = stationIds.length > 0
    ? await supabase
        .from("stations")
        .select("id,city,neighborhood,visibility_status,geo_review_status,duplicate_of_station_id")
        .in("id", stationIds)
    : { data: [], error: null };

  if (stationError) {
    console.error("Failed to load station seed stations", stationError);
  }

  const stationMap = new Map<string, StationSeedStationRow>();
  for (const row of (stationRows ?? []) as StationSeedStationRow[]) {
    stationMap.set(row.id, row);
  }

  const filteredSeedRequests = seedRequests.filter((request) => matchesTerritory(stationMap.get(request.station_id), territory));

  const roster = new Map<string, StationEditorSummary>();

  for (const admin of adminUsers) {
    roster.set(normalizeEmail(admin.email), {
      userId: admin.user_id,
      email: admin.email,
      createdCount: 0,
      activeCount: 0,
      reviewCount: 0,
      duplicateCount: 0,
      lastSeedAt: null
    });
  }

  for (const request of filteredSeedRequests) {
    const key = normalizeEmail(request.creator_email || request.creator_id);
    const current = roster.get(key) ?? {
      userId: request.creator_id,
      email: request.creator_email,
      createdCount: 0,
      activeCount: 0,
      reviewCount: 0,
      duplicateCount: 0,
      lastSeedAt: null
    };

    current.createdCount += 1;
    const station = stationMap.get(request.station_id);
    const isDuplicate = Boolean(station?.duplicate_of_station_id);
    const isActive = station?.visibility_status === "public" && station?.geo_review_status === "ok" && !isDuplicate;

    if (isDuplicate) {
      current.duplicateCount += 1;
    } else if (isActive) {
      current.activeCount += 1;
    } else {
      current.reviewCount += 1;
    }

    if (!current.lastSeedAt || new Date(request.created_at).getTime() > new Date(current.lastSeedAt).getTime()) {
      current.lastSeedAt = request.created_at;
    }

    roster.set(key, current);
  }

  const editors = [...roster.values()]
    .filter((editor) => (territory ? editor.createdCount > 0 : true))
    .sort((left, right) => right.createdCount - left.createdCount || left.email.localeCompare(right.email, "pt-BR"));

  return {
    editors,
    totals: {
      editors: editors.length,
      createdCount: editors.reduce((sum, item) => sum + item.createdCount, 0),
      activeCount: editors.reduce((sum, item) => sum + item.activeCount, 0),
      reviewCount: editors.reduce((sum, item) => sum + item.reviewCount, 0),
      duplicateCount: editors.reduce((sum, item) => sum + item.duplicateCount, 0)
    }
  };
}

async function findAuthUserByEmail(email: string) {
  const supabase = createSupabaseServiceClient();
  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    throw new Error(`Falha ao ler usuarios do Auth: ${error.message}`);
  }

  const match = data.users.find((user: { email?: string | null; id: string }) => normalizeEmail(user.email ?? "") === normalizedEmail);
  return match ?? null;
}

export async function grantStationEditorRole(email: string) {
  const supabase = createSupabaseServiceClient();
  const authUser = await findAuthUserByEmail(email);

  if (!authUser?.id || !authUser.email) {
    throw new Error("E-mail não encontrado no Auth.");
  }

  const normalizedEmail = normalizeEmail(authUser.email);
  const { data: updatedRow, error: updateError } = await supabase
    .from("admin_users")
    .update({ user_id: authUser.id, role: "station_editor" })
    .eq("email", normalizedEmail)
    .select("user_id,email")
    .maybeSingle();

  if (updateError) {
    throw new Error(`Falha ao conceder papel: ${updateError.message}`);
  }

  if (updatedRow?.email) {
    return { userId: updatedRow.user_id, email: updatedRow.email };
  }

  const { data: insertedRow, error: insertError } = await supabase
    .from("admin_users")
    .insert({ user_id: authUser.id, email: normalizedEmail, role: "station_editor" })
    .select("user_id,email")
    .single();

  if (insertError || !insertedRow?.email) {
    throw new Error(`Falha ao conceder papel: ${insertError?.message ?? "insert_failed"}`);
  }

  return { userId: insertedRow.user_id, email: insertedRow.email };
}

export async function revokeStationEditorRole(email: string) {
  const supabase = createSupabaseServiceClient();
  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await supabase
    .from("admin_users")
    .update({ role: "admin" })
    .eq("email", normalizedEmail)
    .select("user_id,email")
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao remover papel: ${error.message}`);
  }

  if (!data?.email) {
    throw new Error("E-mail não encontrado na allowlist.");
  }

  return { userId: data.user_id, email: data.email };
}
