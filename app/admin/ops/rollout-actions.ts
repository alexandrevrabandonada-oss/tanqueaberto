"use server";

import { revalidatePath } from "next/cache";
import { applyRolloutChange, type TerritorialOperationalState } from "@/lib/ops/rollout-engine";
import { requireAdminUser } from "@/lib/auth/admin";

export async function handleRolloutApproval(
  groupId: string,
  newState: TerritorialOperationalState,
  changeKind: 'automated' | 'manual_override',
  reason: string
) {
  const admin = await requireAdminUser();
  
  await applyRolloutChange(
    groupId,
    newState,
    changeKind,
    reason,
    admin.id
  );

  revalidatePath("/admin/ops");
  revalidatePath("/admin/ops/aprendizado");
}
