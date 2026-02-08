import { useCallback, useState, useEffect } from "react";
import { Unlock, CheckCircle, Loader2 } from "lucide-react";
import { useUser } from "../../../context/UserContext";
import { useTontineToast } from "../context/ToastContext";
import { useWalletClient } from "../hooks/useWalletClient";
import { useTontineWrite } from "../hooks/useTontineWrite";
import { useUsdtAllowance } from "../hooks/useUsdtAllowance";
import { publicClient } from "../../../blockchain/viem";
import { TONTINE_ABI } from "../abi";
import { TONTINE_CONTRACT_ADDRESS, USDT_DECIMALS } from "../config";
import { formatUnits, parseUnits } from "viem";

const EXPLORER_URL = typeof import.meta.env.VITE_PLASMA_EXPLORER_URL === "string" && import.meta.env.VITE_PLASMA_EXPLORER_URL
  ? import.meta.env.VITE_PLASMA_EXPLORER_URL
  : "https://testnet.plasmascan.to";

const USDT_ADDRESS =
  typeof import.meta.env.VITE_USDT_ADDRESS === "string" && import.meta.env.VITE_USDT_ADDRESS
    ? (import.meta.env.VITE_USDT_ADDRESS as `0x${string}`)
    : null;

const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

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
  const [contributionAmount, setContributionAmount] = useState<bigint | null>(null);
  const [loadingAmount, setLoadingAmount] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approveHash, setApproveHash] = useState<`0x${string}` | null>(null);

  // Fetch contribution amount from tontine
  useEffect(() => {
    if (!TONTINE_CONTRACT_ADDRESS || tontineId < 0) return;

    const loadAmount = async () => {
      setLoadingAmount(true);
      try {
        const groupData = await publicClient.readContract({
          address: TONTINE_CONTRACT_ADDRESS,
          abi: TONTINE_ABI,
          functionName: "tontineGroups",
          args: [BigInt(tontineId)],
        });

        const g = groupData as readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean];
        setContributionAmount(g[0]); // contributionAmount is first element
      } catch (err) {
        console.error("Error loading contribution amount:", err);
        setContributionAmount(null);
      } finally {
        setLoadingAmount(false);
      }
    };

    loadAmount();
  }, [tontineId]);

  // Check USDT allowance
  const { allowance, loading: allowanceLoading, reload: reloadAllowance } = useUsdtAllowance(
    walletAddress,
    TONTINE_CONTRACT_ADDRESS,
  );

  // Determine if approval is needed
  const needsApproval = allowance !== null && contributionAmount !== null && allowance < contributionAmount;
  const hasEnoughAllowance = allowance !== null && contributionAmount !== null && allowance >= contributionAmount;

  // Wait for approval transaction receipt
  useEffect(() => {
    if (!approveHash || !walletClient) return;

    const waitForApproval = async () => {
      try {
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        setApproving(false);
        toast("USDT approuvé avec succès!", "success");
        // Reload allowance to update UI
        await reloadAllowance();
        setApproveHash(null);
      } catch (err) {
        setApproving(false);
        console.error("Error waiting for approval receipt:", err);
        toast("Erreur lors de l'approbation", "error");
        setApproveHash(null);
      }
    };

    waitForApproval();
  }, [approveHash, walletClient, toast, reloadAllowance]);

  // Wait for transaction receipt when hash is available
  useEffect(() => {
    if (!txHash) return;
    
    setIsMining(true);
    const waitForReceipt = async () => {
      try {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        setIsMining(false);
        toast("Vous avez rejoint la tontine avec succès!", "success");
        // Trigger history refresh
        window.dispatchEvent(new CustomEvent("transaction-confirmed", { detail: { txHash } }));
        onSuccess?.();
      } catch (err) {
        setIsMining(false);
        console.error("Error waiting for receipt:", err);
        toast("Erreur lors de la confirmation de la transaction", "error");
      }
    };
    
    waitForReceipt();
  }, [txHash, toast, onSuccess]);

  // Handle USDT approval
  const handleApprove = useCallback(async () => {
    if (!USDT_ADDRESS || !TONTINE_CONTRACT_ADDRESS || !walletClient?.account || !contributionAmount) {
      toast("Configuration manquante ou montant invalide", "error");
      return;
    }

    setApproving(true);
    setApproveHash(null);

    try {
      const hash = await walletClient.writeContract({
        address: USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [TONTINE_CONTRACT_ADDRESS, contributionAmount],
        account: walletClient.account,
      });

      setApproveHash(hash);
      toast(`Approbation envoyée! Hash: ${hash.slice(0, 10)}…`, "success");
    } catch (err) {
      setApproving(false);
      const msg = err instanceof Error ? err.message : "Erreur lors de l'approbation";
      toast(msg, "error");
      setApproveHash(null);
    }
  }, [walletClient, contributionAmount, toast]);

  // Handle join tontine
  const handleJoin = useCallback(async () => {
    if (!walletAddress || !walletClient) {
      toast("Connectez votre wallet pour rejoindre une tontine.", "error");
      return;
    }

    if (needsApproval) {
      toast("Veuillez d'abord approuver l'utilisation de USDT", "error");
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
  }, [walletAddress, walletClient, tontineId, joinTontine, txError, resetTx, toast, needsApproval]);

  const isApproving = approving || approveHash !== null;
  const isJoining = txState === "confirming" || isMining;
  const canApprove = !isApproving && !isJoining && contributionAmount !== null && needsApproval;
  const canJoin = !isApproving && !isJoining && contributionAmount !== null && hasEnoughAllowance;

  const contributionFormatted = contributionAmount ? formatUnits(contributionAmount, USDT_DECIMALS) : "0.00";

  return (
    <div className="space-y-3">
      {/* Allowance Status */}
      {walletAddress && TONTINE_CONTRACT_ADDRESS && contributionAmount !== null && (
        <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-4 space-y-2">
          {allowanceLoading || loadingAmount ? (
            <p className="text-sm text-[#6b7280]">Vérification de l'approbation USDT...</p>
          ) : allowance !== null ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#4a4a4a]">Approbation USDT:</span>
                <span className={`text-sm font-semibold ${hasEnoughAllowance ? "text-[#10b981]" : "text-[#f59e0b]"}`}>
                  {formatUnits(allowance, USDT_DECIMALS)} / {contributionFormatted} USDT
                </span>
              </div>
              {needsApproval && (
                <p className="text-xs text-[#f59e0b]">
                  Approbation insuffisante. Approuvez d'abord l'utilisation de USDT.
                </p>
              )}
              {hasEnoughAllowance && (
                <p className="text-xs text-[#10b981] flex items-center gap-1">
                  <CheckCircle className="size-3" />
                  Approbation suffisante. Vous pouvez rejoindre la tontine.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-[#6b7280]">Impossible de vérifier l'approbation USDT</p>
          )}
        </div>
      )}

      {/* Smart Button: Approve or Join */}
      {needsApproval ? (
        <button
          type="button"
          onClick={handleApprove}
          disabled={!canApprove || !walletClient || !walletAddress}
          className="w-full py-3 rounded-xl font-semibold text-white bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isApproving ? (
            <>
              <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Approbation en cours...
            </>
          ) : (
            <>
              <Unlock className="size-5" />
              🔓 Unlock USDT ({contributionFormatted} USDT)
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleJoin}
          disabled={!canJoin || !walletClient || !walletAddress || loadingAmount}
          className="w-full py-3 rounded-xl font-semibold text-white bg-[#295c4f] hover:bg-[#1f4a3f] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isJoining ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              {txState === "confirming" ? "Confirmez dans votre wallet…" : isMining ? "Mining…" : "Traitement..."}
            </>
          ) : (
            <>
              <CheckCircle className="size-5" />
              Rejoindre la tontine
            </>
          )}
        </button>
      )}

      {approveHash && (
        <div className="rounded-xl border-2 border-[#f59e0b] bg-[#f59e0b]/5 p-4 space-y-2">
          <p className="text-sm font-semibold text-[#f59e0b]">Approbation envoyée!</p>
          <a
            href={`${EXPLORER_URL}/tx/${approveHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-[#f59e0b] hover:underline break-all"
          >
            Voir sur l'explorateur: {approveHash.slice(0, 10)}…{approveHash.slice(-8)}
          </a>
          <p className="text-xs text-[#6b7280]">En attente de confirmation...</p>
        </div>
      )}

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
