import "server-only";

import { cookies } from "next/headers";

import { getStationEditorSessionByToken, type StationEditorSession } from "@/lib/ops/station-editor-invites";

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
  return await getStationEditorSessionByToken(token);
}
