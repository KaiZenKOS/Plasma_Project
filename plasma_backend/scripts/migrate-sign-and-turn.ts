/**
 * Add creator_signed_at and current_turn_index for simple tontines (sign + test "execute échéance").
 * Usage: npx tsx scripts/migrate-sign-and-turn.ts
 */
import "dotenv/config";
import { pool } from "../src/db/client.js";

async function main() {
  try {
    await pool.query("ALTER TABLE tontine_groups ADD COLUMN IF NOT EXISTS creator_signed_at TIMESTAMPTZ");
    await pool.query("ALTER TABLE tontine_groups ADD COLUMN IF NOT EXISTS current_turn_index INT NOT NULL DEFAULT 0");
    await pool.query("ALTER TABLE tontine_groups ADD COLUMN IF NOT EXISTS next_due_at TIMESTAMPTZ");
    console.log("Migration sign-and-turn applied: creator_signed_at, current_turn_index, next_due_at.");
  } catch (e: unknown) {
    console.error("Migration failed:", e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
