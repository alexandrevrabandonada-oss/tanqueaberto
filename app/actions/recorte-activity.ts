"use server";

import { getRecorteActivity, type RecorteActivity } from "@/lib/ops/recorte-activity";

export async function fetchRecorteActivity(city: string, groupSlug?: string): Promise<RecorteActivity> {
  return await getRecorteActivity(city, groupSlug);
}
