import "server-only";

import { randomBytes, createHash } from "node:crypto";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export type StationEditorInviteStatus = "pendente" | "aceito" | "revogado" | "expirado";

interface StationEditorInviteRow {
  id: string;
  invite_token: string;
  invite_code: string;
  status: StationEditorInviteStatus;
  max_uses: number;
  use_count: number;
  expires_at: string;
  created_by_id: string | null;
  created_by_email: string | null;
  accepted_at: string | null;
  accepted_name: string | null;
  accepted_session_id: string | null;
  accepted_by_user_agent: string | null;
  revoked_at: string | null;
  revoked_by_id: string | null;
  revoked_by_email: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

interface StationEditorSessionRow {
  id: string;
  invite_id: string;
  token_hash: string;
  display_name: string;
  status: "active" | "revoked" | "expired";
  role: "station_editor";
  expires_at: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
  revoked_by_id: string | null;
  revoked_by_email: string | null;
  station_editor_invites?: {
    status: StationEditorInviteStatus;
    expires_at: string;
    revoked_at: string | null;
    invite_code: string;
  } | Array<{
    status: StationEditorInviteStatus;
    expires_at: string;
    revoked_at: string | null;
    invite_code: string;
  }> | null;
}

export interface StationEditorInvite {
  id: string;
  inviteToken: string;
  inviteCode: string;
  status: StationEditorInviteStatus;
  effectiveStatus: StationEditorInviteStatus;
  maxUses: number;
  useCount: number;
  expiresAt: string;
  createdById: string | null;
  createdByEmail: string | null;
  acceptedAt: string | null;
  acceptedName: string | null;
  acceptedSessionId: string | null;
  acceptedByUserAgent: string | null;
  revokedAt: string | null;
  revokedById: string | null;
  revokedByEmail: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  inviteLink: string;
}

export interface StationEditorInviteReadout {
  totals: {
    total: number;
    pendente: number;
    aceito: number;
    revogado: number;
    expirado: number;
  };
  invites: StationEditorInvite[];
}

export interface StationEditorSession {
  id: string;
  inviteId: string;
  role: "station_editor";
  displayName: string;
  expiresAt: string;
  inviteCode: string | null;
}

function normalizeInviteCode(code: string) {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

function randomHex(length: number) {
  return randomBytes(Math.ceil(length / 2)).toString("hex").toUpperCase().slice(0, length);
}

export function generateStationEditorInviteCode() {
  return `SE-${randomHex(6)}`;
}

export function generateStationEditorInviteToken() {
  return randomBytes(18).toString("base64url");
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function resolveBaseUrl() {
  const configured = String(process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  return "https://bombaaberta.org";
}

export function buildStationEditorInviteLink(inviteToken: string) {
  return `${resolveBaseUrl()}/se/${encodeURIComponent(inviteToken)}`;
}

function toEffectiveStatus(row: StationEditorInviteRow, now = Date.now()): StationEditorInviteStatus {
  if (row.status === "revogado" || row.revoked_at) {
    return "revogado";
  }

  if (new Date(row.expires_at).getTime() <= now) {
    return "expirado";
  }

  if (row.use_count >= row.max_uses || row.status === "aceito" || Boolean(row.accepted_at)) {
    return "aceito";
  }

  return "pendente";
}

function mapInvite(row: StationEditorInviteRow): StationEditorInvite {
  return {
    id: row.id,
    inviteToken: row.invite_token,
    inviteCode: row.invite_code,
    status: row.status,
    effectiveStatus: toEffectiveStatus(row),
    maxUses: row.max_uses,
    useCount: row.use_count,
    expiresAt: row.expires_at,
    createdById: row.created_by_id,
    createdByEmail: row.created_by_email,
    acceptedAt: row.accepted_at,
    acceptedName: row.accepted_name,
    acceptedSessionId: row.accepted_session_id,
    acceptedByUserAgent: row.accepted_by_user_agent,
    revokedAt: row.revoked_at,
    revokedById: row.revoked_by_id,
    revokedByEmail: row.revoked_by_email,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    inviteLink: buildStationEditorInviteLink(row.invite_token)
  };
}

async function findInviteByTokenOrCode(input: { inviteToken?: string | null; inviteCode?: string | null }) {
  const supabase = createSupabaseServiceClient();
  const token = String(input.inviteToken ?? "").trim();
  const normalizedCode = normalizeInviteCode(String(input.inviteCode ?? ""));

  if (!token && !normalizedCode) {
    return null;
  }

  let query = supabase
    .from("station_editor_invites")
    .select("id,invite_token,invite_code,status,max_uses,use_count,expires_at,created_by_id,created_by_email,accepted_at,accepted_name,accepted_session_id,accepted_by_user_agent,revoked_at,revoked_by_id,revoked_by_email,last_used_at,created_at,updated_at");

  if (token && normalizedCode) {
    query = query.or(`invite_token.eq.${token},invite_code.eq.${normalizedCode}`);
  } else if (token) {
    query = query.eq("invite_token", token);
  } else {
    query = query.eq("invite_code", normalizedCode);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) {
    return null;
  }

  return data as StationEditorInviteRow;
}

export async function createStationEditorInvite(input: {
  createdById?: string | null;
  createdByEmail?: string | null;
  ttlHours?: number;
  maxUses?: number;
  inviteCode?: string | null;
}) {
  const supabase = createSupabaseServiceClient();
  const now = new Date();
  const ttlHours = Number.isFinite(input.ttlHours) ? Math.max(1, Math.min(24 * 30, Number(input.ttlHours))) : 72;
  const maxUses = Number.isFinite(input.maxUses) ? Math.max(1, Math.min(10, Number(input.maxUses))) : 1;
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000).toISOString();
  const inviteToken = generateStationEditorInviteToken();
  const inviteCode = normalizeInviteCode(input.inviteCode ?? "") || generateStationEditorInviteCode();

  const { data, error } = await supabase
    .from("station_editor_invites")
    .insert({
      invite_token: inviteToken,
      invite_code: inviteCode,
      status: "pendente",
      max_uses: maxUses,
      use_count: 0,
      expires_at: expiresAt,
      created_by_id: input.createdById ?? null,
      created_by_email: input.createdByEmail ?? null,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    .select("id,invite_token,invite_code,status,max_uses,use_count,expires_at,created_by_id,created_by_email,accepted_at,accepted_name,accepted_session_id,accepted_by_user_agent,revoked_at,revoked_by_id,revoked_by_email,last_used_at,created_at,updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "failed_to_create_station_editor_invite");
  }

  return mapInvite(data as StationEditorInviteRow);
}

export async function getStationEditorInviteReadout(limit = 40): Promise<StationEditorInviteReadout> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("station_editor_invites")
    .select("id,invite_token,invite_code,status,max_uses,use_count,expires_at,created_by_id,created_by_email,accepted_at,accepted_name,accepted_session_id,accepted_by_user_agent,revoked_at,revoked_by_id,revoked_by_email,last_used_at,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return {
      totals: { total: 0, pendente: 0, aceito: 0, revogado: 0, expirado: 0 },
      invites: []
    };
  }

  const invites = (data as StationEditorInviteRow[]).map(mapInvite);
  return {
    totals: {
      total: invites.length,
      pendente: invites.filter((item) => item.effectiveStatus === "pendente").length,
      aceito: invites.filter((item) => item.effectiveStatus === "aceito").length,
      revogado: invites.filter((item) => item.effectiveStatus === "revogado").length,
      expirado: invites.filter((item) => item.effectiveStatus === "expirado").length
    },
    invites
  };
}

export async function revokeStationEditorInvite(input: {
  inviteId: string;
  revokedById?: string | null;
  revokedByEmail?: string | null;
}) {
  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("station_editor_invites")
    .update({
      status: "revogado",
      revoked_at: now,
      revoked_by_id: input.revokedById ?? null,
      revoked_by_email: input.revokedByEmail ?? null,
      updated_at: now
    })
    .eq("id", input.inviteId)
    .select("id,invite_token,invite_code,status,max_uses,use_count,expires_at,created_by_id,created_by_email,accepted_at,accepted_name,accepted_session_id,accepted_by_user_agent,revoked_at,revoked_by_id,revoked_by_email,last_used_at,created_at,updated_at")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "station_editor_invite_not_found");
  }

  await supabase
    .from("station_editor_sessions")
    .update({
      status: "revoked",
      revoked_at: now,
      revoked_by_id: input.revokedById ?? null,
      revoked_by_email: input.revokedByEmail ?? null,
      updated_at: now
    })
    .eq("invite_id", input.inviteId)
    .eq("status", "active");

  return mapInvite(data as StationEditorInviteRow);
}

export async function acceptStationEditorInvite(input: {
  inviteToken?: string | null;
  inviteCode?: string | null;
  displayName: string;
  userAgent?: string | null;
}) {
  const displayName = String(input.displayName ?? "").trim();
  if (displayName.length < 2) {
    return { ok: false as const, reason: "missing_display_name" as const, invite: null, sessionToken: null, session: null };
  }

  const inviteRow = await findInviteByTokenOrCode({ inviteToken: input.inviteToken, inviteCode: input.inviteCode });
  if (!inviteRow) {
    return { ok: false as const, reason: "invite_not_found" as const, invite: null, sessionToken: null, session: null };
  }

  const effectiveStatus = toEffectiveStatus(inviteRow);
  if (effectiveStatus === "revogado") {
    return { ok: false as const, reason: "invite_revoked" as const, invite: mapInvite(inviteRow), sessionToken: null, session: null };
  }
  if (effectiveStatus === "expirado") {
    return { ok: false as const, reason: "invite_expired" as const, invite: mapInvite(inviteRow), sessionToken: null, session: null };
  }
  if (inviteRow.use_count >= inviteRow.max_uses) {
    return { ok: false as const, reason: "invite_exhausted" as const, invite: mapInvite(inviteRow), sessionToken: null, session: null };
  }

  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const sessionToken = randomBytes(24).toString("base64url");
  const sessionTokenHash = hashSessionToken(sessionToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

  const { data: sessionInsert, error: sessionError } = await supabase
    .from("station_editor_sessions")
    .insert({
      invite_id: inviteRow.id,
      token_hash: sessionTokenHash,
      display_name: displayName,
      status: "active",
      role: "station_editor",
      expires_at: expiresAt,
      last_seen_at: now,
      created_at: now,
      updated_at: now
    })
    .select("id,invite_id,token_hash,display_name,status,role,expires_at,last_seen_at,created_at,updated_at,revoked_at,revoked_by_id,revoked_by_email")
    .single();

  if (sessionError || !sessionInsert) {
    return { ok: false as const, reason: "session_create_failed" as const, invite: mapInvite(inviteRow), sessionToken: null, session: null };
  }

  const nextUseCount = inviteRow.use_count + 1;
  const nextStatus: StationEditorInviteStatus = nextUseCount >= inviteRow.max_uses ? "aceito" : "pendente";
  const { data: inviteUpdate, error: inviteError } = await supabase
    .from("station_editor_invites")
    .update({
      use_count: nextUseCount,
      status: nextStatus,
      accepted_at: now,
      accepted_name: displayName,
      accepted_session_id: sessionInsert.id,
      accepted_by_user_agent: input.userAgent ?? null,
      last_used_at: now,
      updated_at: now
    })
    .eq("id", inviteRow.id)
    .eq("use_count", inviteRow.use_count)
    .select("id,invite_token,invite_code,status,max_uses,use_count,expires_at,created_by_id,created_by_email,accepted_at,accepted_name,accepted_session_id,accepted_by_user_agent,revoked_at,revoked_by_id,revoked_by_email,last_used_at,created_at,updated_at")
    .maybeSingle();

  if (inviteError || !inviteUpdate) {
    await supabase.from("station_editor_sessions").delete().eq("id", sessionInsert.id);
    return { ok: false as const, reason: "invite_claim_failed" as const, invite: mapInvite(inviteRow), sessionToken: null, session: null };
  }

  return {
    ok: true as const,
    reason: null,
    invite: mapInvite(inviteUpdate as StationEditorInviteRow),
    sessionToken,
    session: {
      id: sessionInsert.id,
      inviteId: sessionInsert.invite_id,
      role: "station_editor" as const,
      displayName: sessionInsert.display_name,
      expiresAt: sessionInsert.expires_at,
      inviteCode: inviteUpdate.invite_code
    }
  };
}

export async function getStationEditorSessionByToken(token: string | null | undefined): Promise<StationEditorSession | null> {
  const sessionToken = String(token ?? "").trim();
  if (!sessionToken) return null;

  const supabase = createSupabaseServiceClient();
  const tokenHash = hashSessionToken(sessionToken);
  const { data, error } = await supabase
    .from("station_editor_sessions")
    .select("id,invite_id,token_hash,display_name,status,role,expires_at,last_seen_at,created_at,updated_at,revoked_at,revoked_by_id,revoked_by_email,station_editor_invites(status,expires_at,revoked_at,invite_code)")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as unknown as StationEditorSessionRow;
  const inviteMeta = Array.isArray(row.station_editor_invites) ? row.station_editor_invites[0] : row.station_editor_invites;
  const now = Date.now();
  const sessionExpired = new Date(row.expires_at).getTime() <= now;
  const inviteStatus = inviteMeta?.status;
  const inviteExpired = inviteMeta ? new Date(inviteMeta.expires_at).getTime() <= now : true;
  const inviteRevoked = inviteStatus === "revogado" || Boolean(inviteMeta?.revoked_at);

  if (row.status !== "active" || sessionExpired || inviteExpired || inviteRevoked) {
    const nextStatus = row.status === "revoked" || inviteRevoked ? "revoked" : "expired";
    await supabase
      .from("station_editor_sessions")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "active");

    return null;
  }

  await supabase
    .from("station_editor_sessions")
    .update({ last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", row.id);

  return {
    id: row.id,
    inviteId: row.invite_id,
    role: "station_editor",
    displayName: row.display_name,
    expiresAt: row.expires_at,
    inviteCode: inviteMeta?.invite_code ?? null
  };
}
