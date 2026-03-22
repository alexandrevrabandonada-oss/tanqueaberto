"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { requireAdminUser } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminLoginState {
  error: string | null;
  success: boolean;
}

const ADMIN_ROUTE = "/admin" as Route;
const ADMIN_LOGIN_ROUTE = "/admin/login" as Route;

function normalizeNotice(action: "approved" | "rejected") {
  return action === "approved" ? "Aprovado no painel." : "Rejeitado no painel.";
}

export async function signInAdminAction(_prevState: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha.", success: false };
  }

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    return { error: "Não foi possível entrar com essas credenciais.", success: false };
  }

  const { data: adminRow, error: adminError } = await supabase.from("admin_users").select("email").eq("email", email).maybeSingle();

  if (adminError) {
    return { error: "Falha ao validar acesso administrativo.", success: false };
  }

  if (!adminRow?.email) {
    await supabase.auth.signOut();
    return { error: "Seu e-mail não está liberado para o admin.", success: false };
  }

  return { error: null, success: true };
}

export async function signOutAdminAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(ADMIN_LOGIN_ROUTE);
}

async function moderateReport(reportId: string, decision: "approved" | "rejected", moderationNote?: string) {
  await requireAdminUser();
  const supabase = await createSupabaseServerClient();

  const { data: report, error: reportError } = await supabase.from("price_reports").select("id,station_id").eq("id", reportId).maybeSingle();

  if (reportError || !report) {
    redirect(ADMIN_ROUTE);
  }

  const note = moderationNote?.trim() || normalizeNotice(decision);
  const { error } = await supabase.from("price_reports").update({ status: decision, moderation_note: note }).eq("id", reportId);

  if (error) {
    redirect(ADMIN_ROUTE);
  }

  revalidatePath("/");
  revalidatePath("/atualizacoes");
  revalidatePath("/admin");
  revalidatePath(`/postos/${report.station_id}`);
  redirect(ADMIN_ROUTE);
}

export async function moderateReportAction(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "");
  const decision = String(formData.get("decision") ?? "") as "approved" | "rejected";
  const moderationNote = String(formData.get("moderationNote") ?? "");

  if (!reportId || (decision !== "approved" && decision !== "rejected")) {
    redirect(ADMIN_ROUTE);
  }

  await moderateReport(reportId, decision, moderationNote);
}
