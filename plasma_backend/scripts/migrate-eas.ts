/**
 * Escrow as a Service (EaS) - table pour les escrows standalone.
 * Usage: npx tsx scripts/migrate-eas.ts
 */
import "dotenv/config";
import { pool } from "../src/db/client.js";

async function main() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS eas_escrows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deposit_wallet_address VARCHAR(42) NOT NULL,
        deposit_wallet_private_key TEXT NOT NULL,
        depositor_address VARCHAR(42) NOT NULL,
        beneficiary_address VARCHAR(42) NOT NULL,
        amount_usdt NUMERIC NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'LOCKED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        released_at TIMESTAMPTZ,
        release_tx_hash VARCHAR(66)
      )
    `);
    await pool.query("CREATE INDEX IF NOT EXISTS idx_eas_depositor ON eas_escrows(depositor_address)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_eas_beneficiary ON eas_escrows(beneficiary_address)");
    console.log("Migration EaS applied.");
  } catch (e: unknown) {
    console.error("Migration failed:", e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
