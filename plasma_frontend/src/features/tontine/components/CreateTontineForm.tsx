import { useCallback, useState, useEffect } from "react";
import { Lock, Unlock, CheckCircle } from "lucide-react";
import { useUser } from "../../../context/UserContext";
import { useUsdtBalance } from "../../../hooks/useUsdtBalance";
import { useTontineToast } from "../context/ToastContext";
import { useWalletClient } from "../hooks/useWalletClient";
import { useTontineWrite } from "../hooks/useTontineWrite";
import { useUsdtAllowance } from "../hooks/useUsdtAllowance";
import { publicClient } from "../../../blockchain/viem";
import { TONTINE_ABI } from "../abi";
import { TONTINE_CONTRACT_ADDRESS, USDT_DECIMALS } from "../config";
import { formatUnits, parseUnits } from "viem";

const PERIOD_OPTIONS = [
  { label: "Weekly", value: "weekly" as const },
  { label: "Monthly", value: "monthly" as const },
] as const;

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
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function CreateTontineForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useTontineToast();
  const { walletAddress } = useUser();
  const walletClient = useWalletClient();
  const { createTontine, txState, txError, resetTx } = useTontineWrite(walletClient);

  const [name, setName] = useState("");
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [contribution, setContribution] = useState("");
  const [collateral, setCollateral] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [tontineId, setTontineId] = useState<number | null>(null);
  const [approving, setApproving] = useState(false);
  const [approveHash, setApproveHash] = useState<`0x${string}` | null>(null);

  const contributionNum = Number(contribution) || 0;
  const collateralNum = Number(collateral) || 0;
  const creatorWallet = (() => {
    const w = walletAddress?.trim().toLowerCase();
    if (w) return w;
    const addr = walletClient?.account?.address;
    return addr ? addr.toLowerCase() : "";
  })();

  // Calculate total amount needed (contribution + collateral)
  const totalAmount = contributionNum + collateralNum;
  const totalAmountWei = totalAmount > 0 ? parseUnits(totalAmount.toFixed(USDT_DECIMALS), USDT_DECIMALS) : 0n;

  // Solde USDT disponible (même source que la page d'accueil)
  const { balance: usdtBalance, loading: balanceLoading, reload: reloadUsdtBalance } = useUsdtBalance(walletAddress);

  // Check USDT allowance
  const { allowance, loading: allowanceLoading, reload: reloadAllowance } = useUsdtAllowance(
    walletAddress,
    TONTINE_CONTRACT_ADDRESS,
  );

  // Determine if approval is needed
  const needsApproval = allowance !== null && totalAmountWei > 0n && allowance < totalAmountWei;
  const hasEnoughAllowance = allowance !== null && totalAmountWei > 0n && allowance >= totalAmountWei;

  // Wait for approval transaction receipt
  useEffect(() => {
    if (!approveHash || !walletClient) return;

    const waitForApproval = async () => {
      try {
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        setApproving(false);
        toast("USDT approved successfully!", "success");
        await reloadAllowance();
        await reloadUsdtBalance();
        setApproveHash(null);
      } catch (err) {
        setApproving(false);
        console.error("Error waiting for approval receipt:", err);
        toast("Error during approval", "error");
        setApproveHash(null);
      }
    };

    waitForApproval();
  }, [approveHash, walletClient, toast, reloadAllowance, reloadUsdtBalance]);

  // Wait for transaction receipt when hash is available
  useEffect(() => {
    if (!txHash || !TONTINE_CONTRACT_ADDRESS) return;
    
    const waitForReceipt = async () => {
      try {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        // Read the latest tontine ID
        const nextId = await publicClient.readContract({
          address: TONTINE_CONTRACT_ADDRESS,
          abi: TONTINE_ABI,
          functionName: "nextTontineId",
        });
        const latestId = Number(nextId) - 1;
        if (latestId >= 0) {
          setTontineId(latestId);
          toast("Tontine created successfully on the blockchain!", "success");
          // Trigger history refresh
          window.dispatchEvent(new CustomEvent("transaction-confirmed", { detail: { txHash } }));
          onSuccess?.();
        }
      } catch (err) {
        console.error("Error waiting for receipt:", err);
      }
    };
    
    waitForReceipt();
  }, [txHash, toast, onSuccess]);

  const addMember = useCallback(() => {
    const addr = memberInput.trim().toLowerCase();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      toast("Invalid wallet address (0x...)", "error");
      return;
    }
    if (members.includes(addr)) {
      toast("Already added", "error");
      return;
    }
    setMembers((prev) => [...prev, addr]);
    setMemberInput("");
  }, [memberInput, members, toast]);

  const removeMember = useCallback((addr: string) => {
    setMembers((prev) => prev.filter((a) => a !== addr));
  }, []);

  // Handle USDT approval
  const handleApprove = useCallback(async () => {
    if (!USDT_ADDRESS || !TONTINE_CONTRACT_ADDRESS || !walletClient?.account || totalAmountWei === 0n) {
      toast("Missing configuration or invalid amount", "error");
      return;
    }

    setApproving(true);
    setApproveHash(null);

    try {
      const hash = await walletClient.writeContract({
        address: USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [TONTINE_CONTRACT_ADDRESS, totalAmountWei],
        account: walletClient.account,
      });

      setApproveHash(hash);
      toast(`Approval sent! Hash: ${hash.slice(0, 10)}…`, "success");
    } catch (err) {
      setApproving(false);
      const msg = err instanceof Error ? err.message : "Error during approval";
      toast(msg, "error");
      setApproveHash(null);
    }
  }, [walletClient, totalAmountWei, toast]);

  // Handle create tontine
  const handleCreateTontine = useCallback(async () => {
    if (!creatorWallet || !walletClient) {
      toast("Connect your wallet to create a tontine.", "error");
      return;
    }
    if (contributionNum <= 0) {
      toast("Enter a contribution amount > 0.", "error");
      return;
    }
    if (!TONTINE_CONTRACT_ADDRESS) {
      toast("Tontine contract not configured.", "error");
      return;
    }
    if (needsApproval) {
      toast("Please approve USDT usage first", "error");
      return;
    }

    resetTx();
    setTxHash(null);
    setTontineId(null);

    // Convert period to frequency in seconds
    const frequencySeconds = period === "weekly" ? 7 * 24 * 60 * 60 : 30 * 24 * 60 * 60;

    try {
      const result = await createTontine(
        contribution,
        frequencySeconds,
        collateral || "0"
      );
      
      if (result?.hash) {
        setTxHash(result.hash);
        if (result.tontineId >= 0) {
          setTontineId(result.tontineId);
        }
      } else {
        toast(txError || "Error creating tontine", "error");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast(msg || "Error creating tontine", "error");
    }
  }, [creatorWallet, walletClient, contribution, collateral, period, contributionNum, createTontine, txError, resetTx, toast, needsApproval]);

  const isApproving = approving || approveHash !== null;
  const isCreating = txState === "confirming" || txState === "success";
  const canApprove = !isApproving && !isCreating && totalAmountWei > 0n && needsApproval;
  const canCreate = !isApproving && !isCreating && totalAmountWei > 0n && hasEnoughAllowance;

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-[#FFFFFF] p-8" style={{ boxShadow: "none" }}>
      <h2 className="text-xl font-bold text-[#295c4f] mb-6" style={{ fontFamily: "Outfit, DM Sans, sans-serif" }}>
        Create a tontine
      </h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#4a4a4a] mb-2">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Family tontine"
            className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-[#1a1a1a] outline-none focus:border-[#295c4f]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#4a4a4a] mb-2">Period</label>
          <div className="flex gap-3">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                className={`flex-1 py-3 rounded-xl border text-sm font-medium ${
                  period === opt.value
                    ? "border-[#295c4f] bg-[#295c4f]/10 text-[#295c4f]"
                    : "border-[#e5e7eb] bg-[#f8fafc] text-[#4a4a4a]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#4a4a4a] mb-2">Contribution (USDT)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={contribution}
            onChange={(e) => setContribution(e.target.value)}
            placeholder="e.g. 50"
            className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-[#1a1a1a] outline-none focus:border-[#295c4f]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#4a4a4a] mb-2">Collateral (USDT, optional)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={collateral}
            onChange={(e) => setCollateral(e.target.value)}
            placeholder="0"
            className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-[#1a1a1a] outline-none focus:border-[#295c4f]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#4a4a4a] mb-2">Members (wallet addresses)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMember())}
              placeholder="0x..."
              className="flex-1 rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-[#1a1a1a] font-mono text-sm outline-none focus:border-[#295c4f]"
            />
            <button
              type="button"
              onClick={addMember}
              className="py-3 px-4 rounded-xl border border-[#295c4f] text-[#295c4f] font-medium text-sm"
            >
              Add
            </button>
          </div>
          {members.length > 0 && (
            <ul className="mt-2 space-y-1">
              {members.map((addr) => (
                <li key={addr} className="flex items-center justify-between text-sm font-mono text-[#4a4a4a] bg-[#f8fafc] rounded-lg px-3 py-2">
                  <span className="truncate">{addr}</span>
                  <button
                    type="button"
                    onClick={() => removeMember(addr)}
                    className="text-[#ef4444] hover:underline ml-2 shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-[#4a4a4a]">You are the creator and first member. Add other participants.</p>
        </div>

        {/* Solde disponible + Allowance Status (même source USDT que la page d'accueil) */}
        {walletAddress && TONTINE_CONTRACT_ADDRESS && totalAmountWei > 0n && (
          <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#4a4a4a]">Available USDT balance:</span>
              <span className="text-sm font-semibold text-[#111827]">
                {balanceLoading
                  ? "…"
                  : usdtBalance != null
                    ? `${Number(usdtBalance).toLocaleString("en-US", { maximumFractionDigits: 2 })} USDT`
                    : "—"}
              </span>
            </div>
            {usdtBalance != null && totalAmount > 0 && Number(usdtBalance) < totalAmount && (
              <p className="text-xs text-[#ef4444]">
                Insufficient balance. You need {totalAmount.toFixed(2)} USDT (contribution + collateral).
              </p>
            )}
            {allowanceLoading ? (
              <p className="text-sm text-[#6b7280]">Checking USDT approval...</p>
            ) : allowance !== null ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#4a4a4a]">USDT approval:</span>
                  <span className={`text-sm font-semibold ${hasEnoughAllowance ? "text-[#10b981]" : "text-[#f59e0b]"}`}>
                    {formatUnits(allowance, USDT_DECIMALS)} / {totalAmount.toFixed(2)} USDT
                  </span>
                </div>
                {needsApproval && (
                  <p className="text-xs text-[#f59e0b]">
                    Insufficient approval. Approve USDT usage first.
                  </p>
                )}
                {hasEnoughAllowance && (
                  <p className="text-xs text-[#10b981] flex items-center gap-1">
                    <CheckCircle className="size-3" />
                    Approval sufficient. You can create the tontine.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-[#6b7280]">Could not verify USDT approval</p>
            )}
          </div>
        )}

        {/* Smart Button: Approve or Create */}
        {needsApproval ? (
          <button
            type="button"
            onClick={handleApprove}
            disabled={!canApprove || !walletClient || !creatorWallet || totalAmountWei === 0n}
            className="w-full py-4 rounded-xl font-semibold text-white bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isApproving ? (
              <>
                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <Unlock className="size-5" />
                Unlock USDT ({totalAmount.toFixed(2)} USDT)
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreateTontine}
            disabled={!canCreate || contributionNum <= 0 || !creatorWallet || !walletClient}
            className="w-full py-4 rounded-xl font-semibold text-white bg-[#295c4f] hover:bg-[#1f4a3f] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {txState === "confirming" ? "Confirm in your wallet…" : "Transaction sent"}
              </>
            ) : (
              <>
                <CheckCircle className="size-5" />
                Create Tontine
              </>
            )}
          </button>
        )}

        {approveHash && (
          <div className="rounded-xl border-2 border-[#f59e0b] bg-[#f59e0b]/5 p-4 space-y-2">
            <p className="text-sm font-semibold text-[#f59e0b]">Approval sent!</p>
            <a
              href={`${EXPLORER_URL}/tx/${approveHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-[#f59e0b] hover:underline break-all"
            >
              View on explorer: {approveHash.slice(0, 10)}…{approveHash.slice(-8)}
            </a>
            <p className="text-xs text-[#6b7280]">Waiting for confirmation...</p>
          </div>
        )}

        {txState === "confirming" && (
          <p className="text-sm text-[#295c4f] text-center">
            ⏳ En attente de confirmation dans votre wallet…
          </p>
        )}

        {txHash && (
          <div className="rounded-xl border-2 border-[#295c4f] bg-[#295c4f]/5 p-4 space-y-2">
            <p className="text-sm font-semibold text-[#295c4f]">Transaction envoyée!</p>
            <a
              href={`${EXPLORER_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-[#295c4f] hover:underline break-all"
            >
              Voir sur l'explorateur: {txHash.slice(0, 10)}…{txHash.slice(-8)}
            </a>
            {tontineId !== null && (
              <p className="text-sm text-[#4a4a4a]">
                Tontine ID: <strong>{tontineId}</strong>
              </p>
            )}
          </div>
        )}

        {txError && (
          <p className="text-sm text-[#ef4444] text-center">{txError}</p>
        )}

        {!creatorWallet && (
          <p className="text-sm text-[#4a4a4a]">Connectez votre wallet pour créer une tontine.</p>
        )}

        {!walletClient && creatorWallet && (
          <p className="text-sm text-[#4a4a4a]">Initialisation du wallet…</p>
        )}
      </div>
    </div>
  );
}
