import { api } from "./client";
import type { TontineGroup, TontineGroupDetail, BlockchainEvent, EscrowTransaction } from "./types";

export type CreateTontineGroupParams = {
  name?: string;
  frequency_seconds: number;
  contribution_amount_usdt: number;
  collateral_amount_usdt: number;
  contract_tontine_id: number;
  smart_contract_address: string;
  creator_wallet: string;
  tx_hash?: string;
  block_number?: number;
};

export type CreateTontineGroupSimpleParams = {
  name: string;
  period?: "weekly" | "monthly";
  contribution_amount_usdt: number;
  collateral_amount_usdt?: number;
  creator_wallet: string;
  members?: string[];
};

export async function createTontineGroupSimple(params: CreateTontineGroupSimpleParams): Promise<TontineGroup> {
  return api.post<TontineGroup>("/tontine/groups/simple", params);
}

export async function getTontineGroups(wallet?: string | null): Promise<TontineGroup[]> {
  const params = wallet ? { wallet: wallet.toLowerCase() } : undefined;
  return api.get<TontineGroup[]>("/tontine/groups", params);
}

export async function postTontineGroup(params: CreateTontineGroupParams): Promise<TontineGroup> {
  return api.post<TontineGroup>("/tontine/groups", params);
}

export type CreateTontineGroupFromTxParams = {
  tx_hash: string;
  block_number?: number;
  creator_wallet: string;
  smart_contract_address: string;
  frequency_seconds: number;
  contribution_amount_usdt: number;
  collateral_amount_usdt: number;
  name?: string;
};

export async function postTontineGroupFromTx(params: CreateTontineGroupFromTxParams): Promise<TontineGroup> {
  return api.post<TontineGroup>("/tontine/groups/from-tx", params);
}

export type CreateTontineEscrowParams = CreateTontineGroupParams & {
  service_provider: string;
  payout_description?: string;
};

export async function postTontineEscrow(params: CreateTontineEscrowParams): Promise<TontineGroup> {
  return api.post<TontineGroup>("/tontine/escrow", params);
}

export async function getEscrowTransactions(wallet: string): Promise<EscrowTransaction[]> {
  return api.get<EscrowTransaction[]>("/tontine/escrow-transactions", { wallet });
}

export async function getTontineGroup(id: string): Promise<TontineGroupDetail> {
  return api.get<TontineGroupDetail>(`/tontine/groups/${encodeURIComponent(id)}`);
}

export async function signTontineGroup(groupId: string, creatorWallet: string): Promise<TontineGroup> {
  return api.post<TontineGroup>(`/tontine/groups/${encodeURIComponent(groupId)}/sign`, { creator_wallet: creatorWallet });
}

export async function executeTontineTurn(groupId: string): Promise<TontineGroup> {
  return api.post<TontineGroup>(`/tontine/groups/${encodeURIComponent(groupId)}/execute-turn`, {});
}

export type TontinePayout = {
  id: string;
  tontine_group_id: string;
  tx_hash: string;
  block_number: number | null;
  to_address: string;
  amount: string;
  created_at: string;
};

export async function getTontinePayouts(groupId: string): Promise<TontinePayout[]> {
  return api.get<TontinePayout[]>(`/tontine/groups/${encodeURIComponent(groupId)}/payouts`);
}

export async function getTontineDepositBalance(groupId: string): Promise<{ balance: string; balanceFormatted: string }> {
  return api.get<{ balance: string; balanceFormatted: string }>(`/tontine/groups/${encodeURIComponent(groupId)}/deposit-balance`);
}

export async function getBlockchainEvents(limit = 50): Promise<BlockchainEvent[]> {
  return api.get<BlockchainEvent[]>("/tontine/events", { limit });
}
