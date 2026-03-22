"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { recordOperationalEvent } from "@/lib/ops/logs";
import { getBetaInviteCode, getSafeBetaNextPath, isBetaClosed } from "@/lib/beta/gate";
import { setBetaAccessCookie } from "@/lib/beta/session";

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

  const expected = getBetaInviteCode();
  if (!expected) {
    await recordOperationalEvent({
      eventType: "beta_access_failed",
      severity: "error",
      scopeType: "beta",
      reason: "invite_code_missing"
    });
    return { error: "Convite não configurado ainda.", success: false };
  }

  if (!code || code !== expected) {
    await recordOperationalEvent({
      eventType: "beta_access_failed",
      severity: "warning",
      scopeType: "beta",
      reason: "invalid_invite_code",
      payload: { next }
    });
    return { error: "Código inválido. Confira o convite e tente de novo.", success: false };
  }

  await setBetaAccessCookie();
  await recordOperationalEvent({
    eventType: "beta_access_granted",
    severity: "info",
    scopeType: "beta",
    reason: "invite_code_valid",
    payload: { next }
  });

  revalidatePath(next);
  return { error: null, success: true };
}
