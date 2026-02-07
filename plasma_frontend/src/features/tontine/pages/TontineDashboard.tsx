import { Banknote, CircleDot, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { getUserScore } from "../../../api/core";
import { getTontineGroup } from "../../../api/tontine";
import type { TontineGroupDetail } from "../../../api/types";
import { useUser } from "../../../context/UserContext";
import { useTontineToast } from "../context/ToastContext";
import { useTontineChain } from "../hooks/useTontineChain";
import { useTontineWrite } from "../hooks/useTontineWrite";
import { useWalletClient } from "../hooks/useWalletClient";

const USDT_DECIMALS = 6;

type TontineDashboardProps = {
  groupId: string;
  onBack: () => void;
};

export function TontineDashboard({ groupId, onBack }: TontineDashboardProps) {
  const { walletAddress } = useUser();
  const { toast } = useTontineToast();
  const walletClient = useWalletClient();
  const [detail, setDetail] = useState<TontineGroupDetail | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  const contractId = detail?.contract_tontine_id ?? null;
  const chain = useTontineChain({
    tontineId: contractId,
    userAddress: walletAddress,
  });
  const { payContribution, withdraw, txState, txError, resetTx } = useTontineWrite(walletClient);

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    try {
      const d = await getTontineGroup(groupId);
      setDetail(d);
    } catch {
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!walletAddress) return;
    getUserScore(walletAddress)
      .then((r) => setScore(r.score))
      .catch(() => setScore(null));
  }, [walletAddress]);

  const contributionAmount = chain.group?.contributionAmount ?? 0n;
  const contributionFormatted = Number(formatUnits(contributionAmount, USDT_DECIMALS));
  const isCurrentBeneficiary =
    chain.currentBeneficiary?.toLowerCase() === walletAddress?.toLowerCase();
  const hasPendingWithdrawal =
    chain.pendingWithdrawal != null && Number(chain.pendingWithdrawal) > 0;
  const dueTimestamp = chain.group ? Number(chain.group.nextDueAt) * 1000 : 0;
  const isPaymentDue = chain.isMember && dueTimestamp > 0 && Date.now() >= dueTimestamp - 60 * 60 * 1000;

  const handlePay = useCallback(async () => {
    if (contractId == null) {
      toast("No contract linked to this group", "error");
      return;
    }
    resetTx();
    const result = await payContribution(contractId);
    if (result?.hash) {
      toast("Contribution paid", "success");
      chain.reload();
    } else if (txError) toast(txError, "error");
  }, [contractId, payContribution, resetTx, txError, toast, chain]);

  const handleClaim = useCallback(async () => {
    resetTx();
    const result = await withdraw();
    if (result?.hash) {
      toast("Pot claimed", "success");
      chain.reload();
    } else if (txError) toast(txError, "error");
  }, [withdraw, resetTx, txError, toast, chain]);

  if (loadingDetail || !detail) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
        <header className="flex items-center gap-4 px-6 py-6 border-b border-[#e5e7eb]">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl border border-[#e5e7eb] text-[#4a4a4a]"
          >
            ← Back
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center text-[#4a4a4a]">
          {loadingDetail ? "Loading…" : "Group not found"}
        </div>
      </div>
    );
  }

  const members = chain.members.length > 0 ? chain.members : detail.members.map((m) => m.wallet_address as `0x${string}`);
  const totalSaved = chain.memberCount * contributionFormatted;

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <header className="flex items-center justify-between px-6 py-6 border-b border-[#e5e7eb]">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl border border-[#e5e7eb] text-[#4a4a4a]"
        >
          ← Back
        </button>
        <h1 className="text-lg font-bold text-[#295c4f]" style={{ fontFamily: "Outfit, DM Sans, sans-serif" }}>
          {detail.name ?? "Tontine"}
        </h1>
        <div className="w-12" />
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-8 space-y-10">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
            <p className="text-xs text-[#4a4a4a]">Total saved (cycle)</p>
            <p className="text-xl font-bold text-[#295c4f]">
              ${totalSaved.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDT
            </p>
          </div>
          <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
            <p className="text-xs text-[#4a4a4a]">Reliability score</p>
            <p className="text-xl font-bold text-[#295c4f]">{score ?? "—"}</p>
          </div>
        </div>

        {/* Cycle view: circle of members */}
        <div>
          <h2 className="text-sm font-semibold text-[#4a4a4a] mb-4">Cycle</h2>
          <div className="flex justify-center">
            <div className="relative w-64 h-64">
              {members.map((addr, i) => {
                const isBeneficiary = chain.currentBeneficiary?.toLowerCase() === addr.toLowerCase();
                const angle = (i / members.length) * 2 * Math.PI - Math.PI / 2;
                const r = 100;
                const x = 128 + r * Math.cos(angle);
                const y = 128 + r * Math.sin(angle);
                return (
                  <div
                    key={addr}
                    className="absolute flex items-center justify-center rounded-full border-2 text-[10px] font-medium w-10 h-10 -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: x,
                      top: y,
                      backgroundColor: isBeneficiary ? "#295c4f" : "#FFFFFF",
                      color: isBeneficiary ? "#FFFFFF" : "#1a1a1a",
                      borderColor: isBeneficiary ? "#295c4f" : "#569f8c",
                    }}
                    title={addr}
                  >
                    {i + 1}
                  </div>
                );
              })}
              <div className="absolute inset-0 flex items-center justify-center">
                <CircleDot className="size-8 text-[#569f8c]/40" />
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-[#4a4a4a] mt-2">
            Current beneficiary: {chain.currentBeneficiary
              ? `${chain.currentBeneficiary.slice(0, 6)}…${chain.currentBeneficiary.slice(-4)}`
              : "—"}
          </p>
        </div>

        {/* Action center */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#4a4a4a]">Actions</h2>

          <button
            type="button"
            onClick={handlePay}
            disabled={!chain.isMember || txState === "confirming" || !walletClient}
            className="w-full flex items-center justify-center gap-2 py-5 rounded-2xl font-bold text-white bg-[#295c4f] disabled:opacity-50"
          >
            <Banknote className="size-5" />
            {txState === "confirming" ? "Confirm in wallet…" : "Pay Contribution"}
            {contributionFormatted > 0 && ` ($${contributionFormatted.toFixed(2)} USDT)`}
          </button>

          <button
            type="button"
            onClick={handleClaim}
            disabled={!hasPendingWithdrawal || txState === "confirming" || !walletClient}
            className="w-full flex items-center justify-center gap-2 py-5 rounded-2xl font-bold border-2 border-[#295c4f] text-[#295c4f] disabled:opacity-50"
          >
            <Banknote className="size-5" />
            Claim Pot
            {chain.pendingWithdrawal && ` ($${Number(chain.pendingWithdrawal).toFixed(2)} USDT)`}
          </button>

          {!walletClient && (
            <p className="text-sm text-[#4a4a4a] text-center">
              Connect your wallet to pay or claim.
            </p>
          )}
        </div>

        {/* Members list */}
        <div>
          <h2 className="text-sm font-semibold text-[#4a4a4a] mb-3 flex items-center gap-2">
            <Users className="size-4" />
            Members
          </h2>
          <div className="space-y-2">
            {(members.length ? members : detail.members.map((m) => m.wallet_address)).map((addr, i) => {
              const isBeneficiary = chain.currentBeneficiary?.toLowerCase() === addr.toLowerCase();
              const isMe = addr.toLowerCase() === walletAddress?.toLowerCase();
              return (
                <div
                  key={addr}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                    isBeneficiary ? "border-[#295c4f] bg-[#295c4f]/5" : "border-[#e5e7eb] bg-[#f8fafc]"
                  }`}
                >
                  <span className="text-sm font-medium text-[#1a1a1a]">
                    {addr.slice(0, 6)}…{addr.slice(-4)}
                    {isMe && " (you)"}
                  </span>
                  <span className={`text-xs font-semibold ${isBeneficiary ? "text-[#295c4f]" : "text-[#4a4a4a]"}`}>
                    {isBeneficiary ? "Current beneficiary" : `Turn ${i + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
