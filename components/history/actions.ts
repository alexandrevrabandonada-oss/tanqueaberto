"use server";

import { getReportsByIds } from "@/lib/data/queries";

export async function fetchReportStatuses(ids: string[]) {
  return getReportsByIds(ids);
}
