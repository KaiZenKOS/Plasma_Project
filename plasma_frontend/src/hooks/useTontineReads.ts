import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits, padHex, toHex } from "viem";
import tontineAbi from "../abis/TontineABI.json";
import { publicClient } from "../blockchain/viem";

const contractAddress =
  typeof import.meta.env.VITE_TONTINE_CONTRACT_ADDRESS === "string" &&
  import.meta.env.VITE_TONTINE_CONTRACT_ADDRESS
    ? (import.meta.env.VITE_TONTINE_CONTRACT_ADDRESS as `0x${string}`)
    : null;

const rpcUrl =
  typeof import.meta.env.VITE_PLASMA_RPC_URL === "string" &&
  import.meta.env.VITE_PLASMA_RPC_URL
    ? import.meta.env.VITE_PLASMA_RPC_URL
    : "";

function toBytes32Id(value: number | string | null): `0x${string}` | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("0x") && trimmed.length === 66) {
      return trimmed as `0x${string}`;
    }
    return null;
  }
  try {
    return padHex(toHex(BigInt(value)), { size: 32 });
  } catch {
    return null;
  }
}

type TontineReadsState = {
  loading: boolean;
  error: string | null;
  name: string | null;
  contributionAmount: string | null;
  currentTurnIndex: number | null;
  totalMembers: number | null;
  poolBalance: string | null;
  status: number | null;
  currentBeneficiary: `0x${string}` | null;
  pendingWithdrawal: string | null;
  reload: () => Promise<void>;
};

export function useTontineReads(params: {
  tontineId: number | string | null;
  userAddress: string | null;
  decimals?: number;
}): TontineReadsState {
  const { tontineId, userAddress, decimals = 6 } = params;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<
    Omit<TontineReadsState, "loading" | "error" | "reload">
  >({
    name: null,
    contributionAmount: null,
    currentTurnIndex: null,
    totalMembers: null,
    poolBalance: null,
    status: null,
    currentBeneficiary: null,
    pendingWithdrawal: null,
  });

  const bytes32Id = useMemo(() => toBytes32Id(tontineId), [tontineId]);

  const load = useCallback(async () => {
    if (!bytes32Id) {
      setError(null);
      setData({
        name: null,
        contributionAmount: null,
        currentTurnIndex: null,
        totalMembers: null,
        poolBalance: null,
        status: null,
        currentBeneficiary: null,
        pendingWithdrawal: null,
      });
      return;
    }
    if (!rpcUrl) {
      setError("RPC Plasma non configure");
      return;
    }
    if (!contractAddress) {
      setError("Adresse du contrat Tontine non configuree");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [details, beneficiary, withdrawal] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: tontineAbi,
          functionName: "getTontineDetails",
          args: [bytes32Id],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: tontineAbi,
          functionName: "currentBeneficiary",
          args: [bytes32Id],
        }),
        userAddress
          ? publicClient.readContract({
              address: contractAddress,
              abi: tontineAbi,
              functionName: "pendingWithdrawals",
              args: [userAddress as `0x${string}`],
            })
          : Promise.resolve(null),
      ]);

      const detailsTuple = details as unknown as [
        string,
        bigint,
        bigint,
        bigint,
        bigint,
        number,
      ];
      const pending = withdrawal as bigint | null;

      setData({
        name: detailsTuple[0],
        contributionAmount: formatUnits(detailsTuple[1], decimals),
        currentTurnIndex: Number(detailsTuple[2]),
        totalMembers: Number(detailsTuple[3]),
        poolBalance: formatUnits(detailsTuple[4], decimals),
        status: Number(detailsTuple[5]),
        currentBeneficiary: beneficiary as `0x${string}`,
        pendingWithdrawal: pending ? formatUnits(pending, decimals) : null,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Lecture tontine impossible",
      );
    } finally {
      setLoading(false);
    }
  }, [bytes32Id, userAddress, decimals]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, loading, error, reload: load };
}
