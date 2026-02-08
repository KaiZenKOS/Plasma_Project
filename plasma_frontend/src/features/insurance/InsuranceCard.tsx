import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useUser } from "../../context/UserContext";
import { useWalletClient } from "../tontine/hooks/useWalletClient";
import { useTontineToast } from "../tontine/context/ToastContext";
import { publicClient } from "../../blockchain/viem";
import {
  INSURANCE_CONTRACT_ADDRESS,
  INSURANCE_USDT_ADDRESS,
  INSURANCE_SERVICE_ABI,
  ERC20_ABI,
  USDT_DECIMALS,
} from "../../blockchain/insuranceService";
import { useUsdtBalance } from "../../hooks/useUsdtBalance";

const EXPLORER_URL = typeof import.meta.env.VITE_PLASMA_EXPLORER_URL === "string" && import.meta.env.VITE_PLASMA_EXPLORER_URL
  ? import.meta.env.VITE_PLASMA_EXPLORER_URL
  : "https://testnet.plasmascan.to";

enum PolicyStatus {
  Active = 0,
  Claimed = 1,
}

type Policy = {
  id: number;
  tontineId: number;
  premiumPaid: string; // Formatted USDT
  status: PolicyStatus;
  purchasedAt: number;
};

function getStatusBadge(status: PolicyStatus) {
  switch (status) {
    case PolicyStatus.Active:
      return { label: "Active", className: "bg-green-100 text-green-800" };
    case PolicyStatus.Claimed:
      return { label: "Claimed", className: "bg-gray-100 text-gray-800" };
    default:
      return { label: "Unknown", className: "bg-gray-100 text-gray-800" };
  }
}

export function InsuranceCard() {
  const { walletAddress } = useUser();
  const walletClient = useWalletClient();
  const { toast } = useTontineToast();
  const { balance: usdtBalance, reload: reloadBalance } = useUsdtBalance(walletAddress);

  const [tontineId, setTontineId] = useState("");
  const [premiumAmount, setPremiumAmount] = useState<string | null>(null);
  const [loadingPremium, setLoadingPremium] = useState(false);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);

  const [approving, setApproving] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  // Load premium amount from contract
  const loadPremiumAmount = useCallback(async () => {
    if (!INSURANCE_CONTRACT_ADDRESS) {
      setPremiumAmount(null);
      return;
    }

    setLoadingPremium(true);
    try {
      const premium = await publicClient.readContract({
        address: INSURANCE_CONTRACT_ADDRESS,
        abi: INSURANCE_SERVICE_ABI,
        functionName: "getPremiumAmount",
      });

      setPremiumAmount(formatUnits(premium as bigint, USDT_DECIMALS));
    } catch (err) {
      console.error("Error loading premium:", err);
      setPremiumAmount(null);
    } finally {
      setLoadingPremium(false);
    }
  }, []);

  // Load user's policies
  const loadPolicies = useCallback(async () => {
    if (!INSURANCE_CONTRACT_ADDRESS || !walletAddress) {
      setPolicies([]);
      return;
    }

    setLoadingPolicies(true);
    try {
      const policyCount = await publicClient.readContract({
        address: INSURANCE_CONTRACT_ADDRESS,
        abi: INSURANCE_SERVICE_ABI,
        functionName: "userPolicyCount",
        args: [walletAddress as `0x${string}`],
      });

      const count = Number(policyCount);
      const policyList: Policy[] = [];

      for (let i = 0; i < count; i++) {
        try {
          const policyId = await publicClient.readContract({
            address: INSURANCE_CONTRACT_ADDRESS,
            abi: INSURANCE_SERVICE_ABI,
            functionName: "userPolicies",
            args: [walletAddress as `0x${string}`, BigInt(i)],
          });

          const [policyHolder, tontineId, premiumPaid, status, purchasedAt] = await publicClient.readContract({
            address: INSURANCE_CONTRACT_ADDRESS,
            abi: INSURANCE_SERVICE_ABI,
            functionName: "getPolicy",
            args: [policyId as bigint],
          });

          policyList.push({
            id: Number(policyId),
            tontineId: Number(tontineId as bigint),
            premiumPaid: formatUnits(premiumPaid as bigint, USDT_DECIMALS),
            status: Number(status) as PolicyStatus,
            purchasedAt: Number(purchasedAt as bigint),
          });
        } catch (err) {
          console.error(`Error loading policy ${i}:`, err);
        }
      }

      setPolicies(policyList.reverse()); // Most recent first
    } catch (err) {
      console.error("Error loading policies:", err);
      setPolicies([]);
    } finally {
      setLoadingPolicies(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadPremiumAmount();
  }, [loadPremiumAmount]);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  // Handle approve USDT
  const handleApprove = useCallback(async () => {
    if (!INSURANCE_CONTRACT_ADDRESS || !INSURANCE_USDT_ADDRESS || !walletClient?.account || !premiumAmount) {
      toast("Configuration manquante", "error");
      return;
    }

    const premiumWei = BigInt(Math.round(Number(premiumAmount) * 10 ** USDT_DECIMALS));

    setApproving(true);
    setTxHash(null);

    try {
      const approveHash = await walletClient.writeContract({
        address: INSURANCE_USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [INSURANCE_CONTRACT_ADDRESS, premiumWei],
        account: walletClient.account,
      });

      setTxHash(approveHash);
      toast(`Transaction envoyée au Plasma Network! Hash: ${approveHash.slice(0, 10)}…${approveHash.slice(-8)}`, "success");

      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      toast("Approbation USDT confirmée", "success");
      await reloadBalance();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'approbation";
      toast(msg, "error");
    } finally {
      setApproving(false);
    }
  }, [walletClient, premiumAmount, toast, reloadBalance]);

  // Handle purchase policy
  const handlePurchase = useCallback(async () => {
    if (!INSURANCE_CONTRACT_ADDRESS || !INSURANCE_USDT_ADDRESS || !walletClient?.account) {
      toast("Wallet ou contrat non configuré", "error");
      return;
    }

    const tontineIdNum = parseInt(tontineId, 10);
    if (!Number.isFinite(tontineIdNum) || tontineIdNum < 0) {
      toast("ID Tontine invalide", "error");
      return;
    }

    if (!premiumAmount) {
      toast("Montant de prime non disponible", "error");
      return;
    }

    // Check USDT balance
    const premiumNum = Number(premiumAmount);
    if (!usdtBalance || Number(usdtBalance) < premiumNum) {
      toast(`Solde USDT insuffisant. Requis: ${premiumNum.toFixed(2)} USDT, Disponible: ${Number(usdtBalance || 0).toFixed(2)} USDT`, "error");
      return;
    }

    // Check allowance
    try {
      const currentAllowance = await publicClient.readContract({
        address: INSURANCE_USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [walletClient.account.address, INSURANCE_CONTRACT_ADDRESS],
      });

      const premiumWei = BigInt(Math.round(premiumNum * 10 ** USDT_DECIMALS));
      if (currentAllowance < premiumWei) {
        toast("Veuillez d'abord approuver les USDT", "error");
        return;
      }
    } catch (err) {
      toast("Erreur lors de la vérification de l'approbation", "error");
      return;
    }

    setPurchasing(true);
    setTxHash(null);

    try {
      const purchaseHash = await walletClient.writeContract({
        address: INSURANCE_CONTRACT_ADDRESS,
        abi: INSURANCE_SERVICE_ABI,
        functionName: "purchasePolicy",
        args: [BigInt(tontineIdNum)],
        account: walletClient.account,
      });

      setTxHash(purchaseHash);
      toast(`Transaction envoyée au Plasma Network! Hash: ${purchaseHash.slice(0, 10)}…${purchaseHash.slice(-8)}`, "success");

      await publicClient.waitForTransactionReceipt({ hash: purchaseHash });
      toast("Police d'assurance achetée avec succès!", "success");

      // Trigger history refresh
      window.dispatchEvent(new CustomEvent("transaction-confirmed", { detail: { txHash: purchaseHash } }));

      // Clear form and reload
      setTontineId("");
      await loadPolicies();
      await reloadBalance();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'achat";
      toast(msg, "error");
    } finally {
      setPurchasing(false);
    }
  }, [walletClient, tontineId, premiumAmount, usdtBalance, toast, loadPolicies, reloadBalance]);

  if (!INSURANCE_CONTRACT_ADDRESS) {
    return (
      <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-6 text-center text-[#4a4a4a]">
        <p className="text-sm">Contrat Insurance non configuré (VITE_INSURANCE_CONTRACT_ADDRESS)</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Insurance Card */}
      <div className="rounded-2xl border border-[#e5e7eb] bg-[#FFFFFF] p-6 space-y-4">
        <h2 className="text-xl font-bold text-[#295c4f]" style={{ fontFamily: "Outfit, DM Sans, sans-serif" }}>
          Protect your Capital
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#4a4a4a] mb-2">
              Tontine ID to insure
            </label>
            <input
              type="number"
              min="0"
              value={tontineId}
              onChange={(e) => setTontineId(e.target.value)}
              placeholder="Ex: 0, 1, 2..."
              className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-[#1a1a1a] outline-none focus:border-[#295c4f]"
            />
          </div>

          <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
            <p className="text-sm text-[#4a4a4a] mb-1">Premium Cost</p>
            {loadingPremium ? (
              <p className="text-lg font-bold text-[#295c4f]">Chargement…</p>
            ) : premiumAmount ? (
              <p className="text-lg font-bold text-[#295c4f]">
                {Number(premiumAmount).toFixed(2)} USDT
              </p>
            ) : (
              <p className="text-sm text-[#ef4444]">Impossible de charger le montant de prime</p>
            )}
          </div>

          {usdtBalance && (
            <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
              <p className="text-xs text-[#4a4a4a]">
                Solde USDT: <strong className="text-[#295c4f]">{Number(usdtBalance).toFixed(2)} USDT</strong>
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleApprove}
              disabled={approving || !walletClient || !premiumAmount}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50"
            >
              {approving ? "Approbation…" : "Approve"}
            </button>

            <button
              type="button"
              onClick={handlePurchase}
              disabled={purchasing || !walletClient || !tontineId || !premiumAmount}
              className="flex-1 py-3 rounded-xl bg-[#295c4f] text-white font-semibold disabled:opacity-50"
            >
              {purchasing ? "Achat…" : "Buy Policy"}
            </button>
          </div>

          {txHash && (
            <div className="rounded-xl border-2 border-[#295c4f] bg-[#295c4f]/5 p-4">
              <p className="text-sm font-semibold text-[#295c4f] mb-2">Transaction envoyée!</p>
              <a
                href={`${EXPLORER_URL}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#295c4f] hover:underline break-all"
              >
                Voir sur l'explorateur: {txHash.slice(0, 10)}…{txHash.slice(-8)}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* My Policies */}
      <div className="rounded-2xl border border-[#e5e7eb] bg-[#FFFFFF] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#295c4f]" style={{ fontFamily: "Outfit, DM Sans, sans-serif" }}>
            My Policies
          </h3>
          <button
            type="button"
            onClick={loadPolicies}
            disabled={loadingPolicies}
            className="text-sm text-[#295c4f] hover:underline disabled:opacity-50"
          >
            {loadingPolicies ? "Chargement…" : "Actualiser"}
          </button>
        </div>

        {!walletAddress ? (
          <p className="text-sm text-[#4a4a4a] text-center">Connectez votre wallet pour voir vos polices</p>
        ) : loadingPolicies ? (
          <div className="flex items-center justify-center py-8 text-[#4a4a4a]">
            <div className="animate-pulse text-sm">Chargement des polices…</div>
          </div>
        ) : policies.length === 0 ? (
          <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-8 text-center text-[#4a4a4a]">
            <p className="text-sm">Aucune police d'assurance</p>
            <p className="text-xs mt-1">Achetez une police pour protéger votre participation</p>
          </div>
        ) : (
          <div className="space-y-3">
            {policies.map((policy) => {
              const badge = getStatusBadge(policy.status);
              const purchaseDate = new Date(policy.purchasedAt * 1000).toLocaleDateString("fr-FR");

              return (
                <div
                  key={policy.id}
                  className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[#1a1a1a]">Policy #{policy.id}</p>
                      <p className="text-xs text-[#4a4a4a]">Tontine ID: {policy.tontineId}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="text-sm text-[#4a4a4a] space-y-1">
                    <p>
                      <strong className="text-[#1a1a1a]">Prime payée:</strong> {policy.premiumPaid} USDT
                    </p>
                    <p>
                      <strong className="text-[#1a1a1a]">Achetée le:</strong> {purchaseDate}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

