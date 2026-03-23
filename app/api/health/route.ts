import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    status: "ok",
    components: {}
  };

  try {
    // 1. Database Check
    const supabase = await createSupabaseServerClient();
    const { data: dbData, error: dbError } = await supabase
      .from("stations")
      .select("id")
      .limit(1);

    checks.components.database = {
      status: dbError ? "error" : "ok",
      latency: Date.now() - startTime,
      message: dbError?.message || "Connected"
    };

    if (dbError) checks.status = "error";

    // 2. Storage Check
    const { data: storageData, error: storageError } = await supabase
      .storage
      .getBucket("reports");

    checks.components.storage = {
      status: storageError ? "error" : "ok",
      message: storageError?.message || "Bucket accessible"
    };

    if (storageError) checks.status = "error";

    // 3. Environment Variables Check
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
