"use server";

import { headers } from "next/headers";

import { getOrCreateCollectorTrust, getUtilityStatus, type UtilityStatus, type CollectorTrust } from "@/lib/ops/collector-trust";
import { getSubmissionClientIp, hashSubmissionIp } from "@/lib/ops/rate-limit";
import type { ProgressiveIdentityRemoteSnapshot } from "@/lib/identity/progressive";
import { logRuntimeIssue } from "@/lib/observability/runtime-issues";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

function normalizeTrustStage(value: string | null | undefined): CollectorTrust["trustStage"] {
  switch ((value ?? "").toLowerCase()) {
    case "trusted":
      return "confiável";
    case "review_needed":
      return "em_revisão";
    case "blocked":
      return "bloqueado";
    case "new":
      return "novo";
    case "muito_confiável":
    case "confiável":
    case "em_revisão":
    case "bloqueado":
      return value as CollectorTrust["trustStage"];
    default:
      return "novo";
  }
}

async function findCollectorTrustReadOnly(nickname: string | null, ipHash: string | null): Promise<CollectorTrust | null> {
  const supabase = createSupabaseServiceClient();
  const columns = "nickname, ip_hash, score, total_reports, approved_reports, rejected_reports, trust_stage, streak_days, missions_completed, last_report_at, is_tester, cohort";

  const mapCollectorTrustRow = (row: {
    nickname: string | null;
    ip_hash: string | null;
    score: number;
    total_reports: number;
    approved_reports: number;
    rejected_reports: number;
    trust_stage: string | null;
    streak_days: number | null;
    missions_completed: number | null;
    last_report_at?: string | null;
    is_tester?: boolean | null;
    cohort?: string | null;
  }): CollectorTrust => ({
    nickname: row.nickname,
    ipHash: row.ip_hash,
    score: row.score,
    totalReports: row.total_reports,
    approvedReports: row.approved_reports,
    rejectedReports: row.rejected_reports,
    trustStage: normalizeTrustStage(row.trust_stage),
    streakDays: row.streak_days || 0,
    missionsCompleted: row.missions_completed || 0,
    lastReportAt: row.last_report_at ?? null,
    isTester: Boolean(row.is_tester),
    cohort: row.cohort || "NEWBIE"
  });

  if (nickname) {
    const { data } = await supabase.from("collector_trust").select(columns).eq("nickname", nickname).maybeSingle();
    if (data) return mapCollectorTrustRow(data);
  }

  if (ipHash) {
    const { data } = await supabase.from("collector_trust").select(columns).eq("ip_hash", ipHash).maybeSingle();
    if (data) return mapCollectorTrustRow(data);
  }

  return null;
}

export async function getUtilityStatusAction(
  nickname: string | null,
  ipHash: string | null,
  context?: { hasMission?: boolean; hasPending?: boolean }
): Promise<{
  trust: CollectorTrust;
  status: UtilityStatus;
} | null> {
  try {
    const trust = await getOrCreateCollectorTrust(nickname, ipHash);
    const status = getUtilityStatus(trust, context);

    return { trust, status };
  } catch (error) {
    logRuntimeIssue("Failed to fetch utility status", error, { scope: "public", surface: "actions/user.getUtilityStatusAction", fallback: "return-null", optional: true });
    return null;
  }
}

export async function getProgressiveIdentityAction(
  nickname?: string | null,
  context?: { hasMission?: boolean; hasPending?: boolean }
): Promise<ProgressiveIdentityRemoteSnapshot> {
  try {
    const currentHeaders = await headers();
    const ip = getSubmissionClientIp(currentHeaders as Headers);
    const ipHash = hashSubmissionIp(ip);
    const trust = await findCollectorTrustReadOnly(nickname || null, ipHash);

    if (!trust) {
      return { trust: null, status: null };
    }

    return {
      trust,
      status: getUtilityStatus(trust, context)
    };
  } catch (error) {
    logRuntimeIssue("Failed to fetch progressive identity", error, { scope: "public", surface: "actions/user.getProgressiveIdentityAction", fallback: "return-null", optional: true });
    return { trust: null, status: null };
  }
}


