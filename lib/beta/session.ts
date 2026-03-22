import { cookies } from "next/headers";

import { BETA_ACCESS_COOKIE_NAME, getBetaInviteCode, isBetaAccessTokenValid, isBetaClosed } from "./gate";

export async function hasBetaAccessFromCookies() {
  if (!isBetaClosed()) {
    return true;
  }

  const cookieStore = await cookies();
  return isBetaAccessTokenValid(cookieStore.get(BETA_ACCESS_COOKIE_NAME)?.value ?? null);
}

export async function setBetaAccessCookie() {
  const cookieStore = await cookies();
  const inviteCode = getBetaInviteCode();

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
