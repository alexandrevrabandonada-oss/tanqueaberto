import { revalidatePath } from "next/cache";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";

async function updateReportStatus(reportId: string, status: "approved" | "rejected") {
  const supabase = createSupabaseServiceClient();

  const { data: report, error: reportError } = await supabase
    .from("price_reports")
    .select("id,station_id")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError || !report) {
    throw new Error("Report not found");
  }

  const moderationNote = status === "approved" ? "Aprovado no painel" : "Rejeitado no painel";

  const { error } = await supabase
    .from("price_reports")
    .update({ status, moderation_note: moderationNote })
    .eq("id", reportId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/atualizacoes");
  revalidatePath("/admin");
  revalidatePath(`/postos/${report.station_id}`);
}

export async function approveReportAction(formData: FormData) {
  "use server";
  const reportId = String(formData.get("reportId") ?? "");
  if (!reportId) {
    throw new Error("Report ID is required");
  }
  await updateReportStatus(reportId, "approved");
}

export async function rejectReportAction(formData: FormData) {
  "use server";
  const reportId = String(formData.get("reportId") ?? "");
  if (!reportId) {
    throw new Error("Report ID is required");
  }
  await updateReportStatus(reportId, "rejected");
}
