import { api } from "./client";
import type { BlockchainEvent } from "./types";

export async function getHistory(params?: {
  address?: string;
  limit?: number;
}): Promise<BlockchainEvent[]> {
  return api.get<BlockchainEvent[]>("/history", params);
}
