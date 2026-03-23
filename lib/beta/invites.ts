import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export interface BetaInviteCodeItem {
  id: string;
  code: string;
  batchLabel: string;
  batchNote: string | null;
  testerNote: string | null;
  createdById: string | null;
  createdByEmail: string | null;
  maxUses: number;
  useCount: number;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  disabledAt: string | null;
  disabledByEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BetaInviteSummary {
  total: number;
  active: number;
  inactive: number;
  expired: number;
  usedUp: number;
  recent: BetaInviteCodeItem[];
}

export interface CreateBetaInviteInput {
  batchLabel: string;
  batchNote?: string | null;
  testerNote?: string | null;
  maxUses?: number;
  expiresAt?: string | null;
  isActive?: boolean;
  createdById?: string | null;
  createdByEmail?: string | null;
  code?: string | null;
}

function readEnvInviteCode() {
  return String(process.env.BETA_INVITE_CODE ?? "").trim();
}

export function normalizeBetaInviteCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function generateBetaInviteCode() {
  const bytes = new Uint8Array(4);
  const globalCrypto = globalThis.crypto;
  if (globalCrypto?.getRandomValues) {
    globalCrypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `BA-${token.slice(0, 4)}-${token.slice(4, 8)}`;
}

function toInviteCodeItem(row: Record<string, unknown>): BetaInviteCodeItem {
  return {
    id: String(row.id),
    code: String(row.code),
    batchLabel: String(row.batch_label ?? "beta fechado"),
    batchNote: row.batch_note ? String(row.batch_note) : null,
    testerNote: row.tester_note ? String(row.tester_note) : null,
    createdById: row.created_by_id ? String(row.created_by_id) : null,
    createdByEmail: row.created_by_email ? String(row.created_by_email) : null,
    maxUses: Number(row.max_uses ?? 1),
    useCount: Number(row.use_count ?? 0),
    isActive: Boolean(row.is_active),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    lastUsedAt: row.last_used_at ? String(row.last_used_at) : null,
    disabledAt: row.disabled_at ? String(row.disabled_at) : null,
    disabledByEmail: row.disabled_by_email ? String(row.disabled_by_email) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function isInviteExpired(item: BetaInviteCodeItem, now = new Date()) {
  if (!item.expiresAt) return false;
  return new Date(item.expiresAt).getTime() <= now.getTime();
}

export async function getBetaInviteCodes(limit = 25): Promise<BetaInviteCodeItem[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("beta_invite_codes")
    .select("id,code,batch_label,batch_note,tester_note,created_by_id,created_by_email,max_uses,use_count,is_active,expires_at,last_used_at,disabled_at,disabled_by_email,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Failed to load beta invite codes", error);
    return [];
  }

  return data.map((row) => toInviteCodeItem(row as Record<string, unknown>));
}

export async function getBetaInviteSummary(limit = 100): Promise<BetaInviteSummary> {
  const recent = await getBetaInviteCodes(limit);
  const now = new Date();

  return {
    total: recent.length,
    active: recent.filter((item) => item.isActive && !isInviteExpired(item, now) && item.useCount < item.maxUses).length,
    inactive: recent.filter((item) => !item.isActive).length,
    expired: recent.filter((item) => isInviteExpired(item, now)).length,
    usedUp: recent.filter((item) => item.useCount >= item.maxUses).length,
    recent
  };
}

export async function findBetaInviteCode(code: string): Promise<BetaInviteCodeItem | null> {
  const normalized = normalizeBetaInviteCode(code);
  if (!normalized) return null;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("beta_invite_codes")
    .select("id,code,batch_label,batch_note,tester_note,created_by_id,created_by_email,max_uses,use_count,is_active,expires_at,last_used_at,disabled_at,disabled_by_email,created_at,updated_at")
    .eq("code", normalized)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toInviteCodeItem(data as Record<string, unknown>);
}

export async function isManagedBetaInviteCodeValid(code: string) {
  const item = await findBetaInviteCode(code);
  if (!item) return false;
  if (!item.isActive) return false;
  if (isInviteExpired(item)) return false;
  if (item.useCount >= item.maxUses) return false;
  return true;
}

export async function claimBetaInviteCodeUse(code: string) {
  const item = await findBetaInviteCode(code);
  if (!item) {
    return { ok: false as const, reason: "invite_code_not_found" as const, item: null };
  }
  if (!item.isActive) {
    return { ok: false as const, reason: "invite_code_inactive" as const, item };
  }
  if (isInviteExpired(item)) {
    return { ok: false as const, reason: "invite_code_expired" as const, item };
  }
  if (item.useCount >= item.maxUses) {
    return { ok: false as const, reason: "invite_code_exhausted" as const, item };
  }

  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("beta_invite_codes")
    .update({ use_count: item.useCount + 1, last_used_at: now, updated_at: now })
    .eq("id", item.id);

  if (error) {
    console.error("Failed to claim beta invite code", error);
    return { ok: false as const, reason: "invite_code_claim_failed" as const, item };
  }

  return { ok: true as const, reason: null, item: { ...item, useCount: item.useCount + 1, lastUsedAt: now } };
}

export async function createBetaInviteCode(input: CreateBetaInviteInput) {
  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const code = normalizeBetaInviteCode(input.code ?? generateBetaInviteCode());
  const payload = {
    code,
    batch_label: input.batchLabel.trim() || "beta fechado",
    batch_note: input.batchNote ?? null,
    tester_note: input.testerNote ?? null,
    created_by_id: input.createdById ?? null,
    created_by_email: input.createdByEmail ?? null,
    max_uses: input.maxUses ?? 1,
    use_count: 0,
    is_active: input.isActive ?? true,
    expires_at: input.expiresAt ?? null,
    created_at: now,
    updated_at: now
  };

  const { data, error } = await supabase.from("beta_invite_codes").insert(payload).select("id,code,batch_label,batch_note,tester_note,created_by_id,created_by_email,max_uses,use_count,is_active,expires_at,last_used_at,disabled_at,disabled_by_email,created_at,updated_at").single();

  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "failed_to_create", item: null as BetaInviteCodeItem | null };
  }

  return { ok: true as const, error: null, item: toInviteCodeItem(data as Record<string, unknown>) };
}

export async function disableBetaInviteCode(id: string, disabledByEmail?: string | null) {
  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("beta_invite_codes")
    .update({ is_active: false, disabled_at: now, disabled_by_email: disabledByEmail ?? null, updated_at: now })
    .eq("id", id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, error: null };
}

export function getEnvBetaInviteCode() {
  return readEnvInviteCode();
}
