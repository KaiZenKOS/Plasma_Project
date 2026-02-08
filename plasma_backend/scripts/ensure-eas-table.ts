/**
 * Ensure eas_escrows table exists - does not close the pool
 * Usage: npx tsx scripts/ensure-eas-table.ts
 */
import "dotenv/config";
import { pool } from "../src/db/client.js";

async function main() {
  try {
    // Check if table exists
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'eas_escrows'
      )
    `);
    
    const exists = checkResult.rows[0]?.exists;
    
    if (exists) {
      console.log("✓ Table eas_escrows already exists");
      return;
    }
    
    console.log("Creating table eas_escrows...");
    
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
    
    console.log("✓ Table eas_escrows created successfully");
  } catch (e: unknown) {
    console.error("✗ Error:", e);
    process.exit(1);
  }
}

main().finally(() => {
  // Don't close the pool - let the app manage it
  process.exit(0);
});

