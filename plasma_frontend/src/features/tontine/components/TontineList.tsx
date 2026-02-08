import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatUnits } from "viem";
import { DollarSign, Users, Shuffle, RefreshCw } from "lucide-react";
import { useUser } from "../../../context/UserContext";
import { TONTINE_CONTRACT_ADDRESS, USDT_DECIMALS } from "../config";
import { publicClient } from "../../../blockchain/viem";
import { TONTINE_ABI } from "../abi";

type TontineListProps = {
  onSelectTontine: (tontine: BlockchainTontine) => void;
};

// Raw data structure from blockchain
type TontineGroupData = readonly [
  bigint, // contributionAmount
  bigint, // frequencySeconds
  bigint, // collateralAmount
  bigint, // currentTurnIndex
  bigint, // createdAt
  bigint, // nextDueAt
  boolean, // active
];

// Processed tontine data for display
export type BlockchainTontine = {
  id: number;
  contributionAmount: bigint; // Raw BigInt
  contributionAmountFormatted: string; // Formatted with formatUnits
  frequencySeconds: number;
  collateralAmount: bigint;
  collateralAmountFormatted: string;
  currentTurnIndex: number;
  createdAt: bigint;
  nextDueAt: bigint;
  active: boolean;
  status: "Open" | "Running" | "Finished";
  members: `0x${string}`[];
  memberCount: number;
  creator: `0x${string}`;
};

// Helper to get random member for "Next Payout" display
function getRandomMember(members: string[]): string | null {
  if (members.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * members.length);
  return members[randomIndex];
}

// Format address for display
function formatAddress(address: string): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Avatar component for member display
function MemberAvatar({ address }: { address: string }) {
  const initials = address.slice(2, 4).toUpperCase();
  const colors = [
    "bg-gradient-to-br from-blue-500 to-blue-600",
    "bg-gradient-to-br from-green-500 to-green-600",
    "bg-gradient-to-br from-purple-500 to-purple-600",
    "bg-gradient-to-br from-orange-500 to-orange-600",
    "bg-gradient-to-br from-pink-500 to-pink-600",
  ];
  const colorIndex = parseInt(address.slice(2, 4), 16) % colors.length;
  
  return (
    <div className={`w-10 h-10 rounded-full ${colors[colorIndex]} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
      {initials}
    </div>
  );
}

// Progress bar component
function ProgressBar({ current, total }: { current: number; total?: number }) {
  if (total === undefined) {
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-[#10b981] h-2 rounded-full transition-all"
          style={{ width: `${Math.min((current / 10) * 100, 100)}%` }}
        ></div>
      </div>
    );
  }
  
  const percentage = Math.min((current / total) * 100, 100);
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-[#10b981] h-2 rounded-full transition-all"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
}

// Fetch members for a specific tontine ID
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

// Fetch all tontines directly from blockchain
async function fetchAllTontines(): Promise<BlockchainTontine[]> {
  if (!TONTINE_CONTRACT_ADDRESS) {
    console.warn("[TontineList] Contract address not configured");
    return [];
  }

  try {
    // Step 1: Read the counter (nextTontineId)
    console.log("[TontineList] Reading nextTontineId...");
    const nextId = await publicClient.readContract({
      address: TONTINE_CONTRACT_ADDRESS,
      abi: TONTINE_ABI,
      functionName: "nextTontineId",
    });

    const totalTontines = Number(nextId);
    console.log(`[TontineList] Found ${totalTontines} tontines (nextId: ${totalTontines})`);

    if (totalTontines === 0) {
      console.log("[TontineList] No tontines found");
      return [];
    }

    // Step 2: Fetch all tontine groups in parallel
    console.log(`[TontineList] Fetching ${totalTontines} tontine groups...`);
    const groupPromises = [];
    for (let id = 0; id < totalTontines; id++) {
      groupPromises.push(
        publicClient.readContract({
          address: TONTINE_CONTRACT_ADDRESS,
          abi: TONTINE_ABI,
          functionName: "tontineGroups",
          args: [BigInt(id)],
        }).catch((err) => {
          console.warn(`[TontineList] Failed to fetch tontine ${id}:`, err);
          return null;
        })
      );
    }

    const groupResults = await Promise.all(groupPromises);
    console.log(`[TontineList] Fetched ${groupResults.filter(r => r !== null).length} group results`);

    // Step 3: Process results and fetch members
    const tontines: BlockchainTontine[] = [];

    for (let id = 0; id < totalTontines; id++) {
      const groupData = groupResults[id];
      if (!groupData) {
        console.warn(`[TontineList] Skipping tontine ${id} (null data)`);
        continue;
      }

      try {
        const g = groupData as TontineGroupData;

        // Fetch members for this tontine
        const members = await fetchTontineMembers(id);
        const creator = members.length > 0 ? members[0] : ("0x0000000000000000000000000000000000000000" as `0x${string}`);

        // Map status: active boolean -> status string
        let status: "Open" | "Running" | "Finished" = "Open";
        if (g[6]) {
          // active = true
          status = "Running";
        } else {
          // active = false
          status = "Finished";
        }

        const tontine: BlockchainTontine = {
          id,
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
        };

        tontines.push(tontine);
        console.log(`[TontineList] Loaded tontine ${id}: ${members.length} members, status: ${status}`);
      } catch (err) {
        console.error(`[TontineList] Error processing tontine ${id}:`, err);
      }
    }

    console.log(`[TontineList] Successfully loaded ${tontines.length} tontines`);
    return tontines;
  } catch (err) {
    console.error("[TontineList] Error fetching tontines:", err);
    throw err;
  }
}

// Skeleton loader component
function TontineCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 animate-pulse shadow-sm">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
      <div className="h-2 bg-gray-200 rounded w-2/3 mb-6"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
    </div>
  );
}

// Tontine Card Component
function TontineCard({ 
  tontine, 
  onSelect,
  onJoin,
  userAddress 
}: { 
  tontine: BlockchainTontine; 
  onSelect: () => void;
  onJoin?: () => void;
  userAddress: string | null;
}) {
  const randomMember = getRandomMember(tontine.members);
  const isUserMember = userAddress
    ? tontine.members.some((m) => m.toLowerCase() === userAddress.toLowerCase())
    : false;
  const canJoin = !isUserMember && tontine.status === "Open";

  // Format amount for display (ensure 2 decimal places)
  const displayAmount = parseFloat(tontine.contributionAmountFormatted).toFixed(2);

  return (
    <div
      className="rounded-2xl border border-[#e5e7eb] bg-white p-6 flex flex-col gap-5 cursor-pointer hover:shadow-xl transition-all duration-200 hover:border-[#10b981]/30"
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      role="button"
      tabIndex={0}
    >
      {/* Header with Name and Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-xl text-[#111827] mb-1" style={{ fontFamily: "Outfit, DM Sans, sans-serif" }}>
            Tontine #{tontine.id}
          </h3>
          <p className="text-xs text-[#6b7280]">ID: {tontine.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap flex items-center gap-1.5 ${
              tontine.status === "Running"
                ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20"
                : tontine.status === "Open"
                  ? "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20"
                  : "bg-[#6b7280]/10 text-[#6b7280] border border-[#6b7280]/20"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                tontine.status === "Running"
                  ? "bg-[#10b981]"
                  : tontine.status === "Open"
                    ? "bg-[#f59e0b]"
                    : "bg-[#6b7280]"
              }`}
            ></span>
            {tontine.status}
          </span>
        </div>
      </div>

      {/* Amount - Big and Bold in Green */}
      <div className="bg-gradient-to-br from-[#10b981]/5 to-[#10b981]/10 rounded-xl p-4 border border-[#10b981]/20">
        <div className="flex items-baseline gap-2">
          <DollarSign className="size-5 text-[#10b981]" />
          <span className="text-3xl font-bold text-[#10b981]">
            ${displayAmount}
          </span>
          <span className="text-sm font-medium text-[#059669]">USDT</span>
        </div>
        <p className="text-xs text-[#6b7280] mt-1">Contribution per round</p>
      </div>

      {/* Members with Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-[#4b5563]">
            <Users className="size-4 text-[#10b981]" />
            <span className="font-medium">
              Members: <span className="text-[#111827] font-semibold">{tontine.memberCount}</span>
            </span>
          </div>
        </div>
        <ProgressBar current={tontine.memberCount} />
      </div>

      {/* Next to Pay - Highlighted */}
      {tontine.members.length > 0 && randomMember && (
        <div className="rounded-xl bg-gradient-to-br from-[#3b82f6]/5 to-[#8b5cf6]/5 p-4 border border-[#3b82f6]/20">
          <div className="flex items-center gap-2 mb-3">
            <Shuffle className="size-4 text-[#3b82f6]" />
            <span className="text-sm font-semibold text-[#1e40af]">🎲 Next to Pay</span>
          </div>
          <div className="flex items-center gap-3">
            <MemberAvatar address={randomMember} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#111827] truncate">{formatAddress(randomMember)}</p>
              <p className="text-xs text-[#6b7280]">Random selection</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto">
        {canJoin && onJoin ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onJoin();
              }}
              className="flex-1 py-3 rounded-xl bg-[#10b981] text-white font-semibold text-sm hover:bg-[#059669] transition-colors shadow-sm"
            >
              Join
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className="px-4 py-3 rounded-xl border border-[#d1d5db] text-[#4b5563] font-semibold text-sm hover:bg-[#f9fafb] transition-colors"
            >
              Details
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="w-full py-3 rounded-xl bg-[#111827] text-white font-semibold text-sm hover:bg-[#1f2937] transition-colors shadow-sm"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
}

export function TontineList({ onSelectTontine }: TontineListProps) {
  const { walletAddress } = useUser();
  const navigate = useNavigate();
  const [tontines, setTontines] = useState<BlockchainTontine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch all tontines from blockchain
  const loadTontines = useCallback(async () => {
    if (!TONTINE_CONTRACT_ADDRESS) {
      setError("Tontine contract address not configured");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedTontines = await fetchAllTontines();
      setTontines(fetchedTontines);
      console.log(`[TontineList] State updated with ${fetchedTontines.length} tontines`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load tontines from blockchain";
      console.error("[TontineList] Error:", errorMessage);
      setError(errorMessage);
      setTontines([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount and when refresh key changes
  useEffect(() => {
    loadTontines();
  }, [loadTontines, refreshKey]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    console.log("[TontineList] Manual refresh triggered");
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Handle select action - navigate to details page
  const handleSelect = (tontine: BlockchainTontine) => {
    if ("id" in tontine && tontine.id !== undefined) {
      navigate(`/tontine/${tontine.id}`);
    } else {
      // Fallback to old callback if no ID
      onSelectTontine(tontine);
    }
  };

  // Handle join action - navigate to join page
  const handleJoin = (tontine: BlockchainTontine) => {
    if ("id" in tontine && tontine.id !== undefined) {
      navigate(`/tontine/join/${tontine.id}`);
    } else {
      console.log("[TontineList] Join tontine:", tontine);
      onSelectTontine(tontine);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#111827]">Tontines</h2>
          <button
            onClick={handleRefresh}
            disabled
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#d1d5db] text-[#6b7280] text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className="size-4 animate-spin" />
            Loading...
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <TontineCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#111827]">Tontines</h2>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#d1d5db] text-[#6b7280] text-sm font-medium hover:bg-[#f9fafb] transition-colors"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </div>
        <div className="rounded-2xl border border-[#ef4444] bg-[#ef4444]/10 px-6 py-4 text-sm text-[#ef4444]">
          <p className="font-semibold">Error loading tontines:</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (tontines.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#111827]">Tontines</h2>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#d1d5db] text-[#6b7280] text-sm font-medium hover:bg-[#f9fafb] transition-colors"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </div>
        <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-12 text-center text-[#4a4a4a]">
          <p className="font-medium text-lg">No tontines found</p>
          <p className="text-sm mt-1 text-[#6b7280]">
            Create one to get started.
          </p>
        </div>
      </div>
    );
  }

  // Render tontines
  return (
    <div className="space-y-4">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#111827]">Tontines</h2>
          <p className="text-sm text-[#6b7280] mt-1">
            Showing {tontines.length} {tontines.length === 1 ? "tontine" : "tontines"} from blockchain
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#d1d5db] text-[#6b7280] text-sm font-medium hover:bg-[#f9fafb] hover:border-[#10b981] hover:text-[#10b981] transition-colors"
        >
          <RefreshCw className="size-4" />
          Refresh List
        </button>
      </div>

      {/* Tontines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tontines.map((tontine) => (
          <TontineCard
            key={`tontine-${tontine.id}`}
            tontine={tontine}
            userAddress={walletAddress}
            onSelect={() => handleSelect(tontine)}
            onJoin={!tontine.members.some((m) => m.toLowerCase() === walletAddress?.toLowerCase()) && tontine.status === "Open" ? () => handleJoin(tontine) : undefined}
          />
        ))}
      </div>

      {/* DEBUG MODE: Show raw data */}
      <div className="mt-8 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-[#111827] mb-2">🔍 Debug: Raw Blockchain Data</h3>
        <pre className="text-xs bg-white p-4 rounded-lg border border-[#e5e7eb] overflow-auto max-h-96">
          {JSON.stringify(
            tontines.map((t) => ({
              id: t.id,
              contributionAmount: t.contributionAmount.toString(),
              contributionAmountFormatted: t.contributionAmountFormatted,
              frequencySeconds: t.frequencySeconds,
              collateralAmount: t.collateralAmount.toString(),
              collateralAmountFormatted: t.collateralAmountFormatted,
              currentTurnIndex: t.currentTurnIndex,
              active: t.active,
              status: t.status,
              memberCount: t.memberCount,
              members: t.members,
              creator: t.creator,
            })),
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
