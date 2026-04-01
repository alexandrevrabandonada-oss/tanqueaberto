import "server-only";

import { cookies } from "next/headers";

import { getStationEditorInviteByCodeOrToken, getStationEditorSessionByToken, type StationEditorSession } from "@/lib/ops/station-editor-invites";
import { readStationEditorSessionCookieValue } from "@/lib/auth/station-editor-session-token";

export const STATION_EDITOR_SESSION_COOKIE = "ba_station_editor_session";

export async function setStationEditorSessionCookie(token: string, expiresAt: string) {
  const cookieStore = await cookies();
  cookieStore.set(STATION_EDITOR_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt)
  });
}

export async function clearStationEditorSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(STATION_EDITOR_SESSION_COOKIE);
}

export async function getStationEditorSessionFromCookie(): Promise<StationEditorSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STATION_EDITOR_SESSION_COOKIE)?.value ?? null;

  if (!token) {
    return null;
  }

  const session = await getStationEditorSessionByToken(token);
  if (session) {
    return session;
  }

  const signedSession = readStationEditorSessionCookieValue(token);
  if (!signedSession) {
    return null;
  }

  const invite = await getStationEditorInviteByCodeOrToken({ inviteCode: signedSession.inviteCode ?? signedSession.inviteId, inviteToken: null });
  if (!invite || invite.effectiveStatus === "revogado" || invite.effectiveStatus === "expirado") {
    return null;
  }

  return {
    id: signedSession.id,
    inviteId: signedSession.inviteId,
    role: signedSession.role,
    displayName: signedSession.displayName,
    expiresAt: signedSession.expiresAt,
    inviteCode: signedSession.inviteCode
  };
}
