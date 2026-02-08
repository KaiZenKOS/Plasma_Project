import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { upsertUser } from "../api/core";
import type { User } from "../api/types";

type UserContextValue = {
  walletAddress: string | null;
  user: User | null;
  setWallet: (address: string | null) => void;
  registerUser: (address: string, pseudo?: string) => Promise<User>;
  clearUser: () => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = useMemo(
    () => (authenticated ? (wallets?.[0]?.address ?? null) : null),
    [authenticated, wallets],
  );
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      setUser(null);
      return;
    }
    let active = true;
    // Non-blocking: Don't wait for API response to render the app
    // The app should work even if backend is unavailable
    upsertUser(walletAddress, {})
      .then((u) => {
        if (active) setUser(u);
      })
      .catch((err) => {
        // Silently fail - backend might not be available
        // This is expected in development or if backend is down
        console.warn("[UserContext] Failed to upsert user (backend may be unavailable):", err);
        if (active) setUser(null);
      });
    return () => {
      active = false;
    };
  }, [walletAddress]);

  const setWallet = useCallback((_address: string | null) => {}, []);

  const registerUser = useCallback(
    async (address: string, pseudo?: string): Promise<User> => {
      const normalized = address.toLowerCase().startsWith("0x")
        ? address
        : `0x${address}`;
      const u = await upsertUser(normalized, { pseudo: pseudo ?? null });
      setUser(u);
      return u;
    },
    [],
  );

  const clearUser = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({
      walletAddress,
      user,
      setWallet,
      registerUser,
      clearUser,
    }),
    [walletAddress, user, setWallet, registerUser, clearUser],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
