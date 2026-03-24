"use server";

import { getRecorteActivity } from "@/lib/ops/recorte-activity";

export async function getRecortePulseAction(city: string, groupSlug?: string) {
  try {
    return await getRecorteActivity(city, groupSlug);
  } catch (error) {
    console.error("Failed to fetch recorte pulse", error);
    return null;
  }
}
