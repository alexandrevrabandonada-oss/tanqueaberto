import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const { Client } = require("pg");

async function main() {
  const connectionString = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error("Defina DATABASE_URL ou SUPABASE_DB_URL para atualizar as views analíticas.");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query("refresh materialized view public.audit_daily_station_prices;");
    await client.query("refresh materialized view public.audit_daily_city_prices;");
    await client.query("refresh materialized view public.audit_latest_station_prices;");
    console.log("Audit analytics refreshed successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
