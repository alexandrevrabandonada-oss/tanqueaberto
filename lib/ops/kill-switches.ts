import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export interface OperationalKillSwitches {
  disable_mission_mode: boolean;
  disable_pwa_prompts: boolean;
  disable_heavy_territorial_widgets: boolean;
  disable_auto_suggestions: boolean;
  disable_fast_lane: boolean;
}

const DEFAULT_SWITCHES: OperationalKillSwitches = {
  disable_mission_mode: false,
  disable_pwa_prompts: false,
  disable_heavy_territorial_widgets: false,
  disable_auto_suggestions: false,
  disable_fast_lane: false,
};

/**
 * Fetches operational kill switches from the database (sys_config table).
 * Falls back to defaults if the table or record doesn't exist.
 */
export async function getKillSwitches(): Promise<OperationalKillSwitches> {
  const supabase = createSupabaseServiceClient();

  try {
    const { data, error } = await supabase
      .from("sys_config")
      .select("value")
      .eq("key", "kill_switches")
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_SWITCHES;
    }

    return { ...DEFAULT_SWITCHES, ...(data.value as Partial<OperationalKillSwitches>) };
  } catch (err) {
    console.error("Failed to fetch kill switches", err);
    return DEFAULT_SWITCHES;
  }
}

/**
 * Updates a kill switch value in the database.
 */
export async function updateKillSwitch(
  key: keyof OperationalKillSwitches, 
  value: boolean,
  actorId: string = "system"
): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  const current = await getKillSwitches();
  const next = { ...current, [key]: value };

  const { error } = await supabase
    .from("sys_config")
    .upsert({
      key: "kill_switches",
      value: next,
      updated_at: new Date().toISOString()
    });

  if (!error) {
    // Log change history
    await supabase.from("operational_logs").insert({
      event_kind: "kill_switch_change",
      message: `${value ? 'ATIVADO' : 'DESATIVADO'} Kill Switch: ${key}`,
      payload: { key, value, previous: current[key] },
      actor_id: actorId
    });
    return true;
  }

  return false;
}
