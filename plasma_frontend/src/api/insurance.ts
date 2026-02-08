import { api } from "./client";

export type InsurancePolicyRecord = {
  walletAddress: string;
  policyId: number;
  tontineId: number;
  coverageAmount: string;
  premiumPaid: string;
  active: boolean;
  purchasedAt: number;
  txHash?: string;
};

export type RegisterInsuranceParams = {
  walletAddress: string;
  policyId: number;
  tontineId: number;
  coverageAmount: string;
  premiumPaid: string;
  active: boolean;
  purchasedAt: number;
  txHash?: string;
};

export async function getInsurances(walletAddress: string | null | undefined): Promise<InsurancePolicyRecord[]> {
  if (!walletAddress) return [];
  const { policies } = await api.get<{ policies: InsurancePolicyRecord[] }>("/insurances", {
    address: walletAddress.toLowerCase(),
  });
  return policies ?? [];
}

export async function registerInsurance(params: RegisterInsuranceParams): Promise<InsurancePolicyRecord> {
  return api.post<InsurancePolicyRecord>("/insurances", {
    ...params,
    walletAddress: params.walletAddress.toLowerCase(),
  });
}
