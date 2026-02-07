import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createWalletClient, http, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { plasmaChain } from "../blockchain/viem";

type PrivateKeyWalletContextValue = {
  walletClient: WalletClient | null;
  address: string | null;
  connectWithPrivateKey: (privateKey: string) => boolean;
  disconnect: () => void;
  isConnected: boolean;
};

const PrivateKeyWalletContext = createContext<PrivateKeyWalletContextValue | null>(null);

export function PrivateKeyWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [address, setAddress] = useState<string | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);

  const connectWithPrivateKey = useCallback((key: string): boolean => {
    try {
      // Normalize private key (remove 0x if present, add it back)
      const normalizedKey = key.startsWith("0x") ? key : `0x${key}`;
      
      // Validate private key format
      if (normalizedKey.length !== 66) {
        throw new Error("Invalid private key format");
      }

      // Create account from private key
      const account = privateKeyToAccount(normalizedKey as `0x${string}`);

      // Create wallet client
      const client = createWalletClient({
        account,
        chain: plasmaChain,
        transport: http(),
      });

      setAddress(account.address);
      setWalletClient(client);

      // Store in sessionStorage (only for current session, cleared on browser close)
      sessionStorage.setItem(
        "privy_private_key_wallet",
        JSON.stringify({
          privateKey: normalizedKey,
          address: account.address,
        })
      );

      return true;
    } catch (error) {
      console.error("Failed to connect with private key:", error);
      return false;
    }
  }, []);

  // Load from sessionStorage on mount (only for current session)
  useEffect(() => {
    const stored = sessionStorage.getItem("privy_private_key_wallet");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.privateKey && parsed.address) {
          connectWithPrivateKey(parsed.privateKey);
        }
      } catch {
        // Invalid stored data, ignore
      }
    }
  }, [connectWithPrivateKey]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setWalletClient(null);
    sessionStorage.removeItem("privy_private_key_wallet");
  }, []);

  const value = useMemo<PrivateKeyWalletContextValue>(
    () => ({
      walletClient,
      address,
      connectWithPrivateKey,
      disconnect,
      isConnected: !!address && !!walletClient,
    }),
    [walletClient, address, connectWithPrivateKey, disconnect]
  );

  return (
    <PrivateKeyWalletContext.Provider value={value}>
      {children}
    </PrivateKeyWalletContext.Provider>
  );
}

export function usePrivateKeyWallet() {
  const ctx = useContext(PrivateKeyWalletContext);
  if (!ctx) {
    throw new Error("usePrivateKeyWallet must be used within PrivateKeyWalletProvider");
  }
  return ctx;
}

