import { useState } from "react";
import { Icon } from "@iconify/react";
import { usePlasmaNetwork } from "../hooks/usePlasmaNetwork";
import { useUser } from "../context/UserContext";

/**
 * Bannière affichée quand le wallet est connecté mais pas sur Plasma Testnet.
 * Les tx tontine/escrow doivent être sur le testnet pour apparaître sur testnet.plasmascan.to.
 */
export function PlasmaNetworkBanner() {
  const { walletAddress } = useUser();
  const { isPlasmaTestnet, switchToPlasma, loading, chainId } = usePlasmaNetwork();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!walletAddress || loading || isPlasmaTestnet) return null;

  const handleSwitch = async () => {
    setSwitching(true);
    setError(null);
    try {
      await switchToPlasma();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de changer de réseau");
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-3 flex flex-wrap items-center justify-center gap-2 text-sm">
      <Icon icon="solar:danger-triangle-bold" className="size-5 text-amber-600 shrink-0" />
      <span className="text-amber-800 font-medium">
        Vous n’êtes pas sur Plasma Testnet
        {chainId != null && (
          <span className="text-amber-700 font-normal"> (réseau actuel: chainId {chainId})</span>
        )}
        . Les transactions tontine et escrow doivent être sur le testnet pour apparaître sur l’explorateur.
      </span>
      <button
        type="button"
        onClick={handleSwitch}
        disabled={switching}
        className="shrink-0 px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-sm disabled:opacity-50 hover:bg-amber-700 transition-colors"
      >
        {switching ? "Changement…" : "Passer sur Plasma Testnet"}
      </button>
      {error && <span className="w-full text-center text-red-600 text-xs">{error}</span>}
    </div>
  );
}
