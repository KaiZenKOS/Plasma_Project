/**
 * Table pour l'historique des échéances (libération USDT vers bénéficiaire) — pour afficher les transactions.
 * Usage: npx tsx scripts/migrate-tontine-payouts.ts
 */
import "dotenv/config";
import { pool } from "../src/db/client.js";

async function main() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tontine_payouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tontine_group_id UUID NOT NULL REFERENCES tontine_groups(id) ON DELETE CASCADE,
        tx_hash VARCHAR(66) NOT NULL,
        block_number BIGINT,
        to_address VARCHAR(42) NOT NULL,
        amount NUMERIC NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query("CREATE INDEX IF NOT EXISTS idx_tontine_payouts_group ON tontine_payouts(tontine_group_id)");
    console.log("Migration tontine-payouts applied.");
  } catch (e: unknown) {
    console.error("Migration failed:", e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
