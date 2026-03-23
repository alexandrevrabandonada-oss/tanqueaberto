"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { recordOperationalEvent } from "@/lib/ops/logs";
import { getSafeBetaNextPath, isBetaClosed } from "@/lib/beta/gate";
import { setBetaAccessCookie } from "@/lib/beta/session";
import { claimBetaInviteCodeUse, getEnvBetaInviteCode, normalizeBetaInviteCode } from "@/lib/beta/invites";

export interface BetaInviteState {
  error: string | null;
  success: boolean;
}

export async function submitBetaInviteAction(_prevState: BetaInviteState, formData: FormData): Promise<BetaInviteState> {
  const code = String(formData.get("code") ?? "").trim();
  const next = getSafeBetaNextPath(String(formData.get("next") ?? "/"));

  if (!isBetaClosed()) {
    redirect(next as Route);
  }

  const expected = getEnvBetaInviteCode();
  const normalizedCode = normalizeBetaInviteCode(code);
  if (!code) {
    await recordOperationalEvent({
      eventType: "beta_access_failed",
      severity: "warning",
      scopeType: "beta",
      reason: "invite_code_missing"
    });
    return { error: "Digite o código do convite.", success: false };
  }

  if (expected && normalizeBetaInviteCode(expected) === normalizedCode) {
    await setBetaAccessCookie(normalizedCode);
    await recordOperationalEvent({
      eventType: "beta_access_granted",
      severity: "info",
      scopeType: "beta",
      reason: "invite_code_valid",
      payload: { next, source: "env_fallback" }
    });

    revalidatePath(next);
    return { error: null, success: true };
  }

  const claim = await claimBetaInviteCodeUse(normalizedCode);
  if (!claim.ok) {
    await recordOperationalEvent({
      eventType: "beta_access_failed",
      severity: "warning",
      scopeType: "beta",
      reason: claim.reason,
      payload: { next, code: normalizedCode }
    });

    if (claim.reason === "invite_code_expired") {
      return { error: "Esse convite expirou.", success: false };
    }
    if (claim.reason === "invite_code_inactive") {
      return { error: "Esse convite foi desativado.", success: false };
    }
    if (claim.reason === "invite_code_exhausted") {
      return { error: "Esse convite já atingiu o limite de uso.", success: false };
    }

    return { error: "Código inválido. Confira o convite e tente de novo.", success: false };
  }

  await setBetaAccessCookie(normalizedCode);
  await recordOperationalEvent({
    eventType: "beta_access_granted",
    severity: "info",
    scopeType: "beta",
    reason: "invite_code_valid",
    payload: { next, code: normalizedCode, batchLabel: claim.item?.batchLabel ?? null }
  });

  revalidatePath(next);
  return { error: null, success: true };
}
