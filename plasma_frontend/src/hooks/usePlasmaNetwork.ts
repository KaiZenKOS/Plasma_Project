/**
 * Détecte si le wallet est sur Plasma Testnet (9746) et permet de basculer.
 * Si le wallet est sur un autre réseau, les tx tontine/escrow partent ailleurs et n'apparaissent pas sur testnet.plasmascan.to.
 */

import { useCallback, useEffect, useState } from "react";
import { useWallets } from "@privy-io/react-auth";

const PLASMA_TESTNET_CHAIN_ID = 9746;
const PLASMA_TESTNET_HEX = "0x2612"; // 9746 in hex

const PLASMA_TESTNET_PARAMS = {
  chainId: PLASMA_TESTNET_HEX,
  chainName: "Plasma Testnet",
  nativeCurrency: { name: "XPL", symbol: "XPL", decimals: 18 },
  rpcUrls: ["https://testnet-rpc.plasma.to"],
  blockExplorerUrls: ["https://testnet.plasmascan.to"],
};

export function usePlasmaNetwork() {
  const { wallets } = useWallets();
  const [chainId, setChainId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshChainId = useCallback(async () => {
    const wallet = wallets?.[0];
    if (!wallet) {
      setChainId(null);
      setLoading(false);
      return;
    }
    try {
      const provider = await (
        wallet as { getEthereumProvider?: () => Promise<{ request: (args: { method: string }) => Promise<string> }> }
      ).getEthereumProvider?.();
      if (!provider) {
        setChainId(null);
        setLoading(false);
        return;
      }
      const id = await provider.request({ method: "eth_chainId" });
      setChainId(id ? parseInt(id, 16) : null);
    } catch {
      setChainId(null);
    } finally {
      setLoading(false);
    }
  }, [wallets]);

  useEffect(() => {
    refreshChainId();
  }, [refreshChainId]);

  const switchToPlasma = useCallback(async () => {
    const wallet = wallets?.[0];
    if (!wallet) return;
    const provider = await (
      wallet as { getEthereumProvider?: () => Promise<{ request: (args: unknown) => Promise<unknown> }> }
    ).getEthereumProvider?.();
    if (!provider) return;
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: PLASMA_TESTNET_HEX }],
      });
      await refreshChainId();
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [PLASMA_TESTNET_PARAMS],
        });
        await refreshChainId();
      }
      throw err;
    }
  }, [wallets, refreshChainId]);

  return {
    chainId,
    isPlasmaTestnet: chainId === PLASMA_TESTNET_CHAIN_ID,
    switchToPlasma,
    refreshChainId,
    loading,
  };
}
