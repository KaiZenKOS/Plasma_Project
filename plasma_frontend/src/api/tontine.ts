import { api } from "./client";
import type { TontineGroup, TontineGroupDetail, BlockchainEvent } from "./types";

export async function getTontineGroups(): Promise<TontineGroup[]> {
  return api.get<TontineGroup[]>("/tontine/groups");
}

export async function getTontineGroup(id: string): Promise<TontineGroupDetail> {
  return api.get<TontineGroupDetail>(`/tontine/groups/${encodeURIComponent(id)}`);
}

export async function getBlockchainEvents(limit = 50): Promise<BlockchainEvent[]> {
  return api.get<BlockchainEvent[]>("/tontine/events", { limit });
}
