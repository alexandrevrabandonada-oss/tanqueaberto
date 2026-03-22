export const BETA_ACCESS_COOKIE_NAME = "bomba_aberta_beta_access";

function readEnvFlag(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

export function isBetaClosed() {
  return readEnvFlag(process.env.NEXT_PUBLIC_BETA_CLOSED) || readEnvFlag(process.env.BETA_CLOSED);
}

export function getBetaInviteCode() {
  return String(process.env.BETA_INVITE_CODE ?? "").trim();
}

export function isBetaAccessTokenValid(token: string | undefined | null) {
  const inviteCode = getBetaInviteCode();
  if (!inviteCode || !token) {
    return false;
  }

  return token.trim() === inviteCode;
}

export function getSafeBetaNextPath(nextValue: string | null | undefined) {
  if (!nextValue) return "/";
  if (!nextValue.startsWith("/")) return "/";
  if (nextValue.startsWith("//")) return "/";
  return nextValue;
}

export function isBetaBypassedPath(pathname: string) {
  return (
    pathname === "/beta" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/brand/") ||
    pathname === "/favicon.svg" ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/offline"
  );
}
