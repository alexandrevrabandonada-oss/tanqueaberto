"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { requireAdminUser } from "@/lib/auth/admin";
import { recordAdminActionLog } from "@/lib/ops/logs";
import { runAuditDossiersJob, runAuditRefreshJob } from "@/lib/ops/scheduler";
import { seedOperationalGroups } from "@/lib/ops/groups";
import { createBetaInviteCode, disableBetaInviteCode } from "@/lib/beta/invites";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const OPS_ROUTE = "/admin/ops" as Route;

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readNullableString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value.length > 0 ? value : null;
}

function readPositiveInteger(formData: FormData, key: string, fallback = 1) {
  const value = Number(readString(formData, key) || String(fallback));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function normalizeDateTimeInput(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function runAuditRefreshAction() {
  const admin = await requireAdminUser();
  const result = await runAuditRefreshJob({ cadence: "manual", triggeredBy: admin.email });

  await recordAdminActionLog({
    actionKind: "job_manual_run",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "job",
    targetId: "audit_refresh",
    note: result.success ? "Refresh analítico executado manualmente." : "Refresh analítico falhou na execução manual.",
    payload: { success: result.success, message: result.message }
  });

  revalidatePath("/admin");
  revalidatePath(OPS_ROUTE);
  redirect(`${OPS_ROUTE}?notice=${result.success ? "refresh_ok" : "refresh_failed"}` as Route);
}

export async function runAuditDossiersAction() {
  const admin = await requireAdminUser();
  const result = await runAuditDossiersJob({ cadence: "manual", triggeredBy: admin.email });

  await recordAdminActionLog({
    actionKind: "job_manual_run",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "job",
    targetId: "audit_dossiers",
    note: result.success ? "Dossiês recorrentes gerados manualmente." : "Geração manual de dossiês falhou.",
    payload: { success: result.success, message: result.message, runs: result.generatedRuns.length }
  });

  revalidatePath("/admin");
  revalidatePath(OPS_ROUTE);
  redirect(`${OPS_ROUTE}?notice=${result.success ? "dossiers_ok" : "dossiers_failed"}` as Route);
}

export async function seedAuditGroupsAction() {
  const admin = await requireAdminUser();
  const result = await seedOperationalGroups();

  await recordAdminActionLog({
    actionKind: "job_manual_run",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "job",
    targetId: "group_seed",
    note: result.length > 0 ? "Grupos territoriais preenchidos manualmente." : "Seed de grupos adiado.",
    payload: { count: result.length }
  });

  revalidatePath("/admin");
  revalidatePath(OPS_ROUTE);
  redirect(`${OPS_ROUTE}?notice=${result.length > 0 ? "groups_seeded" : "groups_pending"}&count=${result.length}` as Route);
}

export async function createBetaInviteAction(formData: FormData) {
  const admin = await requireAdminUser();
  const result = await createBetaInviteCode({
    batchLabel: readString(formData, "batchLabel") || "beta fechado",
    batchNote: readNullableString(formData, "batchNote"),
    testerNote: readNullableString(formData, "testerNote"),
    maxUses: readPositiveInteger(formData, "maxUses", 1),
    expiresAt: normalizeDateTimeInput(readNullableString(formData, "expiresAt")),
    isActive: true,
    createdById: admin.id,
    createdByEmail: admin.email,
    code: readNullableString(formData, "code")
  });

  await recordAdminActionLog({
    actionKind: "beta_invite_created",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "beta_invite_code",
    targetId: result.item?.id ?? null,
    note: result.ok ? `Convite criado para ${result.item?.batchLabel ?? "beta"}.` : `Falha ao criar convite: ${result.error ?? "desconhecido"}.`,
    payload: {
      ok: result.ok,
      code: result.item?.code ?? null,
      batchLabel: result.item?.batchLabel ?? null,
      maxUses: result.item?.maxUses ?? null,
      expiresAt: result.item?.expiresAt ?? null
    }
  });

  revalidatePath("/admin");
  revalidatePath(OPS_ROUTE);
  redirect(`${OPS_ROUTE}?notice=${result.ok ? "invite_created" : "invite_failed"}` as Route);
}

export async function disableBetaInviteAction(formData: FormData) {
  const admin = await requireAdminUser();
  const inviteId = readString(formData, "inviteId");
  const result = await disableBetaInviteCode(inviteId, admin.email);

  await recordAdminActionLog({
    actionKind: "beta_invite_disabled",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "beta_invite_code",
    targetId: inviteId,
    note: result.ok ? "Convite desativado." : `Falha ao desativar convite: ${result.error ?? "desconhecido"}.`,
    payload: { ok: result.ok }
  });

  revalidatePath("/admin");
  revalidatePath(OPS_ROUTE);
  redirect(`${OPS_ROUTE}?notice=${result.ok ? "invite_disabled" : "invite_disable_failed"}` as Route);
}

export async function updateBetaFeedbackTriageAction(formData: FormData) {
  const admin = await requireAdminUser();
  const feedbackId = readString(formData, "feedbackId");
  const triageStatus = readString(formData, "triageStatus");

  if (!feedbackId || !["novo", "em_analise", "resolvido"].includes(triageStatus)) {
    redirect(`${OPS_ROUTE}?notice=triage_invalid` as Route);
  }

  const supabase = createSupabaseServiceClient();
  const statusMap: Record<string, string> = { novo: "new", em_analise: "reviewing", resolvido: "resolved" };
  const { error } = await supabase
    .from("beta_feedback_submissions")
    .update({ triage_status: triageStatus, status: statusMap[triageStatus] })
    .eq("id", feedbackId);

  await recordAdminActionLog({
    actionKind: "beta_feedback_triage_updated",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "beta_feedback_submission",
    targetId: feedbackId,
    note: error ? `Falha ao atualizar triagem: ${error.message}` : `Triagem marcada como ${triageStatus}.`,
    payload: { triageStatus, success: !error }
  });

  revalidatePath("/admin");
  revalidatePath(OPS_ROUTE);
  redirect(`${OPS_ROUTE}?notice=${error ? "triage_failed" : "triage_ok"}` as Route);
}
