import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { publicClient } from "../../../blockchain/viem";
import { TONTINE_ABI } from "../abi";
import { TONTINE_CONTRACT_ADDRESS, USDT_DECIMALS } from "../config";

export type TontineGroupChain = {
  contributionAmount: bigint;
  frequencySeconds: bigint;
  collateralAmount: bigint;
  currentTurnIndex: number;
  createdAt: bigint;
  nextDueAt: bigint;
  active: boolean;
};

export type TontineChainState = {
  group: TontineGroupChain | null;
  members: `0x${string}`[];
  memberCount: number;
  isMember: boolean;
  lastPaidAt: number | null;
  pendingWithdrawal: string | null;
  currentBeneficiary: `0x${string}` | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useTontineChain(params: {
  tontineId: number | null;
  userAddress: string | null;
}): TontineChainState {
  const { tontineId, userAddress } = params;
  const [group, setGroup] = useState<TontineGroupChain | null>(null);
  const [members, setMembers] = useState<`0x${string}`[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [lastPaidAt, setLastPaidAt] = useState<number | null>(null);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<string | null>(null);
  const [currentBeneficiary, setCurrentBeneficiary] = useState<`0x${string}` | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (tontineId == null || tontineId < 0 || !TONTINE_CONTRACT_ADDRESS) {
      setGroup(null);
      setMembers([]);
      setIsMember(false);
      setLastPaidAt(null);
      setPendingWithdrawal(null);
      setCurrentBeneficiary(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [groupData, pending] = await Promise.all([
        publicClient.readContract({
          address: TONTINE_CONTRACT_ADDRESS,
          abi: TONTINE_ABI,
          functionName: "tontineGroups",
          args: [BigInt(tontineId)],
        }),
        userAddress
          ? publicClient.readContract({
              address: TONTINE_CONTRACT_ADDRESS,
              abi: TONTINE_ABI,
              functionName: "pendingWithdrawals",
              args: [userAddress as `0x${string}`],
            })
          : Promise.resolve(0n),
      ]);

      const g = groupData as readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean];
      const groupObj: TontineGroupChain = {
        contributionAmount: g[0],
        frequencySeconds: g[1],
        collateralAmount: g[2],
        currentTurnIndex: Number(g[3]),
        createdAt: g[4],
        nextDueAt: g[5],
        active: g[6],
      };
      setGroup(groupObj);

      const memberList: `0x${string}`[] = [];
      for (let i = 0; ; i++) {
        try {
          const m = await publicClient.readContract({
            address: TONTINE_CONTRACT_ADDRESS,
            abi: TONTINE_ABI,
            functionName: "tontineMembers",
            args: [BigInt(tontineId), BigInt(i)],
          });
          memberList.push(m as `0x${string}`);
        } catch {
          break;
        }
      }
      setMembers(memberList);

      const beneficiary = memberList[groupObj.currentTurnIndex] ?? null;
      setCurrentBeneficiary(beneficiary ?? null);

      if (userAddress) {
        const [member, lastPaid] = await Promise.all([
          publicClient.readContract({
            address: TONTINE_CONTRACT_ADDRESS,
            abi: TONTINE_ABI,
            functionName: "isMember",
            args: [BigInt(tontineId), userAddress as `0x${string}`],
          }),
          publicClient.readContract({
            address: TONTINE_CONTRACT_ADDRESS,
            abi: TONTINE_ABI,
            functionName: "lastPaidAt",
            args: [BigInt(tontineId), userAddress as `0x${string}`],
          }),
        ]);
        setIsMember(member as boolean);
        setLastPaidAt(Number(lastPaid as bigint));
        setPendingWithdrawal(
          (pending as bigint) > 0n ? formatUnits(pending as bigint, USDT_DECIMALS) : null,
        );
      } else {
        setIsMember(false);
        setLastPaidAt(null);
        setPendingWithdrawal(
          (pending as bigint) > 0n ? formatUnits(pending as bigint, USDT_DECIMALS) : null,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lecture chaine impossible");
      setGroup(null);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [tontineId, userAddress]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    group,
    members,
    memberCount: members.length,
    isMember,
    lastPaidAt,
    pendingWithdrawal,
    currentBeneficiary,
    loading,
    error,
    reload: load,
  };
}

export function useNextTontineId(): { nextId: number | null; loading: boolean } {
  const [nextId, setNextId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!TONTINE_CONTRACT_ADDRESS) {
      setNextId(null);
      setLoading(false);
      return;
    }
    publicClient
      .readContract({
        address: TONTINE_CONTRACT_ADDRESS,
        abi: TONTINE_ABI,
        functionName: "nextTontineId",
      })
      .then((v) => {
        setNextId(Number(v as bigint));
        setLoading(false);
      })
      .catch(() => {
        setNextId(null);
        setLoading(false);
      });
  }, []);
  return { nextId, loading };
}
