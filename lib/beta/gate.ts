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

export function normalizeBetaInviteCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
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
    pathname.startsWith("/brand/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/offline" ||
    pathname === "/atualizacoes" ||
    pathname === "/enviar" ||
    pathname === "/hub"
  );
}
