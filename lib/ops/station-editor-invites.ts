import "server-only";

import { randomBytes, createHash, randomUUID } from "node:crypto";

import { createStationEditorSessionCookieValue } from "@/lib/auth/station-editor-session-token";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export type StationEditorInviteStatus = "pendente" | "aceito" | "revogado" | "expirado";

export class StationEditorInviteError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "StationEditorInviteError";
  }
}

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

interface OperationalEventInviteState {
  id: string;
  inviteToken: string;
  inviteCode: string;
  status: StationEditorInviteStatus;
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

const DEFAULT_SESSION_TTL_DAYS = 30;
const TRUSTED_DEVICE_SESSION_TTL_DAYS = 120;

const FALLBACK_EVENT_TYPE = "station_editor_invite_state";
const FALLBACK_SCOPE_TYPE = "station_editor_invite";

function normalizeInviteCode(code: string) {
  const stripped = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Canonicalize SE-XXXXXX format: SEABC123 and SE-ABC123 both map to SE-ABC123
  if (/^SE[A-Z0-9]{6}$/.test(stripped)) {
    return `SE-${stripped.slice(2)}`;
  }
  return stripped.slice(0, 12);
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

function buildStationEditorInviteLinkFromCode(inviteCode: string) {
  return `${resolveBaseUrl()}/editor?code=${encodeURIComponent(inviteCode)}`;
}

function toEffectiveStatus(row: Pick<StationEditorInviteRow, "status" | "expires_at" | "revoked_at" | "use_count" | "max_uses" | "accepted_at">, now = Date.now()): StationEditorInviteStatus {
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

function mapFallbackInvite(state: OperationalEventInviteState): StationEditorInvite {
  return {
    ...mapInvite({
      id: state.id,
      invite_token: state.inviteToken,
      invite_code: state.inviteCode,
      status: state.status,
      max_uses: state.maxUses,
      use_count: state.useCount,
      expires_at: state.expiresAt,
      created_by_id: state.createdById,
      created_by_email: state.createdByEmail,
      accepted_at: state.acceptedAt,
      accepted_name: state.acceptedName,
      accepted_session_id: state.acceptedSessionId,
      accepted_by_user_agent: state.acceptedByUserAgent,
      revoked_at: state.revokedAt,
      revoked_by_id: state.revokedById,
      revoked_by_email: state.revokedByEmail,
      last_used_at: state.lastUsedAt,
      created_at: state.createdAt,
      updated_at: state.updatedAt
    }),
    id: state.id,
    inviteLink: buildStationEditorInviteLinkFromCode(state.inviteCode)
  };
}

function isSchemaMissingOrPartialError(error: unknown) {
  const code = error instanceof StationEditorInviteError ? error.code ?? null : error instanceof Error && "code" in error ? String((error as { code?: string }).code ?? "") : null;
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return (
    code === "42P01"
    || code === "PGRST205"
    || code === "42703"
    || code === "PGRST204"
    || message.includes("schema cache")
    || message.includes("does not exist")
    || message.includes("could not find the '")
    || message.includes("column")
    || message.includes("relation")
  );
}

function coerceInviteRow(payload: unknown, scopeId: string | null): OperationalEventInviteState | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const inviteToken = String(candidate.invite_token ?? candidate.inviteToken ?? "").trim();
  const inviteCode = String(candidate.invite_code ?? candidate.inviteCode ?? scopeId ?? "").trim();

  if (!inviteToken || !inviteCode) {
    return null;
  }

  const id = String(candidate.id ?? inviteCode).trim();
  const status = String(candidate.status ?? "pendente");
  if (status !== "pendente" && status !== "aceito" && status !== "revogado" && status !== "expirado") {
    return null;
  }

  return {
    id,
    inviteToken,
    inviteCode,
    status,
    maxUses: Number(candidate.max_uses ?? candidate.maxUses ?? 1),
    useCount: Number(candidate.use_count ?? candidate.useCount ?? 0),
    expiresAt: String(candidate.expires_at ?? candidate.expiresAt ?? new Date().toISOString()),
    createdById: candidate.created_by_id ? String(candidate.created_by_id) : candidate.createdById ? String(candidate.createdById) : null,
    createdByEmail: candidate.created_by_email ? String(candidate.created_by_email) : candidate.createdByEmail ? String(candidate.createdByEmail) : null,
    acceptedAt: candidate.accepted_at ? String(candidate.accepted_at) : candidate.acceptedAt ? String(candidate.acceptedAt) : null,
    acceptedName: candidate.accepted_name ? String(candidate.accepted_name) : candidate.acceptedName ? String(candidate.acceptedName) : null,
    acceptedSessionId: candidate.accepted_session_id ? String(candidate.accepted_session_id) : candidate.acceptedSessionId ? String(candidate.acceptedSessionId) : null,
    acceptedByUserAgent: candidate.accepted_by_user_agent ? String(candidate.accepted_by_user_agent) : candidate.acceptedByUserAgent ? String(candidate.acceptedByUserAgent) : null,
    revokedAt: candidate.revoked_at ? String(candidate.revoked_at) : candidate.revokedAt ? String(candidate.revokedAt) : null,
    revokedById: candidate.revoked_by_id ? String(candidate.revoked_by_id) : candidate.revokedById ? String(candidate.revokedById) : null,
    revokedByEmail: candidate.revoked_by_email ? String(candidate.revoked_by_email) : candidate.revokedByEmail ? String(candidate.revokedByEmail) : null,
    lastUsedAt: candidate.last_used_at ? String(candidate.last_used_at) : candidate.lastUsedAt ? String(candidate.lastUsedAt) : null,
    createdAt: String(candidate.created_at ?? candidate.createdAt ?? new Date().toISOString()),
    updatedAt: String(candidate.updated_at ?? candidate.updatedAt ?? new Date().toISOString())
  };
}

async function loadFallbackInviteStates(limit = 200): Promise<OperationalEventInviteState[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("operational_events")
    .select("scope_id,payload,created_at")
    .eq("event_type", FALLBACK_EVENT_TYPE)
    .eq("scope_type", FALLBACK_SCOPE_TYPE)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  const latestByInvite = new Map<string, OperationalEventInviteState>();
  for (const row of data as Array<{ scope_id: string | null; payload: unknown }>) {
    const state = coerceInviteRow(row.payload, row.scope_id);
    if (!state) {
      continue;
    }

    const key = state.inviteCode;
    if (!latestByInvite.has(key)) {
      latestByInvite.set(key, state);
    }
  }

  return [...latestByInvite.values()].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

async function loadDirectInviteRows(limit = 40): Promise<StationEditorInviteRow[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("station_editor_invites")
    .select("id,invite_token,invite_code,status,max_uses,use_count,expires_at,created_by_id,created_by_email,accepted_at,accepted_name,accepted_session_id,accepted_by_user_agent,revoked_at,revoked_by_id,revoked_by_email,last_used_at,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as StationEditorInviteRow[];
}

async function loadMergedInviteRows(limit = 40) {
  const directRows = await loadDirectInviteRows(limit);
  const fallbackRows = await loadFallbackInviteStates(limit * 3);
  const merged = new Map<string, StationEditorInvite>();

  for (const row of directRows) {
    merged.set(row.invite_code, mapInvite(row));
  }

  for (const state of fallbackRows) {
    if (!merged.has(state.inviteCode)) {
      merged.set(state.inviteCode, mapFallbackInvite(state));
    }
  }

  return [...merged.values()].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()).slice(0, limit);
}

async function persistFallbackInviteState(state: OperationalEventInviteState, actorId?: string | null, actorEmail?: string | null) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("operational_events").insert({
    event_type: FALLBACK_EVENT_TYPE,
    severity: "info",
    scope_type: FALLBACK_SCOPE_TYPE,
    scope_id: state.inviteCode,
    actor_id: actorId ?? state.createdById ?? null,
    actor_email: actorEmail ?? state.createdByEmail ?? null,
    reason: state.status,
    payload: {
      id: state.id,
      invite_token: state.inviteToken,
      invite_code: state.inviteCode,
      status: state.status,
      max_uses: state.maxUses,
      use_count: state.useCount,
      expires_at: state.expiresAt,
      created_by_id: state.createdById,
      created_by_email: state.createdByEmail,
      accepted_at: state.acceptedAt,
      accepted_name: state.acceptedName,
      accepted_session_id: state.acceptedSessionId,
      accepted_by_user_agent: state.acceptedByUserAgent,
      revoked_at: state.revokedAt,
      revoked_by_id: state.revokedById,
      revoked_by_email: state.revokedByEmail,
      last_used_at: state.lastUsedAt,
      created_at: state.createdAt,
      updated_at: state.updatedAt
    }
  });

  if (error) {
    throw new StationEditorInviteError(error.message, error.code);
  }
}

async function findFallbackInviteByTokenOrCode(input: { inviteToken?: string | null; inviteCode?: string | null }) {
  const token = String(input.inviteToken ?? "").trim();
  const normalizedCode = normalizeInviteCode(String(input.inviteCode ?? ""));
  const invites = await loadFallbackInviteStates(300);

  return invites.find((invite) => invite.inviteToken === token || invite.inviteCode === normalizedCode) ?? null;
}

function toState(row: StationEditorInviteRow): OperationalEventInviteState {
  return {
    id: row.id,
    inviteToken: row.invite_token,
    inviteCode: row.invite_code,
    status: row.status,
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
    updatedAt: row.updated_at
  };
}

function toSessionTokenPayload(invite: StationEditorInviteRow, sessionId: string, displayName: string, expiresAt: string) {
  return createStationEditorSessionCookieValue({
    id: sessionId,
    inviteId: invite.id,
    role: "station_editor",
    displayName,
    expiresAt,
    inviteCode: invite.invite_code
  });
}

export async function getStationEditorInviteByCodeOrToken(input: { inviteToken?: string | null; inviteCode?: string | null }) {
  const direct = await findInviteByTokenOrCode(input);
  if (direct) {
    return mapInvite(direct);
  }

  const fallback = await findFallbackInviteByTokenOrCode(input);
  if (!fallback) {
    return null;
  }

  return mapFallbackInvite(fallback);
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
  const inviteCode = normalizeInviteCode(input.inviteCode || generateStationEditorInviteCode());

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

  if (data) {
    return mapInvite(data as StationEditorInviteRow);
  }

  if (error && !isSchemaMissingOrPartialError(error)) {
    throw new StationEditorInviteError(error.message, error.code);
  }

  const state: OperationalEventInviteState = {
    id: inviteCode,
    inviteToken,
    inviteCode,
    status: "pendente",
    maxUses,
    useCount: 0,
    expiresAt,
    createdById: input.createdById ?? null,
    createdByEmail: input.createdByEmail ?? null,
    acceptedAt: null,
    acceptedName: null,
    acceptedSessionId: null,
    acceptedByUserAgent: null,
    revokedAt: null,
    revokedById: null,
    revokedByEmail: null,
    lastUsedAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  await persistFallbackInviteState(state, input.createdById ?? null, input.createdByEmail ?? null);
  return mapFallbackInvite(state);
}

export async function getStationEditorInviteReadout(limit = 40): Promise<StationEditorInviteReadout> {
  const invites = await loadMergedInviteRows(limit);

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

  if (data) {
    return mapInvite(data as StationEditorInviteRow);
  }

  if (error && !isSchemaMissingOrPartialError(error)) {
    throw new Error(error.message);
  }

  const fallbackInvites = await loadFallbackInviteStates(300);
  const current = fallbackInvites.find((invite) => invite.id === input.inviteId || invite.inviteCode === normalizeInviteCode(input.inviteId));

  if (!current) {
    throw new Error("station_editor_invite_not_found");
  }

  const nextState: OperationalEventInviteState = {
    ...current,
    status: "revogado",
    revokedAt: now,
    revokedById: input.revokedById ?? null,
    revokedByEmail: input.revokedByEmail ?? null,
    updatedAt: now
  };

  await persistFallbackInviteState(nextState, input.revokedById ?? null, input.revokedByEmail ?? null);
  return mapFallbackInvite(nextState);
}

async function acceptStationEditorInviteFallback(input: {
  invite: OperationalEventInviteState;
  displayName: string;
  userAgent?: string | null;
  keepOnDevice?: boolean;
}) {
  const now = new Date().toISOString();
  const sessionId = randomUUID();
  const ttlDays = input.keepOnDevice ? TRUSTED_DEVICE_SESSION_TTL_DAYS : DEFAULT_SESSION_TTL_DAYS;
  const sessionExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * ttlDays).toISOString();
  const nextUseCount = input.invite.useCount + 1;
  const nextStatus: StationEditorInviteStatus = nextUseCount >= input.invite.maxUses ? "aceito" : "pendente";
  const nextState: OperationalEventInviteState = {
    ...input.invite,
    status: nextStatus,
    useCount: nextUseCount,
    acceptedAt: now,
    acceptedName: input.displayName,
    acceptedSessionId: sessionId,
    acceptedByUserAgent: input.userAgent ?? null,
    lastUsedAt: now,
    updatedAt: now
  };

  await persistFallbackInviteState(nextState, nextState.createdById ?? null, nextState.createdByEmail ?? null);

  return {
    ok: true as const,
    reason: null,
    invite: mapFallbackInvite(nextState),
    sessionToken: toSessionTokenPayload(
      {
        id: nextState.id,
        invite_token: nextState.inviteToken,
        invite_code: nextState.inviteCode,
        status: nextState.status,
        max_uses: nextState.maxUses,
        use_count: nextState.useCount,
        expires_at: nextState.expiresAt,
        created_by_id: nextState.createdById,
        created_by_email: nextState.createdByEmail,
        accepted_at: nextState.acceptedAt,
        accepted_name: nextState.acceptedName,
        accepted_session_id: nextState.acceptedSessionId,
        accepted_by_user_agent: nextState.acceptedByUserAgent,
        revoked_at: nextState.revokedAt,
        revoked_by_id: nextState.revokedById,
        revoked_by_email: nextState.revokedByEmail,
        last_used_at: nextState.lastUsedAt,
        created_at: nextState.createdAt,
        updated_at: nextState.updatedAt
      },
      sessionId,
      input.displayName,
      sessionExpiresAt
    ),
    session: {
      id: sessionId,
      inviteId: nextState.id,
      role: "station_editor" as const,
      displayName: input.displayName,
      expiresAt: sessionExpiresAt,
      inviteCode: nextState.inviteCode
    }
  };
}

export async function acceptStationEditorInvite(input: {
  inviteToken?: string | null;
  inviteCode?: string | null;
  displayName: string;
  userAgent?: string | null;
  keepOnDevice?: boolean;
}) {
  const displayName = String(input.displayName ?? "").trim();
  if (displayName.length < 2) {
    return { ok: false as const, reason: "missing_display_name" as const, invite: null, sessionToken: null, session: null };
  }

  const keepOnDevice = Boolean(input.keepOnDevice);

  const directInvite = await findInviteByTokenOrCode({ inviteToken: input.inviteToken, inviteCode: input.inviteCode });
  const fallbackInvite = directInvite ? null : await findFallbackInviteByTokenOrCode({ inviteToken: input.inviteToken, inviteCode: input.inviteCode });
  const invite = directInvite ? toState(directInvite) : fallbackInvite;

  if (!invite) {
    return { ok: false as const, reason: "invite_not_found" as const, invite: null, sessionToken: null, session: null };
  }

  const effectiveStatus = toEffectiveStatus({
    status: invite.status,
    expires_at: invite.expiresAt,
    revoked_at: invite.revokedAt,
    use_count: invite.useCount,
    max_uses: invite.maxUses,
    accepted_at: invite.acceptedAt
  });

  if (effectiveStatus === "revogado") {
    return { ok: false as const, reason: "invite_revoked" as const, invite: directInvite ? mapInvite(directInvite) : mapFallbackInvite(invite), sessionToken: null, session: null };
  }
  if (effectiveStatus === "expirado") {
    return { ok: false as const, reason: "invite_expired" as const, invite: directInvite ? mapInvite(directInvite) : mapFallbackInvite(invite), sessionToken: null, session: null };
  }
  if (invite.useCount >= invite.maxUses) {
    return { ok: false as const, reason: "invite_exhausted" as const, invite: directInvite ? mapInvite(directInvite) : mapFallbackInvite(invite), sessionToken: null, session: null };
  }

  if (directInvite) {
    const supabase = createSupabaseServiceClient();
    const now = new Date().toISOString();
    const sessionToken = randomBytes(24).toString("base64url");
    const sessionTokenHash = hashSessionToken(sessionToken);
    const ttlDays = keepOnDevice ? TRUSTED_DEVICE_SESSION_TTL_DAYS : DEFAULT_SESSION_TTL_DAYS;
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * ttlDays).toISOString();

    const { data: sessionInsert, error: sessionError } = await supabase
      .from("station_editor_sessions")
      .insert({
        invite_id: directInvite.id,
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
      if (sessionError && !isSchemaMissingOrPartialError(sessionError)) {
        return { ok: false as const, reason: "session_create_failed" as const, invite: mapInvite(directInvite), sessionToken: null, session: null };
      }
      return acceptStationEditorInviteFallback({ invite, displayName, userAgent: input.userAgent, keepOnDevice });
    }

    const nextUseCount = directInvite.use_count + 1;
    const nextStatus: StationEditorInviteStatus = nextUseCount >= directInvite.max_uses ? "aceito" : "pendente";
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
      .eq("id", directInvite.id)
      .eq("use_count", directInvite.use_count)
      .select("id,invite_token,invite_code,status,max_uses,use_count,expires_at,created_by_id,created_by_email,accepted_at,accepted_name,accepted_session_id,accepted_by_user_agent,revoked_at,revoked_by_id,revoked_by_email,last_used_at,created_at,updated_at")
      .maybeSingle();

    if (inviteError || !inviteUpdate) {
      await supabase.from("station_editor_sessions").delete().eq("id", sessionInsert.id);
      if (inviteError && isSchemaMissingOrPartialError(inviteError)) {
        return acceptStationEditorInviteFallback({ invite, displayName, userAgent: input.userAgent, keepOnDevice });
      }
      return { ok: false as const, reason: "invite_claim_failed" as const, invite: mapInvite(directInvite), sessionToken: null, session: null };
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

  return acceptStationEditorInviteFallback({ invite, displayName, userAgent: input.userAgent, keepOnDevice });
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
  // Only kill the session on explicit admin revocation — not on invite expiry.
  // The session has its own expires_at; the invite TTL is only for first activation.
  const inviteRevoked = Boolean(inviteMeta) && (inviteMeta!.status === "revogado" || Boolean(inviteMeta!.revoked_at));

  if (row.status !== "active" || sessionExpired || inviteRevoked) {
    const nextStatus = inviteRevoked ? "revoked" : "expired";
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
