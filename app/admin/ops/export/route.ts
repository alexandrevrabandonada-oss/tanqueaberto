import { NextResponse } from "next/server";

import { getCurrentAdminUser } from "@/lib/auth/admin";
import { getBetaFeedbackSummary } from "@/lib/beta/feedback";
import { getBetaInviteCodes } from "@/lib/beta/invites";
import { getBetaOpsInsights } from "@/lib/ops/insights";
import { getCityReadinessRows } from "@/lib/ops/readiness";
import { getOperationalTelemetry } from "@/lib/ops/observability";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (/[\",\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }

  return lines.join("\n");
}

export async function GET(request: Request) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "not_authorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") ?? "feedback";
  const days = Number(url.searchParams.get("days") ?? "14");

  if (kind === "events") {
    const dashboard = await getOperationalTelemetry(Number.isFinite(days) ? days : 7);
    const rows = dashboard.recentEvents.map((event) => ({
      created_at: event.createdAt,
      event_type: event.eventType,
      severity: event.severity,
      scope_type: event.scopeType ?? "",
      scope_id: event.scopeId ?? "",
      station_id: event.stationId ?? "",
      city: event.city ?? "",
      fuel_type: event.fuelType ?? "",
      reason: event.reason ?? "",
      page_path: String((event.payload.pagePath as string | undefined) ?? ""),
      source: String((event.payload.source as string | undefined) ?? "")
    }));

    return new NextResponse(toCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="bomba-aberta-events.csv"'
      }
    });
  }

  if (kind === "funnel") {
    const dashboard = await getOperationalTelemetry(Number.isFinite(days) ? days : 7);
    const rows = [
      { metric: "home_opened", value: dashboard.funnel.homeOpened },
      { metric: "home_search_used", value: dashboard.funnel.searchUsed },
      { metric: "station_clicked", value: dashboard.funnel.stationClicked },
      { metric: "submit_opened", value: dashboard.funnel.submitOpened },
      { metric: "submission_started", value: dashboard.funnel.submissionStarted },
      { metric: "submission_accepted", value: dashboard.funnel.submissionAccepted },
      { metric: "submission_failed", value: dashboard.funnel.submissionFailed },
      { metric: "audit_opened", value: dashboard.funnel.auditOpened },
      { metric: "feedback_opened", value: dashboard.funnel.feedbackOpened },
      { metric: "beta_feedback_received", value: dashboard.funnel.feedbackReceived }
    ];

    return new NextResponse(toCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="bomba-aberta-funnel.csv"'
      }
    });
  }

  if (kind === "ops") {
    const insights = await getBetaOpsInsights();
    const rows = [
      { section: "daily", metric: "testers_active_today", value: insights.daily.testersActiveToday },
      { section: "daily", metric: "submissions_started_today", value: insights.daily.submissionsStartedToday },
      { section: "daily", metric: "submissions_completed_today", value: insights.daily.submissionsCompletedToday },
      { section: "daily", metric: "feedback_received_today", value: insights.daily.feedbackReceivedToday },
      { section: "daily", metric: "top_dropoff_step", value: insights.daily.topDropoffStep ?? "" },
      { section: "daily", metric: "top_dropoff_lost", value: insights.daily.topDropoffLost },
      { section: "daily", metric: "top_confusing_screen", value: insights.daily.topConfusingScreen ?? "" },
      { section: "daily", metric: "top_confusing_screen_count", value: insights.daily.topConfusingScreenCount },
      ...insights.alerts.map((alert) => ({ section: "alert", metric: alert.kind, value: alert.description }))
    ];

    return new NextResponse(toCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="bomba-aberta-ops-summary.csv"'
      }
    });
  }

    if (kind === "invites") {
    const invites = await getBetaInviteCodes(Number.isFinite(days) ? days : 25);
    const rows = invites.map((item) => ({
      code: item.code,
      batch_label: item.batchLabel,
      batch_note: item.batchNote ?? "",
      tester_note: item.testerNote ?? "",
      is_active: item.isActive,
      use_count: item.useCount,
      max_uses: item.maxUses,
      expires_at: item.expiresAt ?? "",
      last_used_at: item.lastUsedAt ?? "",
      created_at: item.createdAt
    }));

    return new NextResponse(toCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="bomba-aberta-beta-invites.csv"'
      }
    });
  }

  if (kind === "readiness") {
    const rows = await getCityReadinessRows(Number.isFinite(days) ? days : 30);
    const csvRows = rows.map((row) => ({
      city: row.city,
      city_slug: row.citySlug,
      score: row.score,
      traffic_light: row.trafficLight,
      recommendation: row.recommendation,
      visible_stations: row.visibleStations,
      stations_with_recent_price: row.stationsWithRecentPrice,
      approved_reports_recent: row.approvedReportsRecent,
      negative_feedback: row.negativeFeedback,
      upload_errors: row.uploadErrors,
      weak_coverage_rows: row.weakCoverageRows,
      low_coverage_rows: row.lowCoverageRows,
      gap_density: row.gapDensity,
      gaps: row.gaps.join(" | ")
    }));

    return new NextResponse(toCsv(csvRows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="bomba-aberta-readiness.csv"'
      }
    });
  }

  const feedback = await getBetaFeedbackSummary(Number.isFinite(days) ? days : 14);
  const rows = feedback.recent.map((item) => ({
    created_at: item.createdAt,
    feedback_type: item.feedbackType,
    triage_status: item.triageStatus,
    triage_topic: item.triageTopic,
    triage_priority: item.triagePriority,
    screen_group: item.screenGroup,
    tags: item.triageTags.join(" | "),
    page_path: item.pagePath,
    page_title: item.pageTitle ?? "",
    city: item.city ?? "",
    fuel_type: item.fuelType ?? "",
    station_id: item.stationId ?? "",
    tester_nickname: item.testerNickname ?? "",
    message: item.message
  }));

  return new NextResponse(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="bomba-aberta-feedback.csv"'
    }
  });
}
