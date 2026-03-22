import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export interface BetaFeedbackItem {
  id: string;
  feedbackType: string;
  message: string;
  pagePath: string;
  pageTitle: string | null;
  pageContext: string | null;
  testerNickname: string | null;
  stationId: string | null;
  city: string | null;
  fuelType: string | null;
  status: string;
  screenGroup: string;
  triageStatus: string;
  triageTags: string[];
  createdAt: string;
}

export interface BetaFeedbackSummary {
  total: number;
  byType: Array<{ feedbackType: string; count: number }>;
  byScreen: Array<{ screenGroup: string; count: number }>;
  byStatus: Array<{ triageStatus: string; count: number }>;
  byTag: Array<{ tag: string; count: number }>;
  byPage: Array<{ pagePath: string; count: number }>;
  byCity: Array<{ city: string; count: number }>;
  recent: BetaFeedbackItem[];
}

function toFeedbackItem(row: Record<string, unknown>): BetaFeedbackItem {
  return {
    id: String(row.id),
    feedbackType: String(row.feedback_type),
    message: String(row.message),
    pagePath: String(row.page_path),
    pageTitle: row.page_title ? String(row.page_title) : null,
    pageContext: row.page_context ? String(row.page_context) : null,
    testerNickname: row.tester_nickname ? String(row.tester_nickname) : null,
    stationId: row.station_id ? String(row.station_id) : null,
    city: row.city ? String(row.city) : null,
    fuelType: row.fuel_type ? String(row.fuel_type) : null,
    status: String(row.status),
    screenGroup: row.screen_group ? String(row.screen_group) : "outros",
    triageStatus: row.triage_status ? String(row.triage_status) : String(row.status),
    triageTags: Array.isArray(row.triage_tags) ? row.triage_tags.map((item) => String(item)) : [],
    createdAt: String(row.created_at)
  };
}

export async function getRecentBetaFeedback(limit = 12): Promise<BetaFeedbackItem[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("beta_feedback_submissions")
    .select("id,feedback_type,message,page_path,page_title,page_context,tester_nickname,station_id,city,fuel_type,status,screen_group,triage_status,triage_tags,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Failed to load beta feedback", error);
    return [];
  }

  return data.map((row) => toFeedbackItem(row as Record<string, unknown>));
}

export async function getBetaFeedbackSummary(days = 14): Promise<BetaFeedbackSummary> {
  const supabase = createSupabaseServiceClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("beta_feedback_submissions")
    .select("id,feedback_type,message,page_path,page_title,page_context,tester_nickname,station_id,city,fuel_type,status,screen_group,triage_status,triage_tags,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to load beta feedback summary", error);
    return {
      total: 0,
      byType: [],
      byScreen: [],
      byStatus: [],
      byTag: [],
      byPage: [],
      byCity: [],
      recent: []
    };
  }

  const recent = data.map((row) => toFeedbackItem(row as Record<string, unknown>));
  const byTypeMap = new Map<string, number>();
  const byScreenMap = new Map<string, number>();
  const byStatusMap = new Map<string, number>();
  const byTagMap = new Map<string, number>();
  const byPageMap = new Map<string, number>();
  const byCityMap = new Map<string, number>();

  for (const item of recent) {
    byTypeMap.set(item.feedbackType, (byTypeMap.get(item.feedbackType) ?? 0) + 1);
    byScreenMap.set(item.screenGroup, (byScreenMap.get(item.screenGroup) ?? 0) + 1);
    byStatusMap.set(item.triageStatus, (byStatusMap.get(item.triageStatus) ?? 0) + 1);
    byPageMap.set(item.pagePath, (byPageMap.get(item.pagePath) ?? 0) + 1);
    if (item.city) {
      byCityMap.set(item.city, (byCityMap.get(item.city) ?? 0) + 1);
    }
    for (const tag of item.triageTags) {
      byTagMap.set(tag, (byTagMap.get(tag) ?? 0) + 1);
    }
  }

  return {
    total: recent.length,
    byType: Array.from(byTypeMap.entries())
      .map(([feedbackType, count]) => ({ feedbackType, count }))
      .sort((left, right) => right.count - left.count),
    byScreen: Array.from(byScreenMap.entries())
      .map(([screenGroup, count]) => ({ screenGroup, count }))
      .sort((left, right) => right.count - left.count),
    byStatus: Array.from(byStatusMap.entries())
      .map(([triageStatus, count]) => ({ triageStatus, count }))
      .sort((left, right) => right.count - left.count),
    byTag: Array.from(byTagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((left, right) => right.count - left.count),
    byPage: Array.from(byPageMap.entries())
      .map(([pagePath, count]) => ({ pagePath, count }))
      .sort((left, right) => right.count - left.count),
    byCity: Array.from(byCityMap.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((left, right) => right.count - left.count),
    recent: recent.slice(0, 10)
  };
}
