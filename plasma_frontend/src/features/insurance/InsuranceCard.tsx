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
import { getInsurances, registerInsurance } from "../../api/insurance";

const EXPLORER_URL = typeof import.meta.env.VITE_PLASMA_EXPLORER_URL === "string" && import.meta.env.VITE_PLASMA_EXPLORER_URL
  ? import.meta.env.VITE_PLASMA_EXPLORER_URL
  : "https://testnet.plasmascan.to";

/** Fixed premium cost in USDT (1 USD). */
const PREMIUM_USDT = "1";
const PREMIUM_WEI = BigInt(1 * 10 ** 6); // 1 USDT, 6 decimals

enum PolicyStatus {
  Active = 0,
  Claimed = 1,
}

type Policy = {
  id: number;
  tontineId: number;
  coverageAmount: string;
  premiumPaid: string;
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
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);

  const [approving, setApproving] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [claimingPolicyId, setClaimingPolicyId] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  // Premium is fixed at 1 USDT
  const premiumAmount = PREMIUM_USDT;

  // Load user's policies from backend JSON (fallback to chain if API unavailable)
  const loadPolicies = useCallback(async () => {
    if (!walletAddress) {
      setPolicies([]);
      return;
    }

    setLoadingPolicies(true);
    try {
      const records = await getInsurances(walletAddress);
      const policyList: Policy[] = records.map((r) => ({
        id: r.policyId,
        tontineId: r.tontineId,
        coverageAmount: r.coverageAmount,
        premiumPaid: r.premiumPaid,
        status: r.active ? PolicyStatus.Active : PolicyStatus.Claimed,
        purchasedAt: r.purchasedAt,
      }));
      setPolicies(policyList.reverse());
    } catch {
      // Fallback: load from chain if backend unreachable
      if (!INSURANCE_CONTRACT_ADDRESS) {
        setPolicies([]);
        return;
      }
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
            const [, tontineId, coverageAmount, premiumPaid, active, purchasedAt] = await publicClient.readContract({
              address: INSURANCE_CONTRACT_ADDRESS,
              abi: INSURANCE_SERVICE_ABI,
              functionName: "getPolicy",
              args: [policyId as bigint],
            });
            policyList.push({
              id: Number(policyId),
              tontineId: Number(tontineId as bigint),
              coverageAmount: formatUnits(coverageAmount as bigint, USDT_DECIMALS),
              premiumPaid: formatUnits(premiumPaid as bigint, USDT_DECIMALS),
              status: active ? PolicyStatus.Active : PolicyStatus.Claimed,
              purchasedAt: Number(purchasedAt as bigint),
            });
          } catch (err) {
            console.error(`Error loading policy ${i}:`, err);
          }
        }
        setPolicies(policyList.reverse());
      } catch (err) {
        console.error("Error loading policies:", err);
        setPolicies([]);
      }
    } finally {
      setLoadingPolicies(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  // Handle approve USDT
  const handleApprove = useCallback(async () => {
    if (!INSURANCE_CONTRACT_ADDRESS || !INSURANCE_USDT_ADDRESS || !walletClient?.account) {
      toast("Missing configuration", "error");
      return;
    }

    setApproving(true);
    setTxHash(null);

    try {
      const approveHash = await walletClient.writeContract({
        address: INSURANCE_USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [INSURANCE_CONTRACT_ADDRESS, PREMIUM_WEI],
        account: walletClient.account,
      });

      setTxHash(approveHash);
      toast(`Transaction envoyée au Plasma Network! Hash: ${approveHash.slice(0, 10)}…${approveHash.slice(-8)}`, "success");

      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      toast("Approbation USDT confirmée", "success");
      await reloadBalance();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error during approval";
      toast(msg, "error");
    } finally {
      setApproving(false);
    }
  }, [walletClient, toast, reloadBalance]);

  // Handle purchase policy
  const handlePurchase = useCallback(async () => {
    if (!INSURANCE_CONTRACT_ADDRESS || !INSURANCE_USDT_ADDRESS || !walletClient?.account) {
      toast("Wallet or contract not configured", "error");
      return;
    }

    const tontineIdNum = parseInt(tontineId, 10);
    if (!Number.isFinite(tontineIdNum) || tontineIdNum < 0) {
      toast("Invalid Tontine ID", "error");
      return;
    }

    // Check USDT balance (premium is 1 USDT)
    const premiumNum = Number(PREMIUM_USDT);
    if (!usdtBalance || Number(usdtBalance) < premiumNum) {
      toast(`Insufficient USDT balance. Required: ${premiumNum.toFixed(2)} USDT, Available: ${Number(usdtBalance || 0).toFixed(2)} USDT`, "error");
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

      if (currentAllowance < PREMIUM_WEI) {
        toast("Please approve USDT first", "error");
        return;
      }
    } catch (err) {
      toast("Error checking allowance", "error");
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
      toast(`Transaction sent on Plasma Network. Hash: ${purchaseHash.slice(0, 10)}…${purchaseHash.slice(-8)}`, "success");

      await publicClient.waitForTransactionReceipt({ hash: purchaseHash });
      toast("Insurance policy purchased successfully.", "success");

      // Register policy in backend JSON for display
      try {
        const count = await publicClient.readContract({
          address: INSURANCE_CONTRACT_ADDRESS,
          abi: INSURANCE_SERVICE_ABI,
          functionName: "userPolicyCount",
          args: [walletClient.account.address],
        });
        const newPolicyId = await publicClient.readContract({
          address: INSURANCE_CONTRACT_ADDRESS,
          abi: INSURANCE_SERVICE_ABI,
          functionName: "userPolicies",
          args: [walletClient.account.address, BigInt(Number(count) - 1)],
        });
        const [, tontineIdRes, coverageAmount, premiumPaid, active, purchasedAt] = await publicClient.readContract({
          address: INSURANCE_CONTRACT_ADDRESS,
          abi: INSURANCE_SERVICE_ABI,
          functionName: "getPolicy",
          args: [newPolicyId as bigint],
        });
        await registerInsurance({
          walletAddress: walletClient.account.address,
          policyId: Number(newPolicyId),
          tontineId: Number(tontineIdRes as bigint),
          coverageAmount: formatUnits(coverageAmount as bigint, USDT_DECIMALS),
          premiumPaid: formatUnits(premiumPaid as bigint, USDT_DECIMALS),
          active: Boolean(active),
          purchasedAt: Number(purchasedAt as bigint),
          txHash: purchaseHash,
        });
      } catch (e) {
        console.warn("Could not register insurance in backend:", e);
      }

      // Trigger history refresh
      window.dispatchEvent(new CustomEvent("transaction-confirmed", { detail: { txHash: purchaseHash } }));

      // Clear form and reload
      setTontineId("");
      await loadPolicies();
      await reloadBalance();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error purchasing policy";
      toast(msg, "error");
    } finally {
      setPurchasing(false);
    }
  }, [walletClient, tontineId, usdtBalance, toast, loadPolicies, reloadBalance]);

  const handleClaim = useCallback(async (policyId: number) => {
    if (!INSURANCE_CONTRACT_ADDRESS || !walletClient?.account) {
      toast("Wallet or contract not configured", "error");
      return;
    }
    setClaimingPolicyId(policyId);
    setTxHash(null);
    try {
      const hash = await walletClient.writeContract({
        address: INSURANCE_CONTRACT_ADDRESS,
        abi: INSURANCE_SERVICE_ABI,
        functionName: "claimPolicy",
        args: [BigInt(policyId)],
        account: walletClient.account,
      });
      setTxHash(hash);
      toast(`Transaction sent on Plasma Network. Hash: ${hash.slice(0, 10)}…${hash.slice(-8)}`, "success");
      await publicClient.waitForTransactionReceipt({ hash });
      toast("Policy claimed successfully.", "success");
      window.dispatchEvent(new CustomEvent("transaction-confirmed", { detail: { txHash: hash } }));
      await loadPolicies();
      await reloadBalance();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error claiming policy";
      toast(msg, "error");
    } finally {
      setClaimingPolicyId(null);
    }
  }, [walletClient, toast, loadPolicies, reloadBalance]);

  if (!INSURANCE_CONTRACT_ADDRESS) {
    return (
      <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-6 text-center text-[#4a4a4a]">
        <p className="text-sm">Insurance contract not configured (VITE_INSURANCE_CONTRACT_ADDRESS)</p>
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
            <p className="text-lg font-bold text-[#295c4f]">1.00 USDT</p>
          </div>

          {usdtBalance && (
            <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
              <p className="text-xs text-[#4a4a4a]">
                USDT balance: <strong className="text-[#295c4f]">{Number(usdtBalance).toFixed(2)} USDT</strong>
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleApprove}
              disabled={approving || !walletClient}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50"
            >
              {approving ? "Approving…" : "Approve"}
            </button>

            <button
              type="button"
              onClick={handlePurchase}
              disabled={purchasing || !walletClient || !tontineId}
              className="flex-1 py-3 rounded-xl bg-[#295c4f] text-white font-semibold disabled:opacity-50"
            >
              {purchasing ? "Purchasing…" : "Buy Policy"}
            </button>
          </div>

          {txHash && (
            <div className="rounded-xl border-2 border-[#295c4f] bg-[#295c4f]/5 p-4">
              <p className="text-sm font-semibold text-[#295c4f] mb-2">Transaction sent!</p>
              <a
                href={`${EXPLORER_URL}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#295c4f] hover:underline break-all"
              >
                View on explorer: {txHash.slice(0, 10)}…{txHash.slice(-8)}
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
            {loadingPolicies ? "Loading…" : "Refresh"}
          </button>
        </div>

        {!walletAddress ? (
          <p className="text-sm text-[#4a4a4a] text-center">Connect your wallet to see your policies</p>
        ) : loadingPolicies ? (
          <div className="flex items-center justify-center py-8 text-[#4a4a4a]">
            <div className="animate-pulse text-sm">Loading policies…</div>
          </div>
        ) : policies.length === 0 ? (
          <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-8 text-center text-[#4a4a4a]">
            <p className="text-sm">No insurance policies</p>
            <p className="text-xs mt-1">Buy a policy to protect your tontine participation</p>
          </div>
        ) : (
          <div className="space-y-3">
            {policies.map((policy) => {
              const badge = getStatusBadge(policy.status);
              const purchaseDate = new Date(policy.purchasedAt * 1000).toLocaleDateString("en-US");

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
                      <strong className="text-[#1a1a1a]">Coverage:</strong> {policy.coverageAmount} USDT
                    </p>
                    <p>
                      <strong className="text-[#1a1a1a]">Premium paid:</strong> {policy.premiumPaid} USDT
                    </p>
                    <p>
                      <strong className="text-[#1a1a1a]">Purchased:</strong> {purchaseDate}
                    </p>
                    {policy.status === PolicyStatus.Active && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClaim(policy.id); }}
                        disabled={claimingPolicyId === policy.id}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-[#295c4f] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                      >
                        {claimingPolicyId === policy.id ? "Claiming…" : "Claim"}
                      </button>
                    )}
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

