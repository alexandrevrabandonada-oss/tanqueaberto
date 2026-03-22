"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordOperationalEvent } from "@/lib/ops/logs";
import { getSafeBetaNextPath, isBetaClosed } from "@/lib/beta/gate";
import { hasBetaAccessFromCookies } from "@/lib/beta/session";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export interface BetaFeedbackState {
  error: string | null;
  success: boolean;
}

function getFeedbackString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function submitBetaFeedbackAction(_prevState: BetaFeedbackState, formData: FormData): Promise<BetaFeedbackState> {
  if (isBetaClosed() && !(await hasBetaAccessFromCookies())) {
    redirect("/beta");
  }

  const feedbackType = getFeedbackString(formData, "feedbackType");
  const message = getFeedbackString(formData, "message");
  const pagePath = getSafeBetaNextPath(getFeedbackString(formData, "pagePath") || "/");
  const pageTitle = getFeedbackString(formData, "pageTitle") || null;
  const testerNickname = getFeedbackString(formData, "testerNickname") || null;
  const stationId = getFeedbackString(formData, "stationId") || null;
  const city = getFeedbackString(formData, "city") || null;
  const fuelType = getFeedbackString(formData, "fuelType") || null;
  const context = getFeedbackString(formData, "context") || null;

  if (!feedbackType) {
    return { error: "Escolha o tipo de feedback.", success: false };
  }

  if (!message || message.length < 8) {
    return { error: "Escreva um feedback um pouco mais completo.", success: false };
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("beta_feedback_submissions").insert({
    feedback_type: feedbackType,
    message,
    page_path: pagePath,
    page_title: pageTitle,
    page_context: context,
    tester_nickname: testerNickname,
    station_id: stationId || null,
    city: city || null,
    fuel_type: fuelType || null,
    status: "new"
  });

  if (error) {
    await recordOperationalEvent({
      eventType: "beta_feedback_failed",
      severity: "error",
      scopeType: "feedback",
      reason: error.message,
      payload: {
        feedbackType,
        pagePath,
        city,
        fuelType,
        stationId
      }
    });
    return { error: "Não foi possível salvar seu feedback agora.", success: false };
  }

  await recordOperationalEvent({
    eventType: "beta_feedback_received",
    severity: "info",
    scopeType: "feedback",
    reason: feedbackType,
    city,
    fuelType,
    stationId,
    payload: {
      pagePath,
      pageTitle,
      testerNickname,
      context,
      message
    }
  });

  revalidatePath("/admin/ops");
  revalidatePath("/admin");
  return { error: null, success: true };
}
