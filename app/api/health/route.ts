import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    status: "ok",
    components: {}
  };

  try {
    const supabase = createSupabaseServiceClient();
    const { error: dbError } = await supabase
      .from("stations")
      .select("id")
      .limit(1);

    checks.components.database = {
      status: dbError ? "error" : "ok",
      latency: Date.now() - startTime,
      message: dbError?.message || "Connected"
    };

    if (dbError) checks.status = "error";

    const { data: storageData, error: storageError } = await supabase
      .storage
      .getBucket("price-report-photos");

    checks.components.storage = {
      status: storageError ? "error" : "ok",
      message: storageError?.message || "Bucket accessible",
      bucket: storageData?.name ?? "price-report-photos"
    };

    if (storageError) checks.status = "error";

    const requiredEnvs = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY"
    ];

    const missingEnvs = requiredEnvs.filter(env => !process.env[env]);

    checks.components.environment = {
      status: missingEnvs.length > 0 ? "error" : "ok",
      missing: missingEnvs.length > 0 ? missingEnvs : undefined
    };

    if (missingEnvs.length > 0) checks.status = "error";

    const responseStatus = checks.status === "ok" ? 200 : 500;

    return NextResponse.json(checks, { status: responseStatus });

  } catch (error: any) {
    return NextResponse.json({
      status: "critical",
      message: error.message || "Internal healthcheck failure",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

