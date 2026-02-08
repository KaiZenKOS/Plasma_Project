import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatUnits } from "viem";
import { Users, DollarSign, Clock, CheckCircle, XCircle, Share2, Loader2, ArrowLeft } from "lucide-react";
import { useUser } from "../context/UserContext";
import { useWalletClient } from "../features/tontine/hooks/useWalletClient";
import { useTontineWrite } from "../features/tontine/hooks/useTontineWrite";
import { useTontineToast } from "../features/tontine/context/ToastContext";
import { publicClient } from "../blockchain/viem";
import { TONTINE_CONTRACT_ADDRESS, USDT_DECIMALS } from "../features/tontine/config";
import { TONTINE_ABI } from "../features/tontine/abi";
import { ShareQRCode } from "../components/ShareQRCode";
import { PrivyAuthButton } from "../components/PrivyAuthButton";

const EXPLORER_URL =
  typeof import.meta.env.VITE_PLASMA_EXPLORER_URL === "string" && import.meta.env.VITE_PLASMA_EXPLORER_URL
    ? import.meta.env.VITE_PLASMA_EXPLORER_URL
    : "https://testnet.plasmascan.to";

type TontineStatus = "Open" | "Running" | "Finished";

type TontineData = {
  id: number;
  contributionAmount: bigint;
  contributionAmountFormatted: string;
  frequencySeconds: number;
  collateralAmount: bigint;
  collateralAmountFormatted: string;
  currentTurnIndex: number;
  createdAt: bigint;
  nextDueAt: bigint;
  active: boolean;
  status: TontineStatus;
  members: `0x${string}`[];
  memberCount: number;
  creator: `0x${string}`;
  isUserMember: boolean;
  userTurnPosition: number | null;
  isUserTurn: boolean;
  currentBeneficiary: `0x${string}` | null;
  pendingWithdrawal: bigint;
  pendingWithdrawalFormatted: string;
};

// Format address for display
function formatAddress(address: string): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format date from timestamp
function formatDate(timestamp: bigint): string {
  if (timestamp === 0n) return "—";
  return new Date(Number(timestamp) * 1000).toLocaleString("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// Fetch all members for a tontine
async function fetchTontineMembers(tontineId: number): Promise<`0x${string}`[]> {
  if (!TONTINE_CONTRACT_ADDRESS) return [];

  const members: `0x${string}`[] = [];
  
  // Try to fetch members starting from index 0
  // Stop when we hit zero address or an error
  for (let memberIndex = 0; memberIndex < 100; memberIndex++) {
    try {
      const member = await publicClient.readContract({
        address: TONTINE_CONTRACT_ADDRESS,
        abi: TONTINE_ABI,
        functionName: "tontineMembers",
        args: [BigInt(tontineId), BigInt(memberIndex)],
      });
      
      const memberAddr = member as `0x${string}`;
      
      // Check for zero address (end of list)
      if (memberAddr === "0x0000000000000000000000000000000000000000") {
        break;
      }
      
      members.push(memberAddr);
    } catch {
      // No more members or error
      break;
    }
  }
  
  return members;
}

// Fetch complete tontine data from blockchain
async function fetchTontineDetails(tontineId: number, userAddress: string | null): Promise<TontineData | null> {
  if (!TONTINE_CONTRACT_ADDRESS) {
    throw new Error("Tontine contract address not configured");
  }

  try {
    // Fetch tontine group data
    const groupData = await publicClient.readContract({
      address: TONTINE_CONTRACT_ADDRESS,
      abi: TONTINE_ABI,
      functionName: "tontineGroups",
      args: [BigInt(tontineId)],
    });

    const g = groupData as readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean];

    // Fetch members
    const members = await fetchTontineMembers(tontineId);
    const creator = members.length > 0 ? members[0] : ("0x0000000000000000000000000000000000000000" as `0x${string}`);

    // Determine status
    let status: TontineStatus = "Open";
    if (g[6]) {
      // active = true
      status = members.length > 0 ? "Running" : "Open";
    } else {
      // active = false
      status = "Finished";
    }

    // Check if user is member
    let isUserMember = false;
    let userTurnPosition: number | null = null;
    if (userAddress) {
      try {
        isUserMember = await publicClient.readContract({
          address: TONTINE_CONTRACT_ADDRESS,
          abi: TONTINE_ABI,
          functionName: "isMember",
          args: [BigInt(tontineId), userAddress as `0x${string}`],
        }) as boolean;

        if (isUserMember) {
          userTurnPosition = members.findIndex((m) => m.toLowerCase() === userAddress.toLowerCase());
          if (userTurnPosition === -1) userTurnPosition = null;
        }
      } catch {
        // User is not a member
        isUserMember = false;
      }
    }

    // Get current beneficiary (member at currentTurnIndex)
    const currentBeneficiary = members.length > 0 && Number(g[3]) < members.length
      ? members[Number(g[3])]
      : null;

    // Check if it's user's turn
    const isUserTurn = userAddress && currentBeneficiary
      ? currentBeneficiary.toLowerCase() === userAddress.toLowerCase()
      : false;

    // Fetch pending withdrawal for user
    let pendingWithdrawal = 0n;
    let pendingWithdrawalFormatted = "0.00";
    if (userAddress) {
      try {
        pendingWithdrawal = await publicClient.readContract({
          address: TONTINE_CONTRACT_ADDRESS,
          abi: TONTINE_ABI,
          functionName: "pendingWithdrawals",
          args: [userAddress as `0x${string}`],
        }) as bigint;
        pendingWithdrawalFormatted = formatUnits(pendingWithdrawal, USDT_DECIMALS);
      } catch {
        // No pending withdrawal
      }
    }

    return {
      id: tontineId,
      contributionAmount: g[0],
      contributionAmountFormatted: formatUnits(g[0], USDT_DECIMALS),
      frequencySeconds: Number(g[1]),
      collateralAmount: g[2],
      collateralAmountFormatted: formatUnits(g[2], USDT_DECIMALS),
      currentTurnIndex: Number(g[3]),
      createdAt: g[4],
      nextDueAt: g[5],
      active: g[6],
      status,
      members,
      memberCount: members.length,
      creator,
      isUserMember,
      userTurnPosition,
      isUserTurn,
      currentBeneficiary,
      pendingWithdrawal,
      pendingWithdrawalFormatted,
    };
  } catch (err) {
    console.error("Error fetching tontine details:", err);
    throw err;
  }
}

export function TontineDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { walletAddress } = useUser();
  const walletClient = useWalletClient();
  const { toast } = useTontineToast();
  const { joinTontine, payContribution, withdraw, txState, txError } = useTontineWrite(walletClient);

  const [tontineData, setTontineData] = useState<TontineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [paying, setPaying] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Load tontine details
  useEffect(() => {
    async function loadTontine() {
      if (!id || !TONTINE_CONTRACT_ADDRESS) {
        setError("Invalid tontine ID or contract not configured");
        setLoading(false);
        return;
      }

      try {
        const tontineId = parseInt(id, 10);
        if (isNaN(tontineId)) {
          setError("Invalid tontine ID format");
          setLoading(false);
          return;
        }

        const data = await fetchTontineDetails(tontineId, walletAddress);
        if (!data) {
          setError("Tontine not found");
        } else {
          setTontineData(data);
        }
      } catch (err) {
        console.error("Error loading tontine:", err);
        setError(err instanceof Error ? err.message : "Failed to load tontine");
      } finally {
        setLoading(false);
      }
    }

    loadTontine();
  }, [id, walletAddress]);

  const handleJoin = useCallback(async () => {
    if (!id || !walletAddress || !walletClient) {
      toast("Please connect your wallet first", "error");
      return;
    }

    if (!tontineData?.active || tontineData.status !== "Open") {
      toast("This tontine is not open for joining", "error");
      return;
    }

    setJoining(true);
    try {
      const result = await joinTontine(BigInt(id));
      if (result?.hash) {
        toast(`Transaction sent! Hash: ${result.hash.slice(0, 10)}...`, "success");
        // Trigger history refresh
        window.dispatchEvent(new CustomEvent("transaction-confirmed", { detail: { txHash: result.hash } }));
        // Reload tontine data after a delay
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    } catch (err) {
      console.error("Error joining tontine:", err);
      toast(err instanceof Error ? err.message : "Failed to join tontine", "error");
    } finally {
      setJoining(false);
    }
  }, [id, walletAddress, walletClient, tontineData, joinTontine, toast]);

  const handlePayContribution = useCallback(async () => {
    if (!id || !walletAddress || !walletClient) {
      toast("Please connect your wallet first", "error");
      return;
    }

    if (!tontineData?.isUserMember) {
      toast("You are not a member of this tontine", "error");
      return;
    }

    setPaying(true);
    try {
      const result = await payContribution(BigInt(id));
      if (result?.hash) {
        toast(`Transaction sent! Hash: ${result.hash.slice(0, 10)}...`, "success");
        // Trigger history refresh
        window.dispatchEvent(new CustomEvent("transaction-confirmed", { detail: { txHash: result.hash } }));
        // Reload tontine data after a delay
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    } catch (err) {
      console.error("Error paying contribution:", err);
      toast(err instanceof Error ? err.message : "Failed to pay contribution", "error");
    } finally {
      setPaying(false);
    }
  }, [id, walletAddress, walletClient, tontineData, payContribution, toast]);

  const handleWithdraw = useCallback(async () => {
    if (!walletAddress || !walletClient) {
      toast("Please connect your wallet first", "error");
      return;
    }

    if (!tontineData || tontineData.pendingWithdrawal === 0n) {
      toast("No pending withdrawal available", "error");
      return;
    }

    setWithdrawing(true);
    try {
      const result = await withdraw();
      if (result?.hash) {
        toast(`Transaction sent! Hash: ${result.hash.slice(0, 10)}...`, "success");
        // Trigger history refresh
        window.dispatchEvent(new CustomEvent("transaction-confirmed", { detail: { txHash: result.hash } }));
        // Reload tontine data after a delay
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    } catch (err) {
      console.error("Error withdrawing:", err);
      toast(err instanceof Error ? err.message : "Failed to withdraw", "error");
    } finally {
      setWithdrawing(false);
    }
  }, [walletAddress, walletClient, tontineData, withdraw, toast]);

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
          <XCircle className="size-16 text-[#ef4444] mx-auto mb-4" />
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

  const frequencyLabel = tontineData.frequencySeconds >= 30 * 24 * 60 * 60 ? "Monthly" : "Weekly";
  const canJoin = !tontineData.isUserMember && tontineData.status === "Open";
  const canPay = tontineData.isUserMember && tontineData.status === "Running";
  const canWithdraw = tontineData.pendingWithdrawal > 0n;

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      {/* Header */}
      <header className="px-6 py-6 border-b border-[#e5e7eb] bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/tontine")}
            className="flex items-center gap-2 text-[#295c4f] hover:text-[#1f4a3f] transition-colors"
          >
            <ArrowLeft className="size-5" />
            <span>Back</span>
          </button>
          <h1 className="text-xl font-bold text-[#295c4f]" style={{ fontFamily: "Outfit, DM Sans, sans-serif" }}>
            Tontine #{tontineData.id}
          </h1>
          {tontineData.active && (
            <button
              onClick={() => setShowShareModal(true)}
              className="p-2 rounded-xl border border-[#295c4f] text-[#295c4f] hover:bg-[#295c4f] hover:text-white transition-colors"
              title="Share / Invite"
            >
              <Share2 className="size-5" />
            </button>
          )}
          {!tontineData.active && <div className="w-12" />}
        </div>
      </header>

      <main className="px-6 py-8 space-y-6 max-w-4xl mx-auto">
        {/* Status Badge */}
        <div className="flex items-center justify-center">
          <span
            className={`text-sm font-semibold px-4 py-2 rounded-full ${
              tontineData.status === "Running"
                ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20"
                : tontineData.status === "Open"
                  ? "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20"
                  : "bg-[#6b7280]/10 text-[#6b7280] border border-[#6b7280]/20"
            }`}
          >
            {tontineData.status === "Running" && "🟢 Running"}
            {tontineData.status === "Open" && "⚪ Open"}
            {tontineData.status === "Finished" && "🔴 Finished"}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
            <p className="text-xs text-[#4a4a4a] mb-1">Contribution</p>
            <p className="text-xl font-bold text-[#295c4f]">
              ${parseFloat(tontineData.contributionAmountFormatted).toFixed(2)} USDT
            </p>
          </div>
          <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
            <p className="text-xs text-[#4a4a4a] mb-1">Members</p>
            <p className="text-xl font-bold text-[#295c4f]">{tontineData.memberCount}</p>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 space-y-4">
          <h2 className="text-lg font-bold text-[#111827]">Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#6b7280]">Frequency</span>
              <span className="font-medium text-[#111827]">{frequencyLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6b7280]">Collateral</span>
              <span className="font-medium text-[#111827]">
                ${parseFloat(tontineData.collateralAmountFormatted).toFixed(2)} USDT
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6b7280]">Current Turn</span>
              <span className="font-medium text-[#111827]">#{tontineData.currentTurnIndex + 1}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6b7280]">Created</span>
              <span className="font-medium text-[#111827]">{formatDate(tontineData.createdAt)}</span>
            </div>
            {tontineData.nextDueAt > 0n && (
              <div className="flex items-center justify-between">
                <span className="text-[#6b7280]">Next Due</span>
                <span className="font-medium text-[#111827]">{formatDate(tontineData.nextDueAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Members List */}
        {tontineData.members.length > 0 && (
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
              <Users className="size-5 text-[#295c4f]" />
              Members ({tontineData.memberCount})
            </h2>
            <div className="space-y-2">
              {tontineData.members.map((member, index) => {
                const isCurrentBeneficiary = index === tontineData.currentTurnIndex;
                const isUser = walletAddress && member.toLowerCase() === walletAddress.toLowerCase();
                
                return (
                  <div
                    key={member}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      isCurrentBeneficiary
                        ? "border-[#295c4f] bg-[#295c4f]/5"
                        : "border-[#e5e7eb] bg-[#f8fafc]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCurrentBeneficiary
                          ? "bg-[#295c4f] text-white"
                          : "bg-[#e5e7eb] text-[#4a4a4a]"
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-mono text-sm text-[#111827]">{formatAddress(member)}</p>
                        {isUser && <p className="text-xs text-[#295c4f]">(You)</p>}
                      </div>
                    </div>
                    {isCurrentBeneficiary && (
                      <span className="text-xs font-semibold text-[#295c4f] bg-[#295c4f]/10 px-2 py-1 rounded">
                        Current Beneficiary
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending Withdrawal */}
        {canWithdraw && (
          <div className="rounded-2xl border-2 border-[#10b981] bg-[#10b981]/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#111827]">Pending Withdrawal</h3>
                <p className="text-sm text-[#6b7280]">You have funds ready to withdraw</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[#10b981]">
                  ${parseFloat(tontineData.pendingWithdrawalFormatted).toFixed(2)}
                </p>
                <p className="text-xs text-[#6b7280]">USDT</p>
              </div>
            </div>
            <button
              onClick={handleWithdraw}
              disabled={withdrawing || txState === "confirming"}
              className="w-full py-3 rounded-xl bg-[#10b981] text-white font-semibold hover:bg-[#059669] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {withdrawing || txState === "confirming" ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Processing...
                </>
              ) : (
                "Withdraw Funds"
              )}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!walletAddress ? (
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-6 text-center">
              <p className="text-sm text-[#6b7280] mb-4">Connect your wallet to interact with this tontine</p>
              <PrivyAuthButton />
            </div>
          ) : (
            <>
              {canJoin && (
                <button
                  onClick={handleJoin}
                  disabled={joining || txState === "confirming"}
                  className="w-full py-4 rounded-xl bg-[#295c4f] text-white font-semibold text-lg hover:bg-[#1f4a3f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {joining || txState === "confirming" ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="size-5" />
                      Join Tontine
                    </>
                  )}
                </button>
              )}

              {canPay && (
                <button
                  onClick={handlePayContribution}
                  disabled={paying || txState === "confirming"}
                  className="w-full py-4 rounded-xl bg-[#10b981] text-white font-semibold text-lg hover:bg-[#059669] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {paying || txState === "confirming" ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="size-5" />
                      Pay Contribution
                    </>
                  )}
                </button>
              )}

              {tontineData.isUserMember && tontineData.status === "Running" && !canPay && (
                <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4 text-center">
                  <p className="text-sm text-[#6b7280]">
                    {tontineData.isUserTurn
                      ? "It's your turn! Pay your contribution above."
                      : "Waiting for other members to pay their contributions."}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Error Display */}
        {txError && (
          <div className="rounded-xl border border-[#ef4444] bg-[#ef4444]/10 p-4 text-sm text-[#ef4444]">
            {txError}
          </div>
        )}
      </main>

      {/* Share QR Code Modal */}
      {showShareModal && (
        <ShareQRCode
          url={`${window.location.origin}/tontine/join/${tontineData.id}`}
          title={`Share Tontine #${tontineData.id}`}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

