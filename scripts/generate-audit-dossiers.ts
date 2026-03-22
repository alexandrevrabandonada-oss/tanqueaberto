import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { generateRecurringAuditDossiers } from "@/lib/audit/scheduler";
import { getRecentAuditAlertHistory } from "@/lib/audit/alerts-history";
import { getRecentAuditReportRuns } from "@/lib/audit/reports";
import { fuelLabels } from "@/lib/format/labels";

function getArg(name: string) {
  const index = process.argv.findIndex((value) => value === name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

async function main() {
  const outputPath = getArg("--report");
  const createdRuns = await generateRecurringAuditDossiers();
  const recentRuns = await getRecentAuditReportRuns(10);
  const recentAlerts = await getRecentAuditAlertHistory(10);

  const summaryLines = [
    `# Relatório operacional - dossiês recorrentes`,
    ``,
    `- Gerado em: ${new Date().toISOString()}`,
    `- Dossiês produzidos nesta rodada: ${createdRuns.length}`,
    `- Últimos dossiês persistidos: ${recentRuns.length}`,
    `- Alertas persistidos recentes: ${recentAlerts.length}`,
    ``
  ];

  if (createdRuns.length > 0) {
    summaryLines.push(`## Dossiês gerados`);
    for (const run of createdRuns) {
      summaryLines.push(`- ${run.scopeType} · ${run.scopeLabel} · ${fuelLabels[run.fuelType]} · ${run.days} dias`);
    }
    summaryLines.push("");
  }

  if (outputPath) {
    const absolute = path.isAbsolute(outputPath) ? outputPath : path.join(process.cwd(), outputPath);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, summaryLines.join("\n"), "utf8");
    console.log(`Relatório salvo em ${absolute}`);
  } else {
    console.log(summaryLines.join("\n"));
  }
}

main().catch((error) => {
  console.error("Falha ao gerar dossiês recorrentes", error);
  process.exitCode = 1;
});
