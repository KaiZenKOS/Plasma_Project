/**
 * Add deposit wallet per tontine (address + private key for releasing USDT to beneficiary).
 * Usage: npx tsx scripts/migrate-deposit-wallet.ts
 */
import "dotenv/config";
import { pool } from "../src/db/client.js";

async function main() {
  try {
    await pool.query("ALTER TABLE tontine_groups ADD COLUMN IF NOT EXISTS deposit_wallet_address VARCHAR(42)");
    await pool.query("ALTER TABLE tontine_groups ADD COLUMN IF NOT EXISTS deposit_wallet_private_key TEXT");
    console.log("Migration deposit-wallet applied.");
  } catch (e: unknown) {
    console.error("Migration failed:", e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
