"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { requireAdminUser } from "@/lib/auth/admin";
import { recordAdminActionLog } from "@/lib/ops/logs";
import { runAuditDossiersJob, runAuditRefreshJob } from "@/lib/ops/scheduler";
import { seedOperationalGroups } from "@/lib/ops/groups";

const OPS_ROUTE = "/admin/ops" as Route;

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
