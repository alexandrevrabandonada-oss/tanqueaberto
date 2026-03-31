import { loadEnvConfig } from "@next/env";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { createSupabaseServiceClient } from "../lib/supabase/service";
import { REPORT_PHOTO_BUCKET } from "../lib/upload/report-photo";

type Severity = "critical" | "high" | "medium" | "low";

interface GateIssue {
  severity: Severity;
  area: string;
  message: string;
  evidence?: string;
}

interface GateResult {
  baseUrl: string;
  verdict: "GO" | "NO-GO";
  envs: { ok: boolean; missing: string[] };
  http: { ok: boolean; rootOk: boolean; healthOk: boolean; rootStatus?: number; healthStatus?: number };
  storage: { ok: boolean; bucketExists: boolean };
  data: { ok: boolean; activeStations: number };
  assets: { ok: boolean; manifestOk: boolean; swOk: boolean; iconsOk: boolean };
  smoke: { ok: boolean; exitCode: number | null };
  issues: GateIssue[];
}

const ROOT = resolve(process.cwd());
loadEnvConfig(ROOT);
const REPORT_PATH = join(ROOT, "reports", "estado-da-nacao-go-live-publico-final.md");

function normalizeBaseUrl(raw?: string | null) {
  const value = (raw ?? "").trim();
  if (!value) {
    return "http://localhost:3000";
  }

  if (/^https?:\/\//i.test(value)) {
    return value.replace(/\/+$/, "");
  }

  return `https://${value.replace(/\/+$/, "")}`;
}

function resolveBaseUrl() {
  return normalizeBaseUrl(
    process.env.GO_LIVE_URL ??
      process.env.PLAYWRIGHT_TEST_URL ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.VERCEL_URL ??
      null
  );
}

function addIssue(issues: GateIssue[], severity: Severity, area: string, message: string, evidence?: string) {
  issues.push({ severity, area, message, evidence });
}

function formatIssue(issue: GateIssue) {
  const prefix = `[${issue.severity.toUpperCase()}] ${issue.area}`;
  return `- ${prefix}: ${issue.message}${issue.evidence ? ` (${issue.evidence})` : ""}`;
}

async function fetchWithTimeout(url: string, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

async function runSmoke(baseUrl: string, issues: GateIssue[]) {
  const routes = [
    { route: "/", label: "home", needle: /Mapa vivo|Carregando mapa vivo/i, extra: ["href=\"/enviar\"", "Enviar preço"] },
    { route: "/atualizacoes", label: "updates", needle: /Atualizações/i },
    { route: "/postos/sem-atualizacao", label: "station-flow", needle: /Enviar preço/i },
    { route: "/enviar", label: "submit", needle: /Enviar preço/i, extra: [/Foto primeiro/i, /Posto/i] },
    { route: "/hub", label: "hub", needle: /Meu Hub|Centro de continuidade real|Continuar de onde parou|Proximo melhor gesto|Abrir o eixo principal/i }
  ] as const satisfies ReadonlyArray<{ route: string; label: string; needle: RegExp; extra?: readonly (RegExp | string)[] }>;

  const failures: string[] = [];

  for (const item of routes) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}${item.route}`, 20000);
      if (!response.ok) {
        failures.push(`${item.label}: HTTP ${response.status}`);
        continue;
      }

      const html = await response.text();
      if (!item.needle.test(html)) {
        failures.push(`${item.label}: marcador principal ausente`);
        continue;
      }

      const extras = "extra" in item ? item.extra : [];
      for (const extra of extras) {
        const matched = typeof extra === "string" ? html.includes(extra) : extra.test(html);
        if (!matched) {
          failures.push(`${item.label}: marcador auxiliar ausente (${typeof extra === "string" ? extra : extra.source})`);
          break;
        }
      }
    } catch (error: any) {
      failures.push(`${item.label}: ${error?.message ?? String(error)}`);
    }
  }

  if (failures.length > 0) {
    addIssue(issues, "critical", "smoke", "Smoke dos fluxos vitais falhou", failures.join("; "));
  }

  return { ok: failures.length === 0, exitCode: failures.length === 0 ? 0 : 1 };
}

function renderReport(result: GateResult) {
  const issuesBySeverity = (severity: Severity) => result.issues.filter((issue) => issue.severity === severity);
  const checklist = [
    ["Envs críticas", result.envs.ok ? "PASS" : "FAIL", result.envs.missing.length ? result.envs.missing.join(", ") : "ok"],
    ["Base URL / HTTP", result.http.ok ? "PASS" : "FAIL", `root=${result.http.rootStatus ?? "-"} health=${result.http.healthStatus ?? "-"}`],
    ["Storage", result.storage.ok ? "PASS" : "FAIL", result.storage.bucketExists ? REPORT_PHOTO_BUCKET : "bucket ausente"],
    ["Dados mínimos", result.data.ok ? "PASS" : "WARN", `${result.data.activeStations} postos ativos`],
    ["Assets públicos", result.assets.ok ? "PASS" : "FAIL", `manifest=${result.assets.manifestOk} sw=${result.assets.swOk} icons=${result.assets.iconsOk}`],
    ["Smoke vital", result.smoke.ok ? "PASS" : "FAIL", `exit=${result.smoke.exitCode ?? "-"}`]
  ];

  const checklistRows = checklist
    .map(([label, status, evidence]) => `| ${label} | ${status} | ${evidence} |`)
    .join("\n");

  const critical = issuesBySeverity("critical");
  const high = issuesBySeverity("high");
  const medium = issuesBySeverity("medium");
  const low = issuesBySeverity("low");

  const sections = [
    "# Estado da Nação: go-live publico final",
    "",
    "## Resumo executivo",
    "",
    `Verdicto: **${result.verdict}**`,
    "",
    `Base testada: ${result.baseUrl}`,
    "",
    "O launch gate operacional foi unificado em um comando unico e agora valida:",
    "- envs criticas",
    "- saúde HTTP e healthcheck",
    "- storage do bucket de foto",
    "- base URL e assets publicos",
    "- presença minima de postos ativos",
    "- smoke dos fluxos vitais",
    "",
    "## Checklist operacional curto",
    "",
    "| Checagem | Status | Evidencia |",
    "|---|---|---|",
    checklistRows,
    "",
    "## Pendencias por severidade",
    "",
    "### Critical",
    critical.length ? critical.map(formatIssue).join("\n") : "- Nenhuma",
    "",
    "### High",
    high.length ? high.map(formatIssue).join("\n") : "- Nenhuma",
    "",
    "### Medium",
    medium.length ? medium.map(formatIssue).join("\n") : "- Nenhuma",
    "",
    "### Low",
    low.length ? low.map(formatIssue).join("\n") : "- Nenhuma",
    "",
    "## Smoke vital coberto",
    "",
    "- home abre com mapa e valor da primeira dobra",
    "- busca e leitura publicas carregam sem login",
    "- posto abre e oferece o proximo passo",
    "- `/enviar` carrega o fluxo de rua sem barrar a entrada",
    "- `/hub` retorna continuidade local sem exigir conta",
    "",
    "## Observacoes",
    "",
    "- O healthcheck publicamente exposto valida o bucket correto de foto.",
    "- O gate final nao recria fluxo novo; ele apenas unifica os checks reais de producao."
  ];

  return sections.join("\n");
}

async function main() {
  const baseUrl = resolveBaseUrl();
  const issues: GateIssue[] = [];

  console.log("====================================================");
  console.log("BOMBA ABERTA: GO-LIVE PUBLICO FINAL");
  console.log("====================================================");
  console.log(`Base URL: ${baseUrl}`);

  const requiredEnvs = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const missingEnvs = requiredEnvs.filter((name) => !process.env[name]?.trim());
  const envsOk = missingEnvs.length === 0;
  if (!envsOk) {
    addIssue(issues, "critical", "envs", "Variaveis criticas ausentes", missingEnvs.join(", "));
  }
  console.log(`Envs criticas: ${envsOk ? "OK" : `FALHOU (${missingEnvs.join(", ")})`}`);

  let rootResponse: Response | null = null;
  let healthResponse: Response | null = null;
  let healthJson: any = null;

  try {
    rootResponse = await fetchWithTimeout(baseUrl);
    healthResponse = await fetchWithTimeout(`${baseUrl}/api/health`);
    const healthPayload = await healthResponse.text();
    try {
      healthJson = JSON.parse(healthPayload);
    } catch {
      healthJson = { raw: healthPayload };
    }

  } catch (error: any) {
    addIssue(issues, "critical", "http", "Falha ao consultar a base URL ou o healthcheck", error?.message ?? String(error));
  }

  if (rootResponse && !rootResponse.ok) {
    addIssue(issues, "critical", "http", "Base URL nao respondeu com sucesso", `HTTP ${rootResponse.status}`);
  }
  if (healthResponse && !healthResponse.ok) {
    addIssue(issues, "critical", "http", "/api/health nao respondeu com sucesso", `HTTP ${healthResponse.status}`);
  }
  if (healthJson && healthJson.status !== "ok") {
    addIssue(issues, "critical", "http", "Healthcheck reportou falha", JSON.stringify(healthJson.components ?? healthJson));
  }

  let storageOk = false;
  let activeStations = 0;
  try {
    const supabase = createSupabaseServiceClient();
    const [{ count, error: stationError }, { data: bucketData, error: bucketError }] = await Promise.all([
      supabase.from("stations").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.storage.getBucket(REPORT_PHOTO_BUCKET)
    ]);

    if (stationError) {
      addIssue(issues, "critical", "supabase", "Falha ao contar postos ativos", stationError.message);
    } else {
      activeStations = count ?? 0;
      if (activeStations === 0) {
        addIssue(issues, "critical", "dados", "Nao ha postos ativos suficientes para lancamento", "count=0");
      } else if (activeStations < 5) {
        addIssue(issues, "medium", "dados", "Base de postos ativos ainda pequena para lancamento amplo", `count=${activeStations}`);
      }
    }

    if (bucketError || !bucketData) {
      addIssue(issues, "critical", "storage", "Bucket de foto nao esta acessivel", bucketError?.message ?? "bucket ausente");
    } else {
      storageOk = true;
    }
  } catch (error: any) {
    addIssue(issues, "critical", "supabase", "Nao foi possivel inicializar o cliente de servico", error?.message ?? String(error));
  }

  const assetsToCheck = [
    "/manifest.webmanifest",
    "/sw.js",
    "/favicon.svg",
    "/icon-192.png",
    "/icon-512.png"
  ];

  const assetResponses = await Promise.all(
    assetsToCheck.map(async (asset) => {
      try {
        const response = await fetchWithTimeout(`${baseUrl}${asset}`);
        return { asset, ok: response.ok, status: response.status, response };
      } catch (error: any) {
        return { asset, ok: false, status: 0, error: error?.message ?? String(error) };
      }
    })
  );

  const manifestResult = assetResponses.find((item) => item.asset === "/manifest.webmanifest");
  const swResult = assetResponses.find((item) => item.asset === "/sw.js");
  const iconResults = assetResponses.filter((item) => item.asset !== "/manifest.webmanifest" && item.asset !== "/sw.js");

  let manifestOk = Boolean(manifestResult?.ok);
  let swOk = Boolean(swResult?.ok);
  let iconsOk = iconResults.every((item) => item.ok);

  if (!manifestOk) {
    addIssue(issues, "critical", "assets", "Manifest nao esta acessivel", manifestResult?.status ? `HTTP ${manifestResult.status}` : (manifestResult as any)?.error);
  }
  if (!swOk) {
    addIssue(issues, "critical", "assets", "Service worker nao esta acessivel", swResult?.status ? `HTTP ${swResult.status}` : (swResult as any)?.error);
  }
  if (!iconsOk) {
    const brokenIcons = iconResults.filter((item) => !item.ok).map((item) => item.asset).join(", ");
    addIssue(issues, "critical", "assets", "Icones publicos nao estao acessiveis", brokenIcons);
  }

  if (manifestResult?.ok) {
    try {
      const manifest = await (manifestResult.response as Response).json();
      if (!manifest?.start_url || manifest.start_url !== "/") {
        addIssue(issues, "medium", "assets", "Manifest start_url nao esta apontando para /", String(manifest?.start_url ?? "ausente"));
      }
      if (!Array.isArray(manifest?.icons) || manifest.icons.length < 3) {
        addIssue(issues, "medium", "assets", "Manifest com poucos icones", `icons=${manifest?.icons?.length ?? 0}`);
      }
    } catch (error: any) {
      addIssue(issues, "critical", "assets", "Falha ao ler manifest.json", error?.message ?? String(error));
      manifestOk = false;
    }
  }

  console.log(`HTTP /: ${rootResponse?.ok ? "OK" : "FAIL"}`);
  console.log(`HTTP /api/health: ${healthResponse?.ok ? "OK" : "FAIL"}`);
  console.log(`Storage ${REPORT_PHOTO_BUCKET}: ${storageOk ? "OK" : "FAIL"}`);
  console.log(`Postos ativos: ${activeStations}`);
  console.log(`Assets publicos: ${manifestOk && swOk && iconsOk ? "OK" : "FAIL"}`);

  const smoke = await runSmoke(baseUrl, issues);
  if (!smoke.ok) {
    addIssue(issues, "critical", "smoke", "Smoke dos fluxos vitais falhou", `exit=${smoke.exitCode ?? "null"}`);
  }
  console.log(`Smoke vital: ${smoke.ok ? "OK" : "FAIL"}`);

  const httpCheckOk = Boolean(rootResponse?.ok && healthResponse?.ok && healthJson?.status === "ok");
  const assetsOk = manifestOk && swOk && iconsOk;
  const dataOk = activeStations > 0;
  const verdict: GateResult["verdict"] = issues.some((issue) => issue.severity === "critical" || issue.severity === "high") ? "NO-GO" : "GO";

  const result: GateResult = {
    baseUrl,
    verdict,
    envs: { ok: envsOk, missing: missingEnvs },
    http: { ok: httpCheckOk, rootOk: Boolean(rootResponse?.ok), healthOk: Boolean(healthResponse?.ok), rootStatus: rootResponse?.status, healthStatus: healthResponse?.status },
    storage: { ok: storageOk, bucketExists: storageOk },
    data: { ok: dataOk, activeStations },
    assets: { ok: assetsOk, manifestOk, swOk, iconsOk },
    smoke,
    issues
  };

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, renderReport(result), "utf8");

  console.log("\n====================================================");
  console.log(`VERDICTO: ${verdict}`);
  console.log("====================================================");
  console.log(`Relatorio: ${REPORT_PATH}`);
  if (issues.length > 0) {
    console.log("\nPendencias:");
    issues.forEach((issue) => console.log(formatIssue(issue)));
  } else {
    console.log("\nNenhuma pendencia critica identificada.");
  }

  process.exit(verdict === "GO" ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});


















