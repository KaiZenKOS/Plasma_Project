import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { publicClient } from "../blockchain/viem";

const usdtAddress =
  typeof import.meta.env.VITE_USDT_ADDRESS === "string" &&
  import.meta.env.VITE_USDT_ADDRESS
    ? (import.meta.env.VITE_USDT_ADDRESS as `0x${string}`)
    : null;

const rpcUrl =
  typeof import.meta.env.VITE_PLASMA_RPC_URL === "string" &&
  import.meta.env.VITE_PLASMA_RPC_URL
    ? import.meta.env.VITE_PLASMA_RPC_URL
    : "";

const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "decimals", type: "uint8" }],
  },
] as const;

type UsdtBalanceState = {
  balance: string | null;
  decimals: number | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useUsdtBalance(address: string | null): UsdtBalanceState {
  const [balance, setBalance] = useState<string | null>(null);
  const [decimals, setDecimals] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) {
      setBalance(null);
      setDecimals(null);
      return;
    }
    if (!rpcUrl) {
      setError("RPC Plasma non configure");
      setBalance(null);
      setDecimals(null);
      return;
    }
    if (!usdtAddress) {
      setError("USDT address non configuree");
      setBalance(null);
      setDecimals(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [rawBalance, rawDecimals] = await Promise.all([
        publicClient.readContract({
          address: usdtAddress,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        }),
        publicClient.readContract({
          address: usdtAddress,
          abi: erc20Abi,
          functionName: "decimals",
        }),
      ]);
      const dec = Number(rawDecimals);
      setDecimals(dec);
      setBalance(formatUnits(rawBalance, dec));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Balance USDT indisponible",
      );
      setBalance(null);
      setDecimals(null);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  return { balance, decimals, loading, error, reload: load };
}
