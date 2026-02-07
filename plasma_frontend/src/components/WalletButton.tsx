import { usePrivy, useWallets } from "@privy-io/react-auth";
import { LogOut } from "lucide-react";

function shortenAddress(address: string): string {
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function WalletButton() {
  const { login, logout, authenticated, user, ready } = usePrivy();
  const { wallets } = useWallets();

  if (!ready) {
    return null;
  }

  if (!authenticated) {
    return (
      <button
        type="button"
        onClick={login}
        className="inline-flex items-center justify-center rounded-xl bg-[#295c4f] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Connect Wallet
      </button>
    );
  }

  const address = wallets?.[0]?.address ?? user?.wallet?.address;

  return (
    <div className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900">
      <span>{address ? shortenAddress(address) : "Connected"}</span>
      <button
        type="button"
        onClick={logout}
        className="inline-flex items-center justify-center rounded-lg p-1 text-gray-700 transition-opacity hover:opacity-70"
        aria-label="Log out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
