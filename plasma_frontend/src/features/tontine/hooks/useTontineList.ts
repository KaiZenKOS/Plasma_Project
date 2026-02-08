import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { publicClient } from "../../../blockchain/viem";
import { TONTINE_ABI } from "../abi";
import { TONTINE_CONTRACT_ADDRESS, USDT_DECIMALS } from "../config";

export type BlockchainTontine = {
  id: number;
  creator: `0x${string}`;
  contributionAmount: string; // Formatted USDT
  collateralAmount: string; // Formatted USDT
  frequencySeconds: number;
  active: boolean;
  memberCount: number;
  members: `0x${string}`[];
};

export function useTontineList(): {
  tontines: BlockchainTontine[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
} {
  const [tontines, setTontines] = useState<BlockchainTontine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!TONTINE_CONTRACT_ADDRESS) {
      setTontines([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the next Tontine ID to know how many tontines exist
      const nextId = await publicClient.readContract({
        address: TONTINE_CONTRACT_ADDRESS,
        abi: TONTINE_ABI,
        functionName: "nextTontineId",
      });

      const totalTontines = Number(nextId);
      if (totalTontines === 0) {
        setTontines([]);
        setLoading(false);
        return;
      }

      // Fetch all tontines in parallel
      const tontinePromises: Promise<BlockchainTontine | null>[] = [];
      
      for (let id = 0; id < totalTontines; id++) {
        const promise = (async (): Promise<BlockchainTontine | null> => {
          try {
            // Read tontine group data
            const groupData = await publicClient.readContract({
              address: TONTINE_CONTRACT_ADDRESS,
              abi: TONTINE_ABI,
              functionName: "tontineGroups",
              args: [BigInt(id)],
            });

            const g = groupData as readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean];
            
            // Check if tontine is active
            if (!g[6]) {
              return null; // Skip inactive tontines
            }

            // Get creator (first member)
            let creator: `0x${string}` = "0x0000000000000000000000000000000000000000" as `0x${string}`;
            let memberCount = 0;
            const members: `0x${string}`[] = [];

            try {
              const firstMember = await publicClient.readContract({
                address: TONTINE_CONTRACT_ADDRESS,
                abi: TONTINE_ABI,
                functionName: "tontineMembers",
                args: [BigInt(id), 0n],
              });
              creator = firstMember as `0x${string}`;
              members.push(creator);
              memberCount = 1;

              // Try to get more members
              for (let i = 1; ; i++) {
                try {
                  const member = await publicClient.readContract({
                    address: TONTINE_CONTRACT_ADDRESS,
                    abi: TONTINE_ABI,
                    functionName: "tontineMembers",
                    args: [BigInt(id), BigInt(i)],
                  });
                  members.push(member as `0x${string}`);
                  memberCount++;
                } catch {
                  break;
                }
              }
            } catch {
              // No members yet
            }

            return {
              id,
              creator,
              contributionAmount: formatUnits(g[0], USDT_DECIMALS),
              collateralAmount: formatUnits(g[2], USDT_DECIMALS),
              frequencySeconds: Number(g[1]),
              active: g[6],
              memberCount,
              members,
            };
          } catch (err) {
            console.error(`Error loading tontine ${id}:`, err);
            return null;
          }
        })();

        tontinePromises.push(promise);
      }

      const results = await Promise.all(tontinePromises);
      const validTontines = results.filter((t): t is BlockchainTontine => t !== null);
      
      setTontines(validTontines);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement des tontines");
      setTontines([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    tontines,
    loading,
    error,
    reload: load,
  };
}

