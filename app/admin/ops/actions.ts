"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { requireAdminUser } from "@/lib/auth/admin";
import { runAuditDossiersJob, runAuditRefreshJob } from "@/lib/ops/scheduler";
import { seedOperationalGroups } from "@/lib/ops/groups";

const OPS_ROUTE = "/admin/ops" as Route;

export async function runAuditRefreshAction() {
  const admin = await requireAdminUser();
  const result = await runAuditRefreshJob({ cadence: "manual", triggeredBy: admin.email });
  revalidatePath("/admin");
  revalidatePath(OPS_ROUTE);
  redirect(`${OPS_ROUTE}?notice=${result.success ? "refresh_ok" : "refresh_failed"}` as Route);
}

export async function runAuditDossiersAction() {
  const admin = await requireAdminUser();
  const result = await runAuditDossiersJob({ cadence: "manual", triggeredBy: admin.email });
  revalidatePath("/admin");
  revalidatePath(OPS_ROUTE);
  redirect(`${OPS_ROUTE}?notice=${result.success ? "dossiers_ok" : "dossiers_failed"}` as Route);
}

export async function seedAuditGroupsAction() {
  await requireAdminUser();
  const result = await seedOperationalGroups();
  revalidatePath("/admin");
  revalidatePath(OPS_ROUTE);
  redirect(`${OPS_ROUTE}?notice=${result.length > 0 ? "groups_seeded" : "groups_pending"}&count=${result.length}` as Route);
}
