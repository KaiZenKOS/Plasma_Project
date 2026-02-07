import { useCallback, useEffect, useState } from "react";
import { formatEther } from "viem";
import { publicClient } from "../blockchain/viem";

type NativeBalanceState = {
  balance: string | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useNativeBalance(address: string | null): NativeBalanceState {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) {
      setBalance(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rawBalance = await publicClient.getBalance({
        address: address as `0x${string}`,
      });
      setBalance(formatEther(rawBalance));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Balance native indisponible",
      );
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  return { balance, loading, error, reload: load };
}
