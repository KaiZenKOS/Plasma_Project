import { api } from "./client";

export type EasEscrow = {
  id: string;
  deposit_wallet_address: string;
  depositor_address: string;
  beneficiary_address: string;
  amount_usdt: number;
  description: string | null;
  status: "LOCKED" | "RELEASED";
  created_at: string;
  released_at: string | null;
  release_tx_hash: string | null;
};

export type EasEscrowDetail = EasEscrow & { balanceFormatted?: string };

export type CreateEasEscrowParams = {
  depositor_wallet: string;
  beneficiary_address: string;
  amount_usdt: number;
  description?: string;
};

export async function createEasEscrow(params: CreateEasEscrowParams): Promise<EasEscrow> {
  return api.post<EasEscrow>("/eas/escrows", params);
}

export async function getEasEscrows(wallet: string): Promise<EasEscrow[]> {
  return api.get<EasEscrow[]>("/eas/escrows", { wallet });
}

export async function getEasEscrowDetail(id: string): Promise<EasEscrowDetail> {
  return api.get<EasEscrowDetail>(`/eas/escrows/${encodeURIComponent(id)}`);
}

export async function releaseEasEscrow(id: string): Promise<{ released: boolean; tx_hash: string; block_number: number }> {
  return api.post<{ released: boolean; tx_hash: string; block_number: number }>(`/eas/escrows/${encodeURIComponent(id)}/release`, {});
}
