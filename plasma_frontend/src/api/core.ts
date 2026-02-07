import { api } from "./client";
import type { User, ScoreResponse } from "./types";

export async function getUser(address: string): Promise<User> {
  return api.get<User>(`/core/user/${encodeURIComponent(address)}`);
}

export async function getUserScore(address: string): Promise<ScoreResponse> {
  return api.get<ScoreResponse>(`/core/user/${encodeURIComponent(address)}/score`);
}

export async function upsertUser(
  address: string,
  data: { pseudo?: string; kyc_validated?: boolean }
): Promise<User> {
  return api.put<User>(`/core/user/${encodeURIComponent(address)}`, data);
}
