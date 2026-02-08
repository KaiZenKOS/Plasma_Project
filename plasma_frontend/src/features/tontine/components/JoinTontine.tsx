import { useCallback, useState, useEffect } from "react";
import { useUser } from "../../../context/UserContext";
import { useTontineToast } from "../context/ToastContext";
import { useWalletClient } from "../hooks/useWalletClient";
import { useTontineWrite } from "../hooks/useTontineWrite";
import { publicClient } from "../../../blockchain/viem";

const EXPLORER_URL = typeof import.meta.env.VITE_PLASMA_EXPLORER_URL === "string" && import.meta.env.VITE_PLASMA_EXPLORER_URL
  ? import.meta.env.VITE_PLASMA_EXPLORER_URL
  : "https://testnet.plasmascan.to";

type JoinTontineProps = {
  tontineId: number;
  onSuccess?: () => void;
};

export function JoinTontine({ tontineId, onSuccess }: JoinTontineProps) {
  const { toast } = useTontineToast();
  const { walletAddress } = useUser();
  const walletClient = useWalletClient();
  const { joinTontine, txState, txError, resetTx } = useTontineWrite(walletClient);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [isMining, setIsMining] = useState(false);

  // Wait for transaction receipt when hash is available
  useEffect(() => {
    if (!txHash) return;
    
    setIsMining(true);
    const waitForReceipt = async () => {
      try {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        setIsMining(false);
        toast("Vous avez rejoint la tontine avec succès!", "success");
        onSuccess?.();
      } catch (err) {
        setIsMining(false);
        console.error("Error waiting for receipt:", err);
        toast("Erreur lors de la confirmation de la transaction", "error");
      }
    };
    
    waitForReceipt();
  }, [txHash, toast, onSuccess]);

  const handleJoin = useCallback(async () => {
    if (!walletAddress || !walletClient) {
      toast("Connectez votre wallet pour rejoindre une tontine.", "error");
      return;
    }

    resetTx();
    setTxHash(null);
    setIsMining(false);

    try {
      const result = await joinTontine(tontineId);
      
      if (result?.hash) {
        setTxHash(result.hash);
      } else {
        toast(txError || "Erreur lors de la jointure", "error");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast(msg || "Erreur lors de la jointure", "error");
    }
  }, [walletAddress, walletClient, tontineId, joinTontine, txError, resetTx, toast]);

  const isLoading = txState === "confirming" || isMining;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleJoin}
        disabled={isLoading || !walletClient || !walletAddress}
        className="w-full py-3 rounded-xl font-semibold text-white bg-[#295c4f] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {txState === "confirming" ? "Confirmez dans votre wallet…" : isMining ? "⏳ Mining…" : "Rejoindre la tontine"}
      </button>

      {txHash && (
        <div className="rounded-xl border-2 border-[#295c4f] bg-[#295c4f]/5 p-4 space-y-2">
          <p className="text-sm font-semibold text-[#295c4f]">
            {isMining ? "Transaction en cours de minage…" : "Transaction confirmée!"}
          </p>
          <a
            href={`${EXPLORER_URL}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-[#295c4f] hover:underline break-all"
          >
            Voir sur l'explorateur: {txHash.slice(0, 10)}…{txHash.slice(-8)}
          </a>
        </div>
      )}

      {txError && (
        <p className="text-sm text-[#ef4444] text-center">{txError}</p>
      )}

      {!walletAddress && (
        <p className="text-sm text-[#4a4a4a] text-center">Connectez votre wallet pour rejoindre.</p>
      )}
    </div>
  );
}

