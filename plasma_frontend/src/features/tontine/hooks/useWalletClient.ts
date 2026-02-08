import { useEffect, useMemo, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, type WalletClient } from "viem";
import { plasmaChain } from "../../../blockchain/viem";
import { usePrivateKeyWallet } from "../../../context/PrivateKeyWalletContext";

export function useWalletClient(): WalletClient | null {
  const [client, setClient] = useState<WalletClient | null>(null);
  const { wallets } = useWallets();
  const activeWallet = useMemo(() => wallets?.[0] ?? null, [wallets]);
  
  // Always call hook (may throw if context not available, but that's handled)
  let privateKeyWallet: WalletClient | null = null;
  try {
    const privateKeyWalletData = usePrivateKeyWallet();
    if (privateKeyWalletData.isConnected && privateKeyWalletData.walletClient) {
      privateKeyWallet = privateKeyWalletData.walletClient;
    }
  } catch {
    // PrivateKeyWalletContext not available, ignore - this is expected if PrivateKeyWalletProvider is not mounted
  }

  useEffect(() => {
    let active = true;
    
    // If private key wallet is connected, use it
    if (privateKeyWallet) {
      if (active) setClient(privateKeyWallet);
      return;
    }
    
    // Otherwise, use Privy wallet
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
        const address = (activeWallet as { address?: string }).address;
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
          if (active) setClient(null);
          return;
        }
        const w = createWalletClient({
          account: address as `0x${string}`,
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
  }, [activeWallet, privateKeyWallet]);

  return client;
}
