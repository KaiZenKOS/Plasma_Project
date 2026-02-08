import { useCallback, useEffect, useState } from "react";
import { publicClient } from "../../../blockchain/viem";

const usdtAddress =
  typeof import.meta.env.VITE_USDT_ADDRESS === "string" &&
  import.meta.env.VITE_USDT_ADDRESS
    ? (import.meta.env.VITE_USDT_ADDRESS as `0x${string}`)
    : null;

const ERC20_ABI = [
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

type UseUsdtAllowanceState = {
  allowance: bigint | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useUsdtAllowance(
  ownerAddress: string | null,
  spenderAddress: `0x${string}` | null,
): UseUsdtAllowanceState {
  const [allowance, setAllowance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ownerAddress || !spenderAddress || !usdtAddress) {
      setAllowance(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await publicClient.readContract({
        address: usdtAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [ownerAddress as `0x${string}`, spenderAddress],
      });

      setAllowance(result as bigint);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to read allowance";
      console.error("[useUsdtAllowance] Error:", msg);
      setError(msg);
      setAllowance(null);
    } finally {
      setLoading(false);
    }
  }, [ownerAddress, spenderAddress]);

  useEffect(() => {
    load();
  }, [load]);

  return { allowance, loading, error, reload: load };
}

