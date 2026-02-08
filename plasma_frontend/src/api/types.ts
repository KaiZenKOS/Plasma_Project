export type User = {
  wallet_address: string;
  pseudo: string | null;
  reputation_score: number;
  kyc_validated: boolean;
  created_at: string;
  updated_at: string;
};

export type ScoreResponse = {
  address: string;
  score: number;
};

export type TontineType = "STANDARD" | "ESCROW_LINKED";

export type TontineGroup = {
  id: string;
  name: string | null;
  type?: TontineType;
  payout_details?: string | null;
  frequency_seconds: number;
  contribution_amount: string;
  collateral_amount: string;
  status: string;
  contract_tontine_id: number | null;
  smart_contract_address: string | null;
  creator_signed_at?: string | null;
  current_turn_index?: number;
  next_due_at?: string | null;
  deposit_wallet_address?: string | null;
  created_at: string;
  updated_at?: string;
};

export type EscrowTransaction = {
  id: string;
  tontine_group_id: string;
  contract_id: string | null;
  beneficiary: string;
  winner_address: string;
  amount: string;
  status: "LOCKED" | "RELEASED";
  created_at: string;
  released_at: string | null;
};

export type TontineGroupDetail = TontineGroup & {
  members: Array<{
    wallet_address: string;
    turn_position: number;
    collateral_status: string;
    joined_at: string;
  }>;
};

export type BlockchainEvent = {
  tx_hash: string;
  block_number: number;
  method_name: string | null;
  from_address: string | null;
  to_address: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};
