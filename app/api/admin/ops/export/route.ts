import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/admin";
import { getGroupReadinessRows } from "@/lib/ops/readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminUser();
    const groups = await getGroupReadinessRows(30);

    const headers = [
      "Group ID",
      "Group Name",
      "City",
      "Type",
      "Score",
      "Traffic Light",
      "Recommendation",
      "Visible Stations",
      "Recent Price Coverage",
      "Recent Approved Reports",
      "Negative Feedback",
      "Upload Errors",
      "Gap Density"
    ];

    const rows = groups.map(g => [
      g.groupId,
      g.groupName,
      g.city || "N/A",
      g.groupType,
      g.score,
      g.trafficLight,
      g.recommendation,
      g.visibleStations,
      g.stationsWithRecentPrice,
      g.approvedReportsRecent,
      g.negativeFeedback,
      g.uploadErrors,
      g.gapDensity.toFixed(2)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bomba-aberta-ops-digest-${new Date().toISOString().split("T")[0]}.csv"`
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
