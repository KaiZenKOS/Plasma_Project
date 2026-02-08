import { Banknote, CircleDot, Lock, Unlock, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { getUserScore } from "../../../api/core";
import { getTontineGroup, getEscrowTransactions, signTontineGroup, executeTontineTurn, getTontinePayouts, getTontineDepositBalance } from "../../../api/tontine";
import type { TontineGroupDetail, EscrowTransaction } from "../../../api/types";
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
  const { payContribution, withdraw, releaseFunds, txState, txError, resetTx } = useTontineWrite(walletClient);
  const [escrowList, setEscrowList] = useState<EscrowTransaction[]>([]);
  const [payouts, setPayouts] = useState<Array<{ id: string; tx_hash: string; block_number: number | null; to_address: string; amount: string; created_at: string }>>([]);
  const [depositBalance, setDepositBalance] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [executingTurn, setExecutingTurn] = useState(false);

  const explorerUrl = typeof import.meta.env.VITE_PLASMA_EXPLORER_URL === "string" && import.meta.env.VITE_PLASMA_EXPLORER_URL
    ? import.meta.env.VITE_PLASMA_EXPLORER_URL
    : "https://testnet.plasmascan.to";

  const isSimpleTontine = contractId == null;
  const creatorWallet = detail?.members?.find((m) => m.turn_position === 0)?.wallet_address ?? "";
  const isCreator = creatorWallet?.toLowerCase() === walletAddress?.toLowerCase();
  const currentTurnIndex = detail?.current_turn_index ?? 0;
  const simpleMembers = detail?.members?.map((m) => m.wallet_address) ?? [];
  const simpleCurrentBeneficiary = simpleMembers[currentTurnIndex] ?? null;

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
    if (!groupId || !isSimpleTontine) return;
    getTontinePayouts(groupId)
      .then(setPayouts)
      .catch(() => setPayouts([]));
  }, [groupId, isSimpleTontine, detail?.current_turn_index]);

  useEffect(() => {
    if (!groupId || !detail?.deposit_wallet_address) return;
    getTontineDepositBalance(groupId)
      .then((r) => setDepositBalance(r.balanceFormatted))
      .catch(() => setDepositBalance("0"));
  }, [groupId, detail?.deposit_wallet_address, detail?.current_turn_index]);

  useEffect(() => {
    if (!walletAddress) return;
    getEscrowTransactions(walletAddress)
      .then(setEscrowList)
      .catch(() => setEscrowList([]));
  }, [walletAddress]);

  useEffect(() => {
    if (!walletAddress) return;
    getUserScore(walletAddress)
      .then((r) => setScore(r.score))
      .catch(() => setScore(null));
  }, [walletAddress]);

  const contributionAmount = chain.group?.contributionAmount ?? 0n;
  const contributionFormattedFromChain = Number(formatUnits(contributionAmount, USDT_DECIMALS));
  const contributionFormatted = isSimpleTontine && detail?.contribution_amount != null
    ? Number(detail.contribution_amount) / 10 ** USDT_DECIMALS
    : contributionFormattedFromChain;
  const members = isSimpleTontine && simpleMembers.length > 0
    ? simpleMembers
    : chain.members.length > 0
      ? chain.members
      : detail?.members?.map((m) => m.wallet_address) ?? [];
  const currentBeneficiaryAddr = isSimpleTontine ? simpleCurrentBeneficiary : (chain.currentBeneficiary ?? null);
  const isCurrentBeneficiary = currentBeneficiaryAddr?.toLowerCase() === walletAddress?.toLowerCase();
  const hasPendingWithdrawal =
    chain.pendingWithdrawal != null && Number(chain.pendingWithdrawal) > 0;
  const dueTimestamp = chain.group ? Number(chain.group.nextDueAt) * 1000 : 0;
  const isPaymentDue = chain.isMember && dueTimestamp > 0 && Date.now() >= dueTimestamp - 60 * 60 * 1000;

  const lockedAsWinner = escrowList.filter(
    (e) => e.status === "LOCKED" && e.winner_address.toLowerCase() === walletAddress?.toLowerCase(),
  );
  const lockedAsProvider = escrowList.filter(
    (e) => e.status === "LOCKED" && e.beneficiary.toLowerCase() === walletAddress?.toLowerCase(),
  );

  const handleReleaseFunds = useCallback(
    async (escrow: EscrowTransaction) => {
      const escrowId = escrow.contract_id != null ? Number(escrow.contract_id) : NaN;
      if (Number.isNaN(escrowId)) {
        toast("Escrow has no on-chain id", "error");
        return;
      }
      resetTx();
      const result = await releaseFunds(escrowId);
      if (result?.hash) {
        toast("Funds released to provider", "success");
        getEscrowTransactions(walletAddress!).then(setEscrowList);
      } else if (txError) toast(txError, "error");
    },
    [releaseFunds, resetTx, txError, toast, walletAddress],
  );

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

  const handleSign = useCallback(async () => {
    if (!groupId || !walletAddress) return;
    setSigning(true);
    try {
      await signTontineGroup(groupId, walletAddress);
      toast("Tontine signée et activée.", "success");
      loadDetail();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur", "error");
    } finally {
      setSigning(false);
    }
  }, [groupId, walletAddress, toast, loadDetail]);

  const handleExecuteTurn = useCallback(async () => {
    if (!groupId) return;
    setExecutingTurn(true);
    try {
      await executeTontineTurn(groupId);
      toast("Échéance exécutée (test). Prochain bénéficiaire.", "success");
      await loadDetail();
      getTontinePayouts(groupId).then(setPayouts);
      getTontineDepositBalance(groupId).then((r) => setDepositBalance(r.balanceFormatted));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur", "error");
    } finally {
      setExecutingTurn(false);
    }
  }, [groupId, toast, loadDetail]);

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

  const totalSaved = (isSimpleTontine ? members.length : chain.memberCount) * contributionFormatted;

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
                const isBeneficiary = currentBeneficiaryAddr?.toLowerCase() === addr.toLowerCase();
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
            Bénéficiaire actuel : {currentBeneficiaryAddr
              ? `${currentBeneficiaryAddr.slice(0, 6)}…${currentBeneficiaryAddr.slice(-4)}`
              : "—"}
          </p>
        </div>

        {/* Escrow: winner can release, provider sees waiting */}
        {(lockedAsWinner.length > 0 || lockedAsProvider.length > 0) && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#4a4a4a] flex items-center gap-2">
              <Lock className="size-4" />
              Escrow
            </h2>
            {lockedAsWinner.map((escrow) => {
              const amountFormatted = Number(formatUnits(BigInt(escrow.amount), USDT_DECIMALS)).toFixed(2);
              return (
                <div
                  key={escrow.id}
                  className="rounded-2xl border-2 border-[#295c4f] bg-[#295c4f]/5 p-4 space-y-3"
                >
                  <p className="text-sm text-[#4a4a4a]">
                    You are the winner. Release ${amountFormatted} USDT to the service provider once you receive the service.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleReleaseFunds(escrow)}
                    disabled={txState === "confirming" || !walletClient}
                    className="w-full flex items-center justify-center gap-2 py-5 rounded-2xl font-bold text-white bg-[#295c4f] disabled:opacity-50"
                  >
                    <Unlock className="size-5" />
                    {txState === "confirming" ? "Confirm in wallet…" : "Confirm Service & Release Funds"}
                  </button>
                </div>
              );
            })}
            {lockedAsProvider.map((escrow) => {
              const amountFormatted = Number(formatUnits(BigInt(escrow.amount), USDT_DECIMALS)).toFixed(2);
              return (
                <div
                  key={escrow.id}
                  className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4 flex items-center gap-3"
                >
                  <Lock className="size-5 text-[#4a4a4a]" />
                  <div>
                    <p className="font-semibold text-[#1a1a1a]">Funds Locked — Waiting for confirmation</p>
                    <p className="text-sm text-[#4a4a4a]">
                      ${amountFormatted} USDT will be released to you when the winner confirms receipt of the service.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Wallet de dépôt + Sign + Test (simple tontines, pas d'escrow) */}
        {isSimpleTontine && (
          <div className="space-y-4">
            {detail?.deposit_wallet_address && (
              <div className="rounded-2xl border-2 border-[#295c4f] bg-[#295c4f]/5 p-4 space-y-2">
                <h2 className="text-sm font-semibold text-[#4a4a4a]">Wallet de dépôt (cotisations USDT)</h2>
                <p className="text-sm text-[#4a4a4a]">
                  Envoyez vos cotisations USDT à cette adresse. Les fonds seront libérés au bénéficiaire à chaque échéance.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg bg-[#f8fafc] px-3 py-2 text-xs font-mono text-[#1a1a1a]">
                    {detail.deposit_wallet_address}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(detail.deposit_wallet_address!);
                      toast("Adresse copiée", "success");
                    }}
                    className="shrink-0 rounded-lg border border-[#295c4f] px-3 py-2 text-xs font-medium text-[#295c4f]"
                  >
                    Copier
                  </button>
                </div>
                {depositBalance != null && (
                  <p className="text-sm font-semibold text-[#1a1a1a]">
                    Dépôts reçus : <span className="text-[#295c4f]">{depositBalance} USDT</span>
                    {Number(depositBalance) === 0 && (
                      <span className="block text-xs font-normal text-[#4a4a4a] mt-1">
                        Envoyez des USDT à l'adresse ci-dessus (depuis MetaMask ou votre wallet). Le solde se met à jour ici.
                      </span>
                    )}
                  </p>
                )}
                <a
                  href={`${explorerUrl}/address/${detail.deposit_wallet_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm font-medium text-[#295c4f] hover:underline"
                >
                  Voir les dépôts sur l'explorateur →
                </a>
              </div>
            )}
            <h2 className="text-sm font-semibold text-[#4a4a4a]">Signature & démo</h2>
            {!detail?.creator_signed_at && isCreator && (
              <button
                type="button"
                onClick={handleSign}
                disabled={signing || !walletAddress}
                className="w-full flex items-center justify-center gap-2 py-5 rounded-2xl font-bold text-white bg-[#295c4f] disabled:opacity-50"
              >
                {signing ? "Signature…" : "Signer la tontine"}
              </button>
            )}
            {detail?.creator_signed_at && (
              <p className="text-sm text-[#295c4f] font-medium">✓ Tontine signée et active</p>
            )}
            <button
              type="button"
              onClick={handleExecuteTurn}
              disabled={executingTurn}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold border-2 border-amber-500 text-amber-600 bg-amber-50 disabled:opacity-50"
            >
              {executingTurn ? "Exécution…" : "Exécuter l'échéance (test démo jury)"}
            </button>

            {payouts.length > 0 && (
              <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4 space-y-3">
                <h2 className="text-sm font-semibold text-[#4a4a4a]">Historique des échéances (transactions)</h2>
                <ul className="space-y-2">
                  {payouts.map((p) => {
                    const amountFormatted = (Number(p.amount) / 1e6).toFixed(2);
                    const date = p.created_at ? new Date(p.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";
                    return (
                      <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-[#4a4a4a]">{date}</span>
                        <span className="font-mono text-[#1a1a1a]">{p.to_address.slice(0, 6)}…{p.to_address.slice(-4)}</span>
                        <span className="font-medium text-[#295c4f]">{amountFormatted} USDT</span>
                        <a
                          href={`${explorerUrl}/tx/${p.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-[#295c4f] hover:underline"
                        >
                          Voir la tx →
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action center (on-chain) */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#4a4a4a]">Actions</h2>

          {!isSimpleTontine && (
            <>
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
            </>
          )}
        </div>

        {/* Members list */}
        <div>
          <h2 className="text-sm font-semibold text-[#4a4a4a] mb-3 flex items-center gap-2">
            <Users className="size-4" />
            Members
          </h2>
          <div className="space-y-2">
            {(members.length ? members : detail?.members?.map((m) => m.wallet_address) ?? []).map((addr, i) => {
              const isBeneficiary = currentBeneficiaryAddr?.toLowerCase() === addr.toLowerCase();
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
