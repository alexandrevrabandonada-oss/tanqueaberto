const { existsSync, readdirSync, readFileSync } = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const SOURCE_DIRS = ["app", "components", "hooks", "lib", "scripts"];
const ROOT_SOURCE_FILES = ["middleware.ts", "next.config.ts"];
const IGNORE_SEGMENTS = ["node_modules", ".git", ".next", "reports", "test-results"];

const REQUIRED_RUNTIME_ENVS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
];

const RECOMMENDED_RUNTIME_ENVS = [
  "STATION_EDITOR_SESSION_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_URL"
];

const PLATFORM_ENVS = new Set([
  "NODE_ENV",
  "VERCEL_URL",
  "VERCEL_BRANCH_URL"
]);

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

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
  const files = new Set();

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

function parseEnvFile(filePath) {
  const values = new Map();
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

function collectEnvReferences(files) {
  const references = new Set();
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

function main() {
  const files = collectSourceFiles();
  const referenced = collectEnvReferences(files);
  const example = parseEnvFile(path.join(ROOT, ".env.example"));
  const local = parseEnvFile(path.join(ROOT, ".env.local"));
  const runtime = new Map();

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

  console.log("== Environment audit ==");
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

  if (missingRecommended.length > 0) {
    console.log(`Recommended follow-up: definir ${missingRecommended.join(", ")}`);
  }

  if (undocumented.length > 0) {
    console.log(`Documentation follow-up: atualizar .env.example para ${undocumented.join(", ")}`);
  }

  if (missingRequired.length > 0) {
    process.exit(1);
  }
}

main();
