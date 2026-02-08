import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatUnits } from "viem";
import { Users, DollarSign, Loader2 } from "lucide-react";
import { useUser } from "../context/UserContext";
import { useWalletClient } from "../features/tontine/hooks/useWalletClient";
import { useTontineWrite } from "../features/tontine/hooks/useTontineWrite";
import { useTontineToast } from "../features/tontine/context/ToastContext";
import { publicClient } from "../blockchain/viem";
import { TONTINE_CONTRACT_ADDRESS, USDT_DECIMALS } from "../features/tontine/config";
import { TONTINE_ABI } from "../features/tontine/abi";
import { PrivyAuthButton } from "../components/PrivyAuthButton";

export function TontineJoinPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { walletAddress } = useUser();
  const walletClient = useWalletClient();
  const { toast } = useTontineToast();
  const { joinTontine, txState, txError } = useTontineWrite(walletClient);

  const [tontineData, setTontineData] = useState<{
    contributionAmount: string;
    memberCount: number;
    active: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  // Fetch tontine details
  useEffect(() => {
    async function loadTontine() {
      if (!id || !TONTINE_CONTRACT_ADDRESS) {
        setError("Invalid tontine ID");
        setLoading(false);
        return;
      }

      try {
        const tontineId = BigInt(id);
        
        // Fetch tontine group data
        const groupData = await publicClient.readContract({
          address: TONTINE_CONTRACT_ADDRESS,
          abi: TONTINE_ABI,
          functionName: "tontineGroups",
          args: [tontineId],
        });

        const g = groupData as readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean];
        
        // Count members
        let memberCount = 0;
        for (let i = 0; i < 100; i++) {
          try {
            const member = await publicClient.readContract({
              address: TONTINE_CONTRACT_ADDRESS,
              abi: TONTINE_ABI,
              functionName: "tontineMembers",
              args: [tontineId, BigInt(i)],
            });
            if ((member as `0x${string}`) === "0x0000000000000000000000000000000000000000") {
              break;
            }
            memberCount++;
          } catch {
            break;
          }
        }

        setTontineData({
          contributionAmount: formatUnits(g[0], USDT_DECIMALS),
          memberCount,
          active: g[6],
        });
      } catch (err) {
        console.error("Error loading tontine:", err);
        setError(err instanceof Error ? err.message : "Failed to load tontine");
      } finally {
        setLoading(false);
      }
    }

    loadTontine();
  }, [id]);

  const handleJoin = useCallback(async () => {
    if (!id || !walletAddress || !walletClient) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!tontineData?.active) {
      toast.error("This tontine is not active");
      return;
    }

    setJoining(true);
    try {
      const result = await joinTontine(BigInt(id));
      if (result?.hash) {
        toast.success(`Transaction sent! Hash: ${result.hash.slice(0, 10)}...`);
        // Navigate to tontine list after a delay
        setTimeout(() => {
          navigate("/tontine");
        }, 2000);
      }
    } catch (err) {
      console.error("Error joining tontine:", err);
      toast.error(err instanceof Error ? err.message : "Failed to join tontine");
    } finally {
      setJoining(false);
    }
  }, [id, walletAddress, walletClient, tontineData, joinTontine, toast, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-[#295c4f] mx-auto mb-4" />
          <p className="text-[#4a4a4a]">Loading tontine details...</p>
        </div>
      </div>
    );
  }

  if (error || !tontineData) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-[#111827] mb-4">Tontine Not Found</h1>
          <p className="text-[#6b7280] mb-6">{error || "The tontine you're looking for doesn't exist."}</p>
          <button
            onClick={() => navigate("/tontine")}
            className="px-6 py-3 rounded-xl bg-[#295c4f] text-white font-semibold hover:bg-[#1f4a3f] transition-colors"
          >
            Go to Tontines
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <header className="px-6 py-6 border-b border-[#e5e7eb]">
        <button
          onClick={() => navigate("/tontine")}
          className="text-[#295c4f] hover:text-[#1f4a3f] transition-colors"
        >
          ← Back
        </button>
      </header>

      <main className="flex items-center justify-center min-h-[calc(100vh-80px)] px-6 py-12">
        <div className="max-w-md w-full">
          {/* Tontine Card */}
          <div className="rounded-2xl border-2 border-[#295c4f] bg-white p-8 shadow-lg">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#295c4f]/10 mb-4">
                <Users className="size-8 text-[#295c4f]" />
              </div>
              <h1 className="text-3xl font-bold text-[#111827] mb-2" style={{ fontFamily: "Outfit, DM Sans, sans-serif" }}>
                Join Tontine #{id}
              </h1>
              <p className="text-[#6b7280]">Scan this QR code to join instantly</p>
            </div>

            {/* Details */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between p-4 bg-[#f9fafb] rounded-xl">
                <div className="flex items-center gap-3">
                  <DollarSign className="size-5 text-[#295c4f]" />
                  <span className="text-sm text-[#4a4a4a]">Contribution</span>
                </div>
                <span className="text-lg font-bold text-[#111827]">
                  ${parseFloat(tontineData.contributionAmount).toFixed(2)} USDT
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#f9fafb] rounded-xl">
                <div className="flex items-center gap-3">
                  <Users className="size-5 text-[#295c4f]" />
                  <span className="text-sm text-[#4a4a4a]">Current Members</span>
                </div>
                <span className="text-lg font-bold text-[#111827]">{tontineData.memberCount}</span>
              </div>

              <div className={`p-4 rounded-xl ${tontineData.active ? "bg-[#10b981]/10" : "bg-[#ef4444]/10"}`}>
                <p className={`text-sm font-semibold text-center ${tontineData.active ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                  {tontineData.active ? "🟢 Active" : "🔴 Inactive"}
                </p>
              </div>
            </div>

            {/* Action */}
            {!walletAddress ? (
              <div className="space-y-4">
                <p className="text-sm text-[#6b7280] text-center">Connect your wallet to join</p>
                <PrivyAuthButton />
              </div>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining || !tontineData.active || txState === "confirming"}
                className="w-full py-4 rounded-xl bg-[#295c4f] text-white font-semibold text-lg hover:bg-[#1f4a3f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {joining || txState === "confirming" ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Pay & Join"
                )}
              </button>
            )}

            {txError && (
              <p className="mt-4 text-sm text-[#ef4444] text-center">{txError}</p>
            )}
          </div>

          {/* Info */}
          <p className="mt-6 text-xs text-[#6b7280] text-center">
            You'll need to approve USDT spending and pay the contribution amount to join
          </p>
        </div>
      </main>
    </div>
  );
}

