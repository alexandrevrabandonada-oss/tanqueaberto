const { Client } = require("pg");

import { generateRecurringAuditDossiers } from "@/lib/audit/scheduler";
import type { AuditReportRunItem } from "@/lib/audit/types";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { recordOperationalEvent } from "@/lib/ops/logs";
import type { OpsCadence, OpsJobRun, OpsJobStatus, OpsJobType } from "./types";

function getConnectionString() {
  return process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? null;
}

function toJobRun(row: Record<string, unknown>): OpsJobRun {
  return {
    id: String(row.id),
    jobType: row.job_type as OpsJobType,
    cadence: row.cadence as OpsCadence,
    status: row.status as OpsJobStatus,
    startedAt: String(row.started_at),
    finishedAt: row.finished_at ? String(row.finished_at) : null,
    triggeredBy: row.triggered_by ? String(row.triggered_by) : null,
    payload: (row.payload as Record<string, unknown>) ?? {},
    metrics: (row.metrics as Record<string, unknown>) ?? {},
    errorMessage: row.error_message ? String(row.error_message) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

async function insertJobRun(jobType: OpsJobType, cadence: OpsCadence, triggeredBy?: string | null, payload: Record<string, unknown> = {}) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("ops_job_runs")
    .insert({
      job_type: jobType,
      cadence,
      status: "running",
      triggered_by: triggeredBy ?? null,
      payload,
      metrics: {}
    })
    .select("id,job_type,cadence,status,started_at,finished_at,triggered_by,payload,metrics,error_message,created_at,updated_at")
    .single();

  if (error || !data) {
    throw new Error(`Falha ao registrar execução de ${jobType}`);
  }

  await recordOperationalEvent({
    eventType: "job_started",
    severity: "info",
    scopeType: "job",
    scopeId: String(data.id),
    actorEmail: triggeredBy ?? null,
    reason: jobType,
    payload: { jobType, cadence, triggeredBy, payload }
  });

  return toJobRun(data as Record<string, unknown>);
}

async function finishJobRun(jobRunId: string, status: Exclude<OpsJobStatus, "running">, metrics: Record<string, unknown>, errorMessage?: string | null) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("ops_job_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      metrics,
      error_message: errorMessage ?? null,
      updated_at: new Date().toISOString()
    })
    .eq("id", jobRunId)
    .select("id,job_type,cadence,status,started_at,finished_at,triggered_by,payload,metrics,error_message,created_at,updated_at")
    .single();

  if (error || !data) {
    throw new Error(`Falha ao finalizar execução ${jobRunId}`);
  }

  await recordOperationalEvent({
    eventType: status === "success" ? "job_finished" : "job_failed",
    severity: status === "success" ? "info" : "error",
    scopeType: "job",
    scopeId: jobRunId,
    reason: errorMessage ?? status,
    payload: { metrics, status }
  });

  return toJobRun(data as Record<string, unknown>);
}

export async function getRecentOpsJobRuns(limit = 12): Promise<OpsJobRun[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("ops_job_runs")
    .select("id,job_type,cadence,status,started_at,finished_at,triggered_by,payload,metrics,error_message,created_at,updated_at")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Failed to load operational job runs", error);
    return [];
  }

  return data.map((row: any) => toJobRun(row as Record<string, unknown>));
}

export async function getLastOpsJobRun(jobType: OpsJobType): Promise<OpsJobRun | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("ops_job_runs")
    .select("id,job_type,cadence,status,started_at,finished_at,triggered_by,payload,metrics,error_message,created_at,updated_at")
    .eq("job_type", jobType)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error(`Failed to load last run for ${jobType}`, error);
    }
    return null;
  }

  return toJobRun(data as Record<string, unknown>);
}

export async function runAuditRefreshJob(input?: { cadence?: OpsCadence; triggeredBy?: string | null }) {
  const jobRun = await insertJobRun("audit_refresh", input?.cadence ?? "manual", input?.triggeredBy ?? null, { source: "ops-panel" });
  const connectionString = getConnectionString();

  if (!connectionString) {
    const failure = await finishJobRun(jobRun.id, "failed", {}, "Defina DATABASE_URL ou SUPABASE_DB_URL para atualizar as views analíticas.");
    return { jobRun: failure, success: false, message: failure.errorMessage };
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query("refresh materialized view public.audit_daily_station_prices;");
    await client.query("refresh materialized view public.audit_daily_city_prices;");
    await client.query("refresh materialized view public.audit_latest_station_prices;");
    const success = await finishJobRun(jobRun.id, "success", {
      refreshedViews: ["audit_daily_station_prices", "audit_daily_city_prices", "audit_latest_station_prices"]
    });
    return { jobRun: success, success: true, message: "Views atualizadas." };
  } catch (error) {
    const failure = await finishJobRun(jobRun.id, "failed", {}, error instanceof Error ? error.message : "Falha ao atualizar views analíticas.");
    return { jobRun: failure, success: false, message: failure.errorMessage };
  } finally {
    await client.end();
  }
}

export async function runAuditDossiersJob(input?: { cadence?: OpsCadence; triggeredBy?: string | null }) {
  const jobRun = await insertJobRun("audit_dossiers", input?.cadence ?? "manual", input?.triggeredBy ?? null, { source: "ops-panel" });

  try {
    const generatedRuns = await generateRecurringAuditDossiers();
    const success = await finishJobRun(jobRun.id, "success", {
      generatedRuns: generatedRuns.length,
      generatedScopes: generatedRuns.map((run: AuditReportRunItem) => ({
        scopeType: run.scopeType,
        scopeLabel: run.scopeLabel,
        fuelType: run.fuelType,
        days: run.days
      }))
    });
    return { jobRun: success, generatedRuns, success: true, message: `${generatedRuns.length} dossiês gerados.` };
  } catch (error) {
    const failure = await finishJobRun(jobRun.id, "failed", {}, error instanceof Error ? error.message : "Falha ao gerar dossiês recorrentes.");
    return { jobRun: failure, generatedRuns: [] as AuditReportRunItem[], success: false, message: failure.errorMessage };
  }
}
