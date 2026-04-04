import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const SOURCE_DIRS = ["app", "components", "hooks", "lib", "scripts"];
const ROOT_SOURCE_FILES = ["middleware.ts", "next.config.ts"];
const IGNORE_SEGMENTS = ["node_modules", ".git", ".next", "reports", "test-results"];

const REQUIRED_RUNTIME_ENVS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
] as const;

const RECOMMENDED_RUNTIME_ENVS = [
  "STATION_EDITOR_SESSION_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_URL"
] as const;

const PLATFORM_ENVS = new Set([
  "NODE_ENV",
  "VERCEL_URL",
  "VERCEL_BRANCH_URL"
]);

interface StepResult {
  label: string;
  ok: boolean;
  durationMs: number;
}

function walk(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relative = path.relative(ROOT, fullPath);
    if (IGNORE_SEGMENTS.some((segment) => relative.split(path.sep).includes(segment))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (/\.(ts|tsx|js|cjs|mjs)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function collectSourceFiles() {
  const files = new Set<string>();

  for (const dir of SOURCE_DIRS) {
    const full = path.join(ROOT, dir);
    if (existsSync(full)) {
      for (const file of walk(full)) {
        files.add(file);
      }
    }
  }

  for (const relative of ROOT_SOURCE_FILES) {
    const full = path.join(ROOT, relative);
    if (existsSync(full)) {
      files.add(full);
    }
  }

  return Array.from(files);
}

function parseEnvFile(filePath: string) {
  const values = new Map<string, string>();
  if (!existsSync(filePath)) {
    return values;
  }

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    values.set(key, value);
  }

  return values;
}

function collectEnvReferences(files: string[]) {
  const references = new Set<string>();
  const pattern = /process\.env\.([A-Z0-9_]+)/g;

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(pattern)) {
      if (match[1]) {
        references.add(match[1]);
      }
    }
  }

  return Array.from(references).sort((left, right) => left.localeCompare(right));
}

function auditEnvironment() {
  const files = collectSourceFiles();
  const referenced = collectEnvReferences(files);
  const example = parseEnvFile(path.join(ROOT, ".env.example"));
  const local = parseEnvFile(path.join(ROOT, ".env.local"));
  const runtime = new Map<string, string>();

  for (const [key, value] of local.entries()) {
    runtime.set(key, value);
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      runtime.set(key, value);
    }
  }

  const missingRequired = REQUIRED_RUNTIME_ENVS.filter((name) => !runtime.get(name)?.trim());
  const missingRecommended = RECOMMENDED_RUNTIME_ENVS.filter((name) => !runtime.get(name)?.trim());
  const undocumented = referenced.filter((name) => !example.has(name) && !PLATFORM_ENVS.has(name));

  console.log("\n== Environment audit ==");
  console.log(`Referenced env vars: ${referenced.length}`);
  console.log(`Documented in .env.example: ${example.size}`);
  console.log(`Defined in local/runtime context: ${runtime.size}`);

  if (missingRequired.length > 0) {
    console.log(`Missing required runtime envs: ${missingRequired.join(", ")}`);
  } else {
    console.log("Required runtime envs: ok");
  }

  if (missingRecommended.length > 0) {
    console.log(`Missing recommended runtime envs: ${missingRecommended.join(", ")}`);
  } else {
    console.log("Recommended runtime envs: ok");
  }

  if (undocumented.length > 0) {
    console.log(`Referenced envs absent from .env.example: ${undocumented.join(", ")}`);
  } else {
    console.log(".env.example coverage: ok");
  }

  return {
    ok: missingRequired.length === 0,
    missingRequired,
    missingRecommended,
    undocumented
  };
}

function runStep(label: string, command: string, args: string[]): StepResult {
  console.log(`\n== ${label} ==`);
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
    env: process.env
  });

  return {
    label,
    ok: result.status === 0,
    durationMs: Date.now() - startedAt
  };
}

function formatDuration(durationMs: number) {
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function main() {
  const envAudit = auditEnvironment();
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const steps: StepResult[] = [
    runStep("Schema drift", npmCmd, ["run", "check:drift"]),
    runStep("Lint", npmCmd, ["run", "lint"]),
    runStep("Typecheck", npmCmd, ["run", "typecheck"]),
    runStep("Build", npmCmd, ["run", "build"])
  ];

  console.log("\n== Audit summary ==");
  console.log(`Environment required status: ${envAudit.ok ? "ok" : "failed"}`);
  for (const step of steps) {
    console.log(`- ${step.label}: ${step.ok ? "ok" : "failed"} (${formatDuration(step.durationMs)})`);
  }

  if (envAudit.missingRecommended.length > 0) {
    console.log(`Recommended follow-up: definir ${envAudit.missingRecommended.join(", ")}`);
  }

  if (envAudit.undocumented.length > 0) {
    console.log(`Documentation follow-up: atualizar .env.example para ${envAudit.undocumented.join(", ")}`);
  }

  const hasFailedStep = steps.some((step) => !step.ok);
  if (!envAudit.ok || hasFailedStep) {
    process.exit(1);
  }
}

main();
