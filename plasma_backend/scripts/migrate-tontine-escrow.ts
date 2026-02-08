/**
 * Run migration 002_tontine_escrow: add type, payout_details to tontine_groups + escrow_transactions table.
 * Usage: npx tsx scripts/migrate-tontine-escrow.ts
 * Or: npm run migrate (if script is added to package.json)
 */
import "dotenv/config";
import { pool } from "../src/db/client.js";

const SQL = `
-- 1) Add type and payout_details to tontine_groups
ALTER TABLE tontine_groups
  ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS payout_details TEXT;

-- 2) Create escrow_transactions table
CREATE TABLE IF NOT EXISTS escrow_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tontine_group_id UUID NOT NULL REFERENCES tontine_groups(id) ON DELETE CASCADE,
    contract_id VARCHAR(66),
    beneficiary VARCHAR(42) NOT NULL,
    winner_address VARCHAR(42) NOT NULL,
    amount BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'LOCKED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    released_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_escrow_tontine ON escrow_transactions(tontine_group_id);
CREATE INDEX IF NOT EXISTS idx_escrow_beneficiary ON escrow_transactions(beneficiary);
CREATE INDEX IF NOT EXISTS idx_escrow_winner ON escrow_transactions(winner_address);
`;

async function main() {
  try {
    await pool.query(SQL);
    console.log("Migration 002_tontine_escrow applied successfully.");
  } catch (e) {
    console.error("Migration failed:", e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
