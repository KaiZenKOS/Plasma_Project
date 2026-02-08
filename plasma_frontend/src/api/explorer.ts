import { api } from "./client";

export type ScrapedTx = {
  hash: string;
  blockNumber?: string;
  method?: string;
  from?: string;
  to?: string;
  value?: string;
  valueSymbol?: string;
  time?: string;
  age?: string;
  explorerUrl: string;
};

export type TxListResponse = {
  address: string;
  transactions: ScrapedTx[];
};

/** Normalize to 0x + 40 hex, or null if invalid. */
export function normalizeAddress(addr: string | null | undefined): string | null {
  if (addr == null || typeof addr !== "string") return null;
  const s = addr.trim();
  const hex = s.startsWith("0x") ? s.slice(2) : s;
  if (!/^[a-fA-F0-9]{40}$/.test(hex)) return null;
  return "0x" + hex.toLowerCase();
}

export async function getAddressTxList(address: string): Promise<TxListResponse> {
  const normalized = normalizeAddress(address);
  if (!normalized) throw new Error("Invalid wallet address");
  return api.get<TxListResponse>("/explorer/txlist", { address: normalized });
}
