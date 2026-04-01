import { createHmac } from "node:crypto";

export interface StationEditorSessionCookiePayload {
  id: string;
  inviteId: string;
  role: "station_editor";
  displayName: string;
  expiresAt: string;
  inviteCode: string | null;
}

const COOKIE_PREFIX = "se1";

function getSessionSigningSecret() {
  const secret = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!secret) {
    throw new Error("Missing session signing secret.");
  }

  return secret;
}

function encodePayload(payload: StationEditorSessionCookiePayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(raw: string) {
  return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as StationEditorSessionCookiePayload;
}

function sign(value: string) {
  return createHmac("sha256", getSessionSigningSecret()).update(value).digest("base64url");
}

export function createStationEditorSessionCookieValue(payload: StationEditorSessionCookiePayload) {
  const encoded = encodePayload(payload);
  return `${COOKIE_PREFIX}.${encoded}.${sign(encoded)}`;
}

export function readStationEditorSessionCookieValue(value: string) {
  const token = String(value ?? "").trim();
  const [prefix, encoded, signature] = token.split(".");

  if (prefix !== COOKIE_PREFIX || !encoded || !signature) {
    return null;
  }

  if (sign(encoded) !== signature) {
    return null;
  }

  try {
    const payload = decodePayload(encoded);
    if (!payload.id || !payload.inviteId || payload.role !== "station_editor" || !payload.displayName || !payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
