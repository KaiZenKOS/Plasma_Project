import { useMemo } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

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

export function WalletConnection() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();

  const activeWallet = useMemo(() => wallets?.[0] ?? null, [wallets]);
  const address = activeWallet?.address ?? null;
  const email = user?.email?.address ?? null;
  const avatarLabel = getAvatarLabel(address, email);

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

  if (!authenticated) {
    return (
      <button
        type="button"
        className="inline-flex items-center rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
        onClick={login}
      >
        Connect
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
          {avatarLabel}
        </div>
        <span className="text-sm font-medium text-foreground">
          {address ? shortenAddress(address) : "Connected"}
        </span>
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
