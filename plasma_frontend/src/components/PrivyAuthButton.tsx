import { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { LogOut, User, Key } from "lucide-react";
import { PrivateKeyLoginModal } from "./PrivateKeyLoginModal";
import { usePrivateKeyWallet } from "../context/PrivateKeyWalletContext";

function formatAddress(address?: string | null): string {
  if (!address) return "0x...";
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function PrivyAuthButton() {
  const { login, logout, ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
  
  // Always call hook (may throw if context not available, but that's handled)
  let privateKeyAddress: string | null = null;
  try {
    const privateKeyWallet = usePrivateKeyWallet();
    if (privateKeyWallet.isConnected) {
      privateKeyAddress = privateKeyWallet.address;
    }
  } catch {
    // Context not available, ignore - this is expected if PrivateKeyWalletProvider is not mounted
  }

  if (!ready) {
    return null;
  }

  if (!authenticated && !privateKeyAddress) {
    return (
      <>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={login}
            className="inline-flex items-center gap-2 rounded-xl bg-[#295c4f] px-5 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-[#1f4a3e]"
          >
            <User className="h-4 w-4" />
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => setShowPrivateKeyModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#295c4f] bg-white px-5 py-2.5 font-medium text-[#295c4f] shadow-sm transition-all hover:bg-gray-50"
          >
            <Key className="h-4 w-4" />
            Clé privée
          </button>
        </div>
        <PrivateKeyLoginModal
          isOpen={showPrivateKeyModal}
          onClose={() => setShowPrivateKeyModal(false)}
        />
      </>
    );
  }

  // Show address from private key wallet if connected, otherwise from Privy
  const address = privateKeyAddress ?? wallets?.[0]?.address ?? user?.wallet?.address ?? null;

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900">
      <User className="h-4 w-4 text-gray-600" />
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
