import { api } from "./client";
import type { BlockchainEvent } from "./types";

export async function getHistory(params?: {
  address?: string;
  limit?: number;
}): Promise<BlockchainEvent[]> {
  return api.get<BlockchainEvent[]>("/history", params);
}

/** Déclenche le backfill des événements tontine depuis la chaîne pour le wallet donné. */
export async function backfillHistory(address: string): Promise<{ ok: boolean; inserted: number; total: number }> {
  return api.get<{ ok: boolean; inserted: number; total: number }>("/history/backfill", { address });
}
