-- Migration: Tontine with Escrow (Phase 1)
-- Run this on your existing DB, then use Prisma or keep using pg.
-- psql: \i migrations/002_tontine_escrow.sql
-- Or from project root: psql $DATABASE_URL -f plasma_database/migrations/002_tontine_escrow.sql

-- 1) Add type and payout_details to tontine_groups
ALTER TABLE tontine_groups
  ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS payout_details TEXT;

COMMENT ON COLUMN tontine_groups.type IS 'STANDARD = payout to winner; ESCROW_LINKED = payout locked for service provider';
COMMENT ON COLUMN tontine_groups.payout_details IS 'JSON: service description, provider address (for ESCROW_LINKED)';

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

COMMENT ON TABLE escrow_transactions IS 'Escrow linked to tontine payout: LOCKED until winner confirms, then RELEASED to beneficiary (provider).';
