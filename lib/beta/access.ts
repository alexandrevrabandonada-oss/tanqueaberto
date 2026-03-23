import { getBetaInviteCode, normalizeBetaInviteCode, isBetaClosed } from "./gate";
import { isManagedBetaInviteCodeValid } from "./invites";

export async function isBetaAccessTokenValid(token: string | undefined | null) {
  const inviteCode = getBetaInviteCode();
  if (!token) {
    return false;
  }

  const normalizedToken = normalizeBetaInviteCode(token);
  if (!inviteCode) {
    return await isManagedBetaInviteCodeValid(normalizedToken);
  }

  if (normalizeBetaInviteCode(inviteCode) === normalizedToken) {
    return true;
  }

  return await isManagedBetaInviteCodeValid(normalizedToken);
}

export { isBetaClosed };
