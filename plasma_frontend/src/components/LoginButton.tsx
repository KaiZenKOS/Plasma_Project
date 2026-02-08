import { usePrivy, useWallets } from "@privy-io/react-auth";
import { LogOut } from "lucide-react";

function formatAddress(address?: string | null): string {
  if (!address) return "0x...";
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function LoginButton() {
  const { login, logout, authenticated, user, ready } = usePrivy();
  const { wallets } = useWallets();

  if (!ready) {
    return <div className="h-10 w-32 animate-pulse rounded-xl bg-gray-200" />;
  }

  if (!authenticated) {
    return (
      <button
        type="button"
        onClick={login}
        className="inline-flex items-center justify-center rounded-xl bg-[#295c4f] px-5 py-2.5 text-sm font-medium text-white"
      >
        Start / Sign in
      </button>
    );
  }

  const address = wallets?.[0]?.address ?? user?.wallet?.address ?? null;

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900">
      <span>{formatAddress(address)}</span>
      <button
        type="button"
        onClick={logout}
        className="inline-flex items-center justify-center rounded-full p-1 text-gray-600 transition-opacity hover:opacity-70"
        aria-label="Log out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
