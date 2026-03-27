const { promises: fs } = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const SOURCE_DIRS = ["app", "components", "hooks", "lib", "scripts"];
const MIGRATION_DIR = path.join(ROOT, "supabase", "migrations");
const IGNORE_SEGMENTS = ["node_modules", ".next", "reports", "test-results"];

const requiredMigrationPatterns = [
  { label: "audit_station_groups", pattern: /create\s+(?:table|materialized view)\s+if\s+not\s+exists\s+public\.audit_station_groups/i },
  { label: "audit_daily_station_prices", pattern: /create\s+materialized\s+view\s+if\s+not\s+exists\s+public\.audit_daily_station_prices/i },
  { label: "audit_daily_city_prices", pattern: /create\s+materialized\s+view\s+if\s+not\s+exists\s+public\.audit_daily_city_prices/i },
  { label: "beta_feedback_submissions", pattern: /create\s+table\s+if\s+not\s+exists\s+public\.beta_feedback_submissions/i },
  { label: "collector_trust", pattern: /create\s+table\s+if\s+not\s+exists\s+public\.collector_trust/i },
  { label: "operational_events", pattern: /create\s+table\s+if\s+not\s+exists\s+public\.operational_events/i },
  { label: "sys_config", pattern: /create\s+table\s+if\s+not\s+exists\s+public\.sys_config/i },
  { label: "price_report_audit_events", pattern: /create\s+table\s+if\s+not\s+exists\s+public\.price_report_audit_events/i },
  { label: "price_reports.observed_at", pattern: /add\s+column\s+if\s+not\s+exists\s+observed_at\s+timestamptz/i }
];

const forbiddenSourcePatterns = [
  { label: "legacy station_groups", pattern: /\bstation_groups\b/i },
  { label: "legacy submission_success", pattern: /\bsubmission_success\b/i },
  { label: "legacy price_report_submitted", pattern: /\bprice_report_submitted\b/i }
];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relative = path.relative(ROOT, fullPath);
    if (IGNORE_SEGMENTS.some((segment) => relative.split(path.sep).includes(segment))) {
      continue;
    }

    if (entry.name.includes("check-schema-drift")) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
      continue;
    }

    if (/\.(ts|tsx|js|cjs|sql|md)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const migrationFiles = (await walk(MIGRATION_DIR)).filter((file) => file.endsWith(".sql"));
  const sourceFiles = [];
  for (const dir of SOURCE_DIRS) {
    const full = path.join(ROOT, dir);
    try {
      sourceFiles.push(...(await walk(full)).filter((file) => !file.includes(`${path.sep}supabase${path.sep}migrations${path.sep}`)));
    } catch {
      continue;
    }
  }

  const migrationText = await Promise.all(migrationFiles.map((file) => fs.readFile(file, "utf8")));
  const sourceText = await Promise.all(sourceFiles.map((file) => fs.readFile(file, "utf8")));

  const issues = [];

  for (const requirement of requiredMigrationPatterns) {
    const found = migrationText.some((text) => requirement.pattern.test(text));
    if (!found) {
      issues.push(`missing migration pattern: ${requirement.label}`);
    }
  }

  for (const forbidden of forbiddenSourcePatterns) {
    const offenders = sourceFiles.filter((_, index) => forbidden.pattern.test(sourceText[index] ?? ""));
    if (offenders.length > 0) {
      issues.push(`forbidden legacy name still present (${forbidden.label}): ${offenders.map((file) => path.relative(ROOT, file)).join(", ")}`);
    }
  }

  if (issues.length > 0) {
    console.error("Schema drift check failed:");
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log(`Schema drift check passed across ${sourceFiles.length} source files and ${migrationFiles.length} migrations.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
