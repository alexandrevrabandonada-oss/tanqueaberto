"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface FeedbackInput {
  message: string;
  tags: string[];
  page_path: string;
  station_id?: string | null;
  city?: string | null;
  context_type: 'skip' | 'abandon' | 'navigation' | 'generic';
}

export async function submitContextualFeedbackAction(input: FeedbackInput) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Auto-triage tags logic
    const autoTags = [...input.tags];
    const msg = input.message.toLowerCase();
    
    if (msg.includes("longe") || msg.includes("distancia")) autoTags.push("recorte_fraco");
    if (msg.includes("errado") || msg.includes("mapa") || msg.includes("localizacao")) autoTags.push("posto_ambiguo");
    if (msg.includes("lento") || msg.includes("demor") || msg.includes("fila")) autoTags.push("moderacao_lenta");
    if (msg.includes("interface") || msg.includes("ruim") || msg.includes("entendi")) autoTags.push("ux_confusa");
    
    const { error } = await supabase
      .from('beta_feedback_submissions')
      .insert({
        message: input.message,
        page_path: input.page_path,
        feedback_type: 'problema',
        station_id: input.station_id || null,
        city: input.city || null,
        triage_tags: Array.from(new Set(autoTags)),
        screen_group: input.context_type,
        status: 'new'
      });

    if (error) throw error;
    
    revalidatePath("/admin/ops");
    return { success: true };
  } catch (error) {
    console.error("Failed to submit feedback", error);
    return { success: false, error: "Falha ao enviar feedback" };
  }
}
