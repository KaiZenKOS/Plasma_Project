import { useCallback, useEffect, useState } from "react";
import { createWalletClient, custom, type WalletClient } from "viem";
import { plasmaChain } from "../../../blockchain/viem";

declare global {
  interface Window {
    ethereum?: unknown;
  }
}

export function useWalletClient(): WalletClient | null {
  const [client, setClient] = useState<WalletClient | null>(null);

  const connect = useCallback(() => {
    const ethereum = typeof window !== "undefined" ? window.ethereum : undefined;
    if (!ethereum) {
      setClient(null);
      return;
    }
    try {
      const w = createWalletClient({
        chain: plasmaChain,
        transport: custom(ethereum as import("viem").CustomTransport),
      });
      setClient(w);
    } catch {
      setClient(null);
    }
  }, []);

  useEffect(() => {
    connect();
    if (typeof window !== "undefined" && window.ethereum && "on" in window.ethereum) {
      (window.ethereum as { on: (e: string, cb: () => void) => void }).on("accountsChanged", connect);
      (window.ethereum as { on: (e: string, cb: () => void) => void }).on("chainChanged", connect);
    }
  }, [connect]);

  return client;
}
