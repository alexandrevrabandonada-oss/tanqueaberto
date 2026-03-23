import { getGroupReadinessRows } from "./lib/ops/readiness";
import { getCityReadinessRows } from "./lib/ops/readiness";

async function main() {
  try {
    const [cityReadiness, groupReadiness] = await Promise.all([
      getCityReadinessRows(30),
      getGroupReadinessRows(30)
    ]);

    console.log("=== CITY READINESS ===");
    cityReadiness.slice(0, 5).forEach(row => {
      console.log(`${row.city}: ${row.score} (${row.recommendation})`);
    });

    console.log("\n=== GROUP READINESS ===");
    groupReadiness.forEach(row => {
      console.log(`${row.groupName} (${row.city || 'Regional'}): ${row.score} (${row.recommendation})`);
    });
  } catch (error) {
    console.error("Error running readiness verification:", error);
  }
}

main();
