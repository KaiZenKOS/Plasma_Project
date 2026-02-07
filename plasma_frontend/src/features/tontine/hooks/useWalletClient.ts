import { useEffect, useMemo, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, type WalletClient } from "viem";
import { plasmaChain } from "../../../blockchain/viem";

export function useWalletClient(): WalletClient | null {
  const [client, setClient] = useState<WalletClient | null>(null);
  const { wallets } = useWallets();
  const activeWallet = useMemo(() => wallets?.[0] ?? null, [wallets]);

  useEffect(() => {
    let active = true;
    const connect = async () => {
      if (!activeWallet) {
        if (active) setClient(null);
        return;
      }
      try {
        const provider = await (
          activeWallet as { getEthereumProvider?: () => Promise<unknown> }
        ).getEthereumProvider?.();
        if (!provider) {
          if (active) setClient(null);
          return;
        }
        const w = createWalletClient({
          chain: plasmaChain,
          transport: custom(provider as import("viem").CustomTransport),
        });
        if (active) setClient(w);
      } catch {
        if (active) setClient(null);
      }
    };
    connect();
    return () => {
      active = false;
    };
  }, [activeWallet]);

  return client;
}
