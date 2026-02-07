import { createContext, useCallback, useContext, useMemo, useState } from "react";
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
  const [walletAddress, setWalletAddress] = useState<string | null>(() => {
    try {
      return localStorage.getItem("plasma_wallet") ?? null;
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<User | null>(null);

  const setWallet = useCallback((address: string | null) => {
    setWalletAddress(address);
    setUser(null);
    try {
      if (address) localStorage.setItem("plasma_wallet", address);
      else localStorage.removeItem("plasma_wallet");
    } catch {}
  }, []);

  const registerUser = useCallback(async (address: string, pseudo?: string): Promise<User> => {
    const normalized = address.toLowerCase().startsWith("0x") ? address : `0x${address}`;
    const u = await upsertUser(normalized, { pseudo: pseudo ?? null });
    setWalletAddress(normalized);
    setUser(u);
    try {
      localStorage.setItem("plasma_wallet", normalized);
    } catch {}
    return u;
  }, []);

  const clearUser = useCallback(() => {
    setWalletAddress(null);
    setUser(null);
    try {
      localStorage.removeItem("plasma_wallet");
    } catch {}
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({
      walletAddress,
      user,
      setWallet,
      registerUser,
      clearUser,
    }),
    [walletAddress, user, setWallet, registerUser, clearUser]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
