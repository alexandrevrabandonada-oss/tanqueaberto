import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { seedOperationalGroups } from "@/lib/ops/groups";

async function main() {
  const outputPath = process.argv.includes("--report") ? process.argv[process.argv.indexOf("--report") + 1] : null;
  const results = await seedOperationalGroups();
  const lines = [
    "# Seed operacional de grupos territoriais",
    "",
    `- Gerado em: ${new Date().toISOString()}`,
    `- Grupos processados: ${results.length}`,
    "",
    "## Grupos",
    ...results.map((item) => `- ${item.slug} · ${item.members} membros`)
  ];

  if (outputPath) {
    const absolute = path.isAbsolute(outputPath) ? outputPath : path.join(process.cwd(), outputPath);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, lines.join("\n"), "utf8");
    console.log(`Relatório salvo em ${absolute}`);
  } else {
    console.log(lines.join("\n"));
  }
}

main().catch((error) => {
  console.error("Falha ao semear grupos operacionais", error);
  process.exitCode = 1;
});
