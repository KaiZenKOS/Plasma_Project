-- Plasma Project - Schéma PostgreSQL hybride RGPD
-- Cœur (Identity) + Tables modulaires (Services) + Cache blockchain

-- =============================================================================
-- 1. TABLE CŒUR : users (Identity)
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    wallet_address VARCHAR(42) PRIMARY KEY,
    pseudo VARCHAR(50),
    reputation_score INT NOT NULL DEFAULT 100,
    kyc_validated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Données utilisateurs (identité non-custodial). RGPD: pseudo modifiable/effaçable.';
COMMENT ON COLUMN users.wallet_address IS 'Identifiant unique (adresse wallet).';
COMMENT ON COLUMN users.reputation_score IS 'Score calculé déterministe (pas d''IA). Défaut 100.';
COMMENT ON COLUMN users.kyc_validated IS 'Anti-Sybil.';

-- =============================================================================
-- 2. TABLES MODULAIRES : Services
-- =============================================================================

-- Registre des services actifs (NexusRegistry côté blockchain)
CREATE TABLE IF NOT EXISTS services_registry (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    smart_contract_address VARCHAR(42) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(smart_contract_address)
);

-- Groupes Tontine (configuration)
CREATE TABLE IF NOT EXISTS tontine_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100),
    frequency_seconds INT NOT NULL,
    contribution_amount BIGINT NOT NULL,
    collateral_amount BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    contract_tontine_id INT,
    smart_contract_address VARCHAR(42),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lien User-Tontine avec ordre de passage et statut collatéral
CREATE TABLE IF NOT EXISTS tontine_members (
    id SERIAL PRIMARY KEY,
    tontine_group_id UUID NOT NULL REFERENCES tontine_groups(id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    turn_position INT NOT NULL,
    collateral_status VARCHAR(20) NOT NULL DEFAULT 'ok',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tontine_group_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_tontine_members_wallet ON tontine_members(wallet_address);
CREATE INDEX IF NOT EXISTS idx_tontine_members_group ON tontine_members(tontine_group_id);

-- =============================================================================
-- 3. TABLE CACHE : blockchain_events
-- =============================================================================
CREATE TABLE IF NOT EXISTS blockchain_events (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    method_name VARCHAR(100),
    from_address VARCHAR(42),
    to_address VARCHAR(42),
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blockchain_events_tx ON blockchain_events(tx_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_events_block ON blockchain_events(block_number);
CREATE INDEX IF NOT EXISTS idx_blockchain_events_from ON blockchain_events(from_address);

COMMENT ON TABLE blockchain_events IS 'Copie locale des transactions pour affichage rapide sans requêter la blockchain.';

-- =============================================================================
-- Trigger updated_at pour users et tontine_groups
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS tontine_groups_updated_at ON tontine_groups;
CREATE TRIGGER tontine_groups_updated_at
    BEFORE UPDATE ON tontine_groups
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
