import { cookies } from "next/headers";

import { BETA_ACCESS_COOKIE_NAME, getBetaInviteCode, isBetaClosed } from "./gate";
import { isBetaAccessTokenValid } from "./access";

export async function hasBetaAccessFromCookies() {
  if (!isBetaClosed()) {
    return true;
  }

  const cookieStore = await cookies();
  return await isBetaAccessTokenValid(cookieStore.get(BETA_ACCESS_COOKIE_NAME)?.value ?? null);
}

export async function setBetaAccessCookie(token?: string | null) {
  const cookieStore = await cookies();
  const inviteCode = String(token ?? getBetaInviteCode()).trim();

  cookieStore.set(BETA_ACCESS_COOKIE_NAME, inviteCode, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
}

export async function clearBetaAccessCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(BETA_ACCESS_COOKIE_NAME);
}
