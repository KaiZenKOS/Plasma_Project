/**
 * Allow tontine_groups without on-chain id (simple creation: name, period, members).
 * Usage: npx tsx scripts/migrate-simple-tontine.ts
 */
import "dotenv/config";
import { pool } from "../src/db/client.js";

async function main() {
  try {
    await pool.query("ALTER TABLE tontine_groups ALTER COLUMN contract_tontine_id DROP NOT NULL");
    await pool.query("ALTER TABLE tontine_groups ALTER COLUMN smart_contract_address DROP NOT NULL");
    console.log("Migration simple-tontine applied: contract_tontine_id and smart_contract_address are nullable.");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist") || msg.includes("already")) {
      console.log("Migration skipped or already applied:", msg);
    } else {
      console.error("Migration failed:", e);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

main();
