import { useEffect, useMemo, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Key } from "lucide-react";
import { PrivateKeyLoginModal } from "./PrivateKeyLoginModal";
import { usePrivateKeyWallet } from "../context/PrivateKeyWalletContext";
import { useNativeBalance } from "../hooks/useNativeBalance";
import { useUsdtBalance } from "../hooks/useUsdtBalance";

function shortenAddress(address: string): string {
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getAvatarLabel(address: string | null, email: string | null): string {
  if (email && email.length > 0) {
    return email[0].toUpperCase();
  }
  if (address && address.length >= 4) {
    return address.slice(2, 3).toUpperCase();
  }
  return "U";
}

function isMetamaskWallet(wallet: unknown): boolean {
  if (!wallet || typeof wallet !== "object") return false;
  const w = wallet as { walletClientType?: string; connectorType?: string };
  return w.walletClientType === "metamask" || w.connectorType === "metamask";
}

function formatBalance(value: string | null, decimals = 4): string {
  if (!value) return "0";
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function WalletConnection() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);

  // Always call hook (may throw if context not available, but that's handled)
  let privateKeyAddress: string | null = null;
  let privateKeyConnected = false;
  try {
    const privateKeyWallet = usePrivateKeyWallet();
    if (privateKeyWallet.isConnected) {
      privateKeyAddress = privateKeyWallet.address;
      privateKeyConnected = true;
    }
  } catch {
    // Context not available, ignore - this is expected if PrivateKeyWalletProvider is not mounted
  }

  const activeWallet = useMemo(() => {
    if (!wallets || wallets.length === 0) return null;
    return wallets.find(isMetamaskWallet) ?? wallets[0] ?? null;
  }, [wallets]);
  const address =
    privateKeyAddress ?? activeWallet?.address ?? user?.wallet?.address ?? null;
  const email = user?.email?.address ?? null;
  const avatarLabel = getAvatarLabel(address, email);
  const {
    balance: nativeBalance,
    loading: nativeLoading,
    error: nativeError,
  } = useNativeBalance(address);
  const {
    balance: usdtBalance,
    loading: usdtLoading,
    error: usdtError,
  } = useUsdtBalance(address);

  useEffect(() => {
    if (address) {
      console.log("[WalletConnection] address", address);
    }
  }, [address]);

  useEffect(() => {
    if (nativeBalance || nativeError) {
      console.log("[WalletConnection] XPL", { nativeBalance, nativeError });
    }
  }, [nativeBalance, nativeError]);

  useEffect(() => {
    if (usdtBalance || usdtError) {
      console.log("[WalletConnection] USDT", { usdtBalance, usdtError });
    }
  }, [usdtBalance, usdtError]);

  if (!ready) {
    return (
      <button
        type="button"
        className="inline-flex items-center rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground"
        disabled
      >
        Loading...
      </button>
    );
  }

  if (!authenticated && !privateKeyConnected) {
    return (
      <>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
            onClick={login}
          >
            Connect
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground"
            onClick={() => setShowPrivateKeyModal(true)}
          >
            <Key className="h-4 w-4" />
            Private Key
          </button>
        </div>
        <PrivateKeyLoginModal
          isOpen={showPrivateKeyModal}
          onClose={() => setShowPrivateKeyModal(false)}
        />
      </>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
          {avatarLabel}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            {address ? shortenAddress(address) : "Connected"}
          </span>
          <span className="text-xs text-muted-foreground">
            {nativeLoading
              ? "Native: loading..."
              : nativeError
                ? "Native: unavailable"
                : `XPL: ${formatBalance(nativeBalance)}`}
          </span>
          <span className="text-xs text-muted-foreground">
            {usdtLoading
              ? "USDT: loading..."
              : usdtError
                ? "USDT: unavailable"
                : `USDT: ${formatBalance(usdtBalance)}`}
          </span>
        </div>
      </div>
      <button
        type="button"
        className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground"
        onClick={logout}
      >
        Logout
      </button>
    </div>
  );
}
