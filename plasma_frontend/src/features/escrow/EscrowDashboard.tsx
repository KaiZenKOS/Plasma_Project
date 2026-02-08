import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useUser } from "../../context/UserContext";
import { useWalletClient } from "../tontine/hooks/useWalletClient";
import { useTontineToast } from "../tontine/context/ToastContext";
import { publicClient } from "../../blockchain/viem";
import {
  ESCROW_SERVICE_ADDRESS,
  ESCROW_USDT_ADDRESS,
  ESCROW_SERVICE_ABI,
  ERC20_ABI,
  USDT_DECIMALS,
} from "../../blockchain/escrowService";
import { useUsdtBalance } from "../../hooks/useUsdtBalance";

const EXPLORER_URL = typeof import.meta.env.VITE_PLASMA_EXPLORER_URL === "string" && import.meta.env.VITE_PLASMA_EXPLORER_URL
  ? import.meta.env.VITE_PLASMA_EXPLORER_URL
  : "https://testnet.plasmascan.to";

// Enum mapping: 0=CREATED, 1=LOCKED, 2=RELEASED
enum EscrowStatus {
  CREATED = 0,
  LOCKED = 1,
  RELEASED = 2,
}

type EscrowEngagement = {
  id: number;
  depositor: `0x${string}`;
  beneficiary: `0x${string}`;
  amount: bigint;
  amountFormatted: string;
  status: EscrowStatus;
  isClient: boolean; // user is depositor
  isWorker: boolean; // user is beneficiary
};

function getStatusBadge(status: EscrowStatus) {
  switch (status) {
    case EscrowStatus.CREATED:
      return { label: "Créé", className: "bg-blue-100 text-blue-800" };
    case EscrowStatus.LOCKED:
      return { label: "Verrouillé", className: "bg-amber-100 text-amber-800" };
    case EscrowStatus.RELEASED:
      return { label: "Libéré", className: "bg-green-100 text-green-800" };
    default:
      return { label: "Inconnu", className: "bg-gray-100 text-gray-800" };
  }
}

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function EscrowDashboard() {
  const { walletAddress } = useUser();
  const walletClient = useWalletClient();
  const { toast } = useTontineToast();
  const { balance: usdtBalance, reload: reloadBalance } = useUsdtBalance(walletAddress);

  const [engagements, setEngagements] = useState<EscrowEngagement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [depositingId, setDepositingId] = useState<number | null>(null);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [releasingId, setReleasingId] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  // Form state for creating new escrow
  const [newBeneficiary, setNewBeneficiary] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [creating, setCreating] = useState(false);

  // Load engagements from blockchain
  const loadEngagements = useCallback(async () => {
    if (!ESCROW_SERVICE_ADDRESS || !walletAddress) {
      setEngagements([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextId = await publicClient.readContract({
        address: ESCROW_SERVICE_ADDRESS,
        abi: ESCROW_SERVICE_ABI,
        functionName: "nextEscrowId",
      });

      const totalEscrows = Number(nextId);
      const userLower = walletAddress.toLowerCase();
      const list: EscrowEngagement[] = [];

      for (let i = 0; i < totalEscrows; i++) {
        try {
          const [depositor, beneficiary, amount, released] = await publicClient.readContract({
            address: ESCROW_SERVICE_ADDRESS,
            abi: ESCROW_SERVICE_ABI,
            functionName: "getEscrow",
            args: [BigInt(i)],
          });

          const dep = depositor as `0x${string}`;
          const ben = beneficiary as `0x${string}`;
          const isClient = dep.toLowerCase() === userLower;
          const isWorker = ben.toLowerCase() === userLower;

          // Only show engagements where user is client or worker
          if (isClient || isWorker) {
            const status = released ? EscrowStatus.RELEASED : EscrowStatus.LOCKED;
            list.push({
              id: i,
              depositor: dep,
              beneficiary: ben,
              amount: amount as bigint,
              amountFormatted: formatUnits(amount as bigint, USDT_DECIMALS),
              status,
              isClient,
              isWorker,
            });
          }
        } catch (err) {
          // Skip invalid escrows
          console.error(`Error loading escrow ${i}:`, err);
        }
      }

      setEngagements(list.reverse()); // Most recent first
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement");
      setEngagements([]);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadEngagements();
  }, [loadEngagements]);

  // Handle create and deposit escrow (createEscrow does both in one call)
  const handleCreateAndDeposit = useCallback(async (beneficiary: `0x${string}`, amountStr: string) => {
    if (!ESCROW_SERVICE_ADDRESS || !ESCROW_USDT_ADDRESS || !walletClient?.account) {
      setError("Wallet ou contrat non configuré");
      return;
    }

    const amountNum = parseFloat(amountStr);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast("Montant invalide", "error");
      return;
    }

    const amount = BigInt(Math.round(amountNum * 10 ** USDT_DECIMALS));

    // Check USDT balance
    const amountFormatted = Number(formatUnits(amount, USDT_DECIMALS));
    if (!usdtBalance || Number(usdtBalance) < amountFormatted) {
      toast(`Solde USDT insuffisant. Requis: ${amountFormatted.toFixed(2)} USDT, Disponible: ${Number(usdtBalance).toFixed(2)} USDT`, "error");
      return;
    }

    setCreating(true);
    setError(null);
    setTxHash(null);

    try {
      // First, check current allowance
      const currentAllowance = await publicClient.readContract({
        address: ESCROW_USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [walletClient.account.address, ESCROW_SERVICE_ADDRESS],
      });

      // Approve if needed
      if (currentAllowance < amount) {
        const approveHash = await walletClient.writeContract({
          address: ESCROW_USDT_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [ESCROW_SERVICE_ADDRESS, amount],
          account: walletClient.account,
        });

        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        toast("Approbation USDT confirmée", "success");
      }
      
      // Then, create escrow (which deposits the funds in one call)
      const depositHash = await walletClient.writeContract({
        address: ESCROW_SERVICE_ADDRESS,
        abi: ESCROW_SERVICE_ABI,
        functionName: "createEscrow",
        args: [beneficiary, amount],
        account: walletClient.account,
      });

      setTxHash(depositHash);
      
      // Show toast immediately
      toast(`Transaction envoyée au Plasma Network! Hash: ${depositHash.slice(0, 10)}…${depositHash.slice(-8)}`, "success");
      
      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash: depositHash });
      
      // Clear form
      setNewBeneficiary("");
      setNewAmount("");
      
      // Reload data
      await loadEngagements();
      await reloadBalance();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors du dépôt";
      setError(msg);
      toast(msg, "error");
    } finally {
      setCreating(false);
    }
  }, [walletClient, usdtBalance, loadEngagements, reloadBalance, toast]);

  // Handle deposit funds for existing escrow (not used in current contract, but kept for API compatibility)
  const handleDeposit = useCallback(async (escrowId: number, amount: bigint, beneficiary: `0x${string}`) => {
    if (!ESCROW_SERVICE_ADDRESS || !ESCROW_USDT_ADDRESS || !walletClient?.account) {
      setError("Wallet ou contrat non configuré");
      return;
    }

    // Check USDT balance
    const amountFormatted = Number(formatUnits(amount, USDT_DECIMALS));
    if (!usdtBalance || Number(usdtBalance) < amountFormatted) {
      toast(`Solde USDT insuffisant. Requis: ${amountFormatted.toFixed(2)} USDT, Disponible: ${Number(usdtBalance).toFixed(2)} USDT`, "error");
      return;
    }

    setDepositingId(escrowId);
    setError(null);
    setTxHash(null);

    try {
      // First, check current allowance
      const currentAllowance = await publicClient.readContract({
        address: ESCROW_USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [walletClient.account.address, ESCROW_SERVICE_ADDRESS],
      });

      // Approve if needed
      if (currentAllowance < amount) {
        const approveHash = await walletClient.writeContract({
          address: ESCROW_USDT_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [ESCROW_SERVICE_ADDRESS, amount],
          account: walletClient.account,
        });

        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        toast("Approbation USDT confirmée", "success");
      }
      
      // Then, create escrow (which deposits the funds in one call)
      const depositHash = await walletClient.writeContract({
        address: ESCROW_SERVICE_ADDRESS,
        abi: ESCROW_SERVICE_ABI,
        functionName: "createEscrow",
        args: [beneficiary, amount],
        account: walletClient.account,
      });

      setTxHash(depositHash);
      
      // Show toast immediately
      toast(`Transaction envoyée au Plasma Network! Hash: ${depositHash.slice(0, 10)}…${depositHash.slice(-8)}`, "success");
      
      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash: depositHash });
      
      // Reload data
      await loadEngagements();
      await reloadBalance();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors du dépôt";
      setError(msg);
      toast(msg, "error");
    } finally {
      setDepositingId(null);
    }
  }, [walletClient, usdtBalance, loadEngagements, reloadBalance, toast]);

  // Handle submit work (placeholder - not in current contract)
  const handleSubmitWork = useCallback(async (escrowId: number) => {
    if (!walletClient?.account) {
      setError("Wallet non connecté");
      return;
    }

    setSubmittingId(escrowId);
    setError(null);
    setTxHash(null);

    try {
      // Note: submitWork doesn't exist in the current contract
      // This is a placeholder for future implementation
      toast("Fonction submitWork non implémentée dans le contrat actuel", "info");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la soumission");
    } finally {
      setSubmittingId(null);
    }
  }, [walletClient, toast]);

  // Handle release payment
  const handleReleaseFunds = useCallback(async (escrowId: number) => {
    if (!ESCROW_SERVICE_ADDRESS || !walletClient?.account) {
      setError("Wallet ou contrat non configuré");
      return;
    }

    setReleasingId(escrowId);
    setError(null);
    setTxHash(null);

    try {
      const releaseHash = await walletClient.writeContract({
        address: ESCROW_SERVICE_ADDRESS,
        abi: ESCROW_SERVICE_ABI,
        functionName: "release",
        args: [BigInt(escrowId)],
        account: walletClient.account,
      });

      setTxHash(releaseHash);
      
      // Show toast immediately
      toast(`Transaction envoyée au Plasma Network! Hash: ${releaseHash.slice(0, 10)}…${releaseHash.slice(-8)}`, "success");
      
      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash: releaseHash });
      
      // Reload data
      await loadEngagements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la libération");
    } finally {
      setReleasingId(null);
    }
  }, [walletClient, loadEngagements]);

  if (!ESCROW_SERVICE_ADDRESS) {
    return (
      <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-6 text-center text-[#4a4a4a]">
        <p className="text-sm">Contrat Escrow non configuré (VITE_ESCROW_CONTRACT_ADDRESS)</p>
      </div>
    );
  }

  if (!walletAddress) {
    return (
      <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-6 text-center text-[#4a4a4a]">
        <p className="text-sm">Connectez votre wallet pour voir vos engagements</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#295c4f]" style={{ fontFamily: "Outfit, DM Sans, sans-serif" }}>
          Escrow Dashboard
        </h2>
        <button
          type="button"
          onClick={loadEngagements}
          disabled={loading}
          className="text-sm text-[#295c4f] hover:underline disabled:opacity-50"
        >
          {loading ? "Chargement…" : "Actualiser"}
        </button>
      </div>

      {/* Create New Escrow Form */}
      <div className="rounded-2xl border border-[#e5e7eb] bg-[#FFFFFF] p-6 space-y-4">
        <h3 className="text-lg font-bold text-[#295c4f]">Créer un nouvel escrow</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#4a4a4a] mb-2">Bénéficiaire (adresse 0x...)</label>
            <input
              type="text"
              value={newBeneficiary}
              onChange={(e) => setNewBeneficiary(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-[#1a1a1a] font-mono text-sm outline-none focus:border-[#295c4f]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#4a4a4a] mb-2">Montant (USDT)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-[#1a1a1a] outline-none focus:border-[#295c4f]"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!/^0x[a-fA-F0-9]{40}$/.test(newBeneficiary.trim())) {
                toast("Adresse bénéficiaire invalide", "error");
                return;
              }
              handleCreateAndDeposit(newBeneficiary.trim() as `0x${string}`, newAmount);
            }}
            disabled={creating || !walletClient || !newBeneficiary.trim() || !newAmount}
            className="w-full py-3 rounded-xl bg-[#295c4f] text-white font-semibold disabled:opacity-50"
          >
            {creating ? "Création et dépôt…" : "Deposit Funds"}
          </button>
        </div>
      </div>

      {usdtBalance && (
        <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
          <p className="text-sm text-[#4a4a4a]">
            Solde USDT: <strong className="text-[#295c4f]">{Number(usdtBalance).toFixed(2)} USDT</strong>
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[#ef4444] bg-[#ef4444]/10 p-4 text-sm text-[#ef4444]">
          {error}
        </div>
      )}

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

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#4a4a4a]">
          <div className="animate-pulse text-sm">Chargement des engagements…</div>
        </div>
      ) : engagements.length === 0 ? (
        <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-12 text-center text-[#4a4a4a]">
          <p className="font-medium">Aucun engagement trouvé</p>
          <p className="text-sm mt-1">Créez un escrow pour commencer</p>
        </div>
      ) : (
        <div className="space-y-4">
          {engagements.map((engagement) => {
            const badge = getStatusBadge(engagement.status);
            // Note: CREATED status doesn't exist in current contract (escrows are created and locked immediately)
            // So we'll show deposit button only for new escrows (this would need a form to create first)
            const canDeposit = false; // Would need a create form first
            const canSubmitWork = engagement.isWorker && engagement.status === EscrowStatus.LOCKED;
            const canRelease = engagement.isClient && engagement.status === EscrowStatus.LOCKED;

            return (
              <div
                key={engagement.id}
                className="rounded-2xl border border-[#e5e7eb] bg-[#FFFFFF] p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-[#1a1a1a]">Escrow #{engagement.id}</h3>
                    <p className="text-sm text-[#4a4a4a]">
                      {engagement.isClient ? "Vous êtes le client" : "Vous êtes le worker"}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-lg ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="text-[#4a4a4a]">
                    <strong className="text-[#1a1a1a]">Montant:</strong> {engagement.amountFormatted} USDT
                  </p>
                  <p className="text-[#4a4a4a]">
                    <strong className="text-[#1a1a1a]">Client:</strong>{" "}
                    <span className="font-mono">{shortenAddress(engagement.depositor)}</span>
                  </p>
                  <p className="text-[#4a4a4a]">
                    <strong className="text-[#1a1a1a]">Worker:</strong>{" "}
                    <span className="font-mono">{shortenAddress(engagement.beneficiary)}</span>
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {canDeposit && (
                    <button
                      type="button"
                      onClick={() => handleDeposit(engagement.id, engagement.amount, engagement.beneficiary)}
                      disabled={depositingId === engagement.id || !walletClient}
                      className="px-4 py-2 rounded-xl bg-[#295c4f] text-white text-sm font-semibold disabled:opacity-50"
                    >
                      {depositingId === engagement.id ? "Dépôt…" : "Deposit Funds"}
                    </button>
                  )}

                  {canSubmitWork && (
                    <button
                      type="button"
                      onClick={() => handleSubmitWork(engagement.id)}
                      disabled={submittingId === engagement.id || !walletClient}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      {submittingId === engagement.id ? "Soumission…" : "Submit Work"}
                    </button>
                  )}

                  {canRelease && (
                    <button
                      type="button"
                      onClick={() => handleReleaseFunds(engagement.id)}
                      disabled={releasingId === engagement.id || !walletClient}
                      className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      {releasingId === engagement.id ? "Libération…" : "Release Payment"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

