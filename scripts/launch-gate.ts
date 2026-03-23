import { spawnSync } from "child_process";
import { createSupabaseServerClient } from "../lib/supabase/server";

async function runCmd(command: string, args: string[]) {
  console.log(`\n> Running: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: true });
  return result.status === 0;
}

async function main() {
  console.log("====================================================");
  console.log("🚀 BOMBA ABERTA: LAUNCH GATE (PRÉ-RUA)");
  console.log("====================================================");

  const results = {
    envs: false,
    build: false,
    health: false,
    smoke: false,
    data: false
  };

  // 1. Envs Check
  console.log("\n[1/5] Verificando variáveis de ambiente...");
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = required.filter(e => !process.env[e]);
  if (missing.length === 0) {
    console.log("✅ Envs OK");
    results.envs = true;
  } else {
    console.log(`❌ Faltando: ${missing.join(", ")}`);
  }

  // 2. Build Check (Lint & Types)
  console.log("\n[2/5] Rodando Lint & Typecheck...");
  results.build = await runCmd("npm", ["run", "typecheck"]);
  if (results.build) console.log("✅ Build/Types OK");

  // 3. Healthcheck API
  console.log("\n[3/5] Verificando Healthcheck API...");
  try {
    // Nota: Em CI/local o servidor precisa estar rodando. 
    // Se não estiver, tentamos validar via lib interna.
    const supabase = await createSupabaseServerClient();
    const { count, error } = await supabase.from("stations").select("*", { count: "estimated", head: true });
    if (!error && count !== null) {
      console.log(`✅ Supabase OK (${count} postos encontrados)`);
      results.health = true;
    } else {
      console.log(`❌ Supabase Falhou: ${error?.message}`);
    }
  } catch (e: any) {
    console.log(`❌ Erro no healthcheck: ${e.message}`);
  }

  // 4. Data Readiness
  console.log("\n[4/5] Auditoria de Prontidão de Dados...");
  if (results.health) {
    const supabase = await createSupabaseServerClient();
    const { data: groups } = await supabase.from("readiness_territorial").select("*").eq("status", "ready");
    if (groups && groups.length > 0) {
      console.log(`✅ Prontidão OK: ${groups.length} grupos em 'ready'`);
      results.data = true;
    } else {
      console.log("⚠️ Alerta: Nenhum grupo territorial marcado como 'ready'");
    }
  }

  // 5. Smoke Tests
  console.log("\n[5/5] Rodando Smoke Tests (Fluxo Vital)...");
  // Executa o smoke test em headless mode
  results.smoke = await runCmd("npx", ["playwright", "test", "tests/smoke.spec.ts"]);

  console.log("\n====================================================");
  console.log("📊 RESUMO FINAL DO LAUNCH GATE");
  console.log("====================================================");
  console.log(`Variables: ${results.envs ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Build/Types: ${results.build ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Health/DB: ${results.health ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Data Ready: ${results.data ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Smoke Tests: ${results.smoke ? "✅ PASS" : "❌ FAIL"}`);
  console.log("====================================================");

  const isGo = Object.values(results).every(v => v === true);
  if (isGo) {
    console.log("\n🟢 VERDITO: GO (Pode testar na rua)");
    process.exit(0);
  } else {
    console.log("\n🔴 VERDITO: NO-GO (Corrigir falhas acima)");
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
