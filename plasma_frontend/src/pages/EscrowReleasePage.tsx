import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatUnits } from "viem";
import { Shield, DollarSign, Loader2, CheckCircle } from "lucide-react";
import { useUser } from "../context/UserContext";
import { useWalletClient } from "../features/tontine/hooks/useWalletClient";
import { useTontineToast } from "../features/tontine/context/ToastContext";
import { publicClient } from "../blockchain/viem";
import {
  ESCROW_SERVICE_ADDRESS,
  ESCROW_USDT_ADDRESS,
  ESCROW_SERVICE_ABI,
  USDT_DECIMALS,
} from "../blockchain/escrowService";
import { PrivyAuthButton } from "../components/PrivyAuthButton";

enum EscrowStatus {
  CREATED = 0,
  LOCKED = 1,
  RELEASED = 2,
}

export function EscrowReleasePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { walletAddress } = useUser();
  const walletClient = useWalletClient();
  const { toast } = useTontineToast();

  const [escrowData, setEscrowData] = useState<{
    depositor: `0x${string}`;
    beneficiary: `0x${string}`;
    amount: string;
    status: EscrowStatus;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [released, setReleased] = useState(false);

  // Fetch escrow details
  useEffect(() => {
    async function loadEscrow() {
      if (!id || !ESCROW_SERVICE_ADDRESS) {
        setError("Invalid escrow ID");
        setLoading(false);
        return;
      }

      try {
        const escrowId = BigInt(id);
        
        // Fetch escrow data
        const escrow = await publicClient.readContract({
          address: ESCROW_SERVICE_ADDRESS,
          abi: ESCROW_SERVICE_ABI,
          functionName: "getEscrow",
          args: [escrowId],
        });

        const e = escrow as readonly [`0x${string}`, `0x${string}`, bigint, boolean];
        
        // In the current contract, escrows are created and locked immediately
        // So status is either LOCKED (released = false) or RELEASED (released = true)
        setEscrowData({
          depositor: e[0],
          beneficiary: e[1],
          amount: formatUnits(e[2], USDT_DECIMALS),
          status: e[3] ? EscrowStatus.RELEASED : EscrowStatus.LOCKED,
        });
      } catch (err) {
        console.error("Error loading escrow:", err);
        setError(err instanceof Error ? err.message : "Failed to load escrow");
      } finally {
        setLoading(false);
      }
    }

    loadEscrow();
  }, [id]);

  const handleRelease = useCallback(async () => {
    if (!id || !walletAddress || !walletClient) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!escrowData) {
      toast.error("Escrow data not loaded");
      return;
    }

    // Check if user is the depositor
    if (escrowData.depositor.toLowerCase() !== walletAddress.toLowerCase()) {
      toast.error("Only the depositor can release funds");
      return;
    }

    if (escrowData.status !== EscrowStatus.LOCKED) {
      toast.error(`Escrow is ${escrowData.status === EscrowStatus.CREATED ? "not locked yet" : "already released"}`);
      return;
    }

    setReleasing(true);
    try {
      const hash = await walletClient.writeContract({
        address: ESCROW_SERVICE_ADDRESS,
        abi: ESCROW_SERVICE_ABI,
        functionName: "release",
        args: [BigInt(id)],
        account: walletAddress as `0x${string}`,
      });

      toast.success(`Transaction sent! Hash: ${hash.slice(0, 10)}...`);
      setReleased(true);
      
      // Navigate to escrow page after a delay
      setTimeout(() => {
        navigate("/escrow");
      }, 3000);
    } catch (err) {
      console.error("Error releasing funds:", err);
      toast.error(err instanceof Error ? err.message : "Failed to release funds");
    } finally {
      setReleasing(false);
    }
  }, [id, walletAddress, walletClient, escrowData, toast, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-[#295c4f] mx-auto mb-4" />
          <p className="text-[#4a4a4a]">Loading escrow details...</p>
        </div>
      </div>
    );
  }

  if (error || !escrowData) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-[#111827] mb-4">Escrow Not Found</h1>
          <p className="text-[#6b7280] mb-6">{error || "The escrow you're looking for doesn't exist."}</p>
          <button
            onClick={() => navigate("/escrow")}
            className="px-6 py-3 rounded-xl bg-[#295c4f] text-white font-semibold hover:bg-[#1f4a3f] transition-colors"
          >
            Go to Escrow
          </button>
        </div>
      </div>
    );
  }

  const isDepositor = walletAddress && escrowData.depositor.toLowerCase() === walletAddress.toLowerCase();
  const canRelease = isDepositor && escrowData.status === EscrowStatus.LOCKED && !released;

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <header className="px-6 py-6 border-b border-[#e5e7eb]">
        <button
          onClick={() => navigate("/escrow")}
          className="text-[#295c4f] hover:text-[#1f4a3f] transition-colors"
        >
          ← Back
        </button>
      </header>

      <main className="flex items-center justify-center min-h-[calc(100vh-80px)] px-6 py-12">
        <div className="max-w-md w-full">
          {/* Escrow Card */}
          <div className="rounded-2xl border-2 border-[#295c4f] bg-white p-8 shadow-lg">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#295c4f]/10 mb-4">
                <Shield className="size-8 text-[#295c4f]" />
              </div>
              <h1 className="text-3xl font-bold text-[#111827] mb-2" style={{ fontFamily: "Outfit, DM Sans, sans-serif" }}>
                {released ? "Funds Released!" : "Release Escrow Funds"}
              </h1>
              <p className="text-[#6b7280]">
                {released ? "The funds have been released to the worker" : "Release payment to the worker"}
              </p>
            </div>

            {/* Details */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between p-4 bg-[#f9fafb] rounded-xl">
                <div className="flex items-center gap-3">
                  <DollarSign className="size-5 text-[#295c4f]" />
                  <span className="text-sm text-[#4a4a4a]">Amount</span>
                </div>
                <span className="text-lg font-bold text-[#111827]">
                  ${parseFloat(escrowData.amount).toFixed(2)} USDT
                </span>
              </div>

              <div className="p-4 bg-[#f9fafb] rounded-xl">
                <p className="text-xs text-[#6b7280] mb-1">Worker (Beneficiary)</p>
                <p className="text-sm font-mono text-[#111827] break-all">
                  {escrowData.beneficiary.slice(0, 6)}...{escrowData.beneficiary.slice(-4)}
                </p>
              </div>

              <div className={`p-4 rounded-xl ${
                escrowData.status === EscrowStatus.RELEASED
                  ? "bg-[#10b981]/10"
                  : escrowData.status === EscrowStatus.LOCKED
                    ? "bg-[#f59e0b]/10"
                    : "bg-[#3b82f6]/10"
              }`}>
                <p className={`text-sm font-semibold text-center ${
                  escrowData.status === EscrowStatus.RELEASED
                    ? "text-[#10b981]"
                    : escrowData.status === EscrowStatus.LOCKED
                      ? "text-[#f59e0b]"
                      : "text-[#3b82f6]"
                }`}>
                  {escrowData.status === EscrowStatus.RELEASED
                    ? "✅ Released"
                    : escrowData.status === EscrowStatus.LOCKED
                      ? "🔒 Locked"
                      : "📝 Created"}
                </p>
              </div>
            </div>

            {/* Action */}
            {released ? (
              <div className="text-center py-4">
                <CheckCircle className="size-12 text-[#10b981] mx-auto mb-4" />
                <p className="text-sm text-[#6b7280]">Funds have been successfully released!</p>
              </div>
            ) : !walletAddress ? (
              <div className="space-y-4">
                <p className="text-sm text-[#6b7280] text-center">Connect your wallet to release funds</p>
                <PrivyAuthButton />
              </div>
            ) : !isDepositor ? (
              <div className="p-4 bg-[#ef4444]/10 rounded-xl">
                <p className="text-sm text-[#ef4444] text-center">
                  Only the depositor can release funds
                </p>
              </div>
            ) : canRelease ? (
              <button
                onClick={handleRelease}
                disabled={releasing}
                className="w-full py-4 rounded-xl bg-[#295c4f] text-white font-semibold text-lg hover:bg-[#1f4a3f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {releasing ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Releasing...
                  </>
                ) : (
                  "Release Funds"
                )}
              </button>
            ) : (
              <div className="p-4 bg-[#6b7280]/10 rounded-xl">
                <p className="text-sm text-[#6b7280] text-center">
                  {escrowData.status === EscrowStatus.CREATED
                    ? "Funds must be locked first"
                    : "Funds already released"}
                </p>
              </div>
            )}
          </div>

          {/* Info */}
          {!released && (
            <p className="mt-6 text-xs text-[#6b7280] text-center">
              This action will transfer the escrowed funds to the worker's wallet
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

