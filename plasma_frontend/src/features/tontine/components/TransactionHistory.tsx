import { useCallback, useEffect, useState } from "react";
import { formatUnits, decodeEventLog } from "viem";
import { Plus, UserPlus, DollarSign, ArrowUpRight, Download, RefreshCw, Shield, ShieldCheck } from "lucide-react";
import { useUser } from "../../../context/UserContext";
import { TONTINE_CONTRACT_ADDRESS, USDT_DECIMALS } from "../config";
import { publicClient } from "../../../blockchain/viem";
import { TONTINE_ABI } from "../abi";
import { ESCROW_SERVICE_ADDRESS, ESCROW_SERVICE_ABI } from "../../../blockchain/escrowService";
import { INSURANCE_CONTRACT_ADDRESS, INSURANCE_SERVICE_ABI } from "../../../blockchain/insuranceService";

// Unified history item interface
type HistoryItem = {
  id: string;
  type: "Creation" | "Payment/Join" | "Payout" | "Escrow" | "Insurance" | "Withdrawal";
  icon: React.ReactNode;
  label: string;
  amount: string | null;
  tontineId: number | null;
  escrowId: number | null;
  address: string | null;
  blockNumber: number;
  timestamp: number | null;
  txHash: `0x${string}`;
  explorerUrl: string;
  contractType: "Tontine" | "Escrow" | "Insurance";
};

const EXPLORER_URL =
  typeof import.meta.env.VITE_PLASMA_EXPLORER_URL === "string" && import.meta.env.VITE_PLASMA_EXPLORER_URL
    ? import.meta.env.VITE_PLASMA_EXPLORER_URL
    : "https://testnet.plasmascan.to";

// Format address for display
function formatAddress(address: string): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format date/time
function formatDate(timestamp: number | null, blockNumber: number): string {
  if (timestamp) {
    return new Date(timestamp * 1000).toLocaleString("en-US", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }
  return `Block #${blockNumber}`;
}

// Cache for block timestamps to avoid redundant requests
const blockTimestampCache = new Map<number, number>();

async function getBlockTimestamp(blockNumber: bigint): Promise<number | null> {
  const num = Number(blockNumber);
  if (blockTimestampCache.has(num)) {
    return blockTimestampCache.get(num)!;
  }
  try {
    const block = await publicClient.getBlock({ blockNumber });
    const timestamp = Number(block.timestamp);
    blockTimestampCache.set(num, timestamp);
    return timestamp;
  } catch (err) {
    console.warn(`[TransactionHistory] Failed to get timestamp for block ${num}:`, err);
    return null;
  }
}

// Fetch all transaction events from multiple contracts
async function fetchAllTransactionEvents(userAddress: string): Promise<HistoryItem[]> {
  if (!userAddress) {
    return [];
  }

  const allItems: HistoryItem[] = [];
  const currentBlock = await publicClient.getBlockNumber();

  // Fetch events in parallel from all contracts
  const eventPromises: Promise<HistoryItem[]>[] = [];

  // 1. Tontine Contract Events
  if (TONTINE_CONTRACT_ADDRESS) {
    const tontineEvents = [
      // TontineCreated - need to check transaction from address
      publicClient
        .getLogs({
          address: TONTINE_CONTRACT_ADDRESS,
          event: TONTINE_ABI.find((item) => item.type === "event" && item.name === "TontineCreated") as any,
          fromBlock: 0n,
          toBlock: currentBlock,
        })
        .then(async (logs) => {
          const items: HistoryItem[] = [];
          for (const log of logs) {
            try {
              const tx = await publicClient.getTransaction({ hash: log.transactionHash });
              if (tx.from.toLowerCase() === userAddress.toLowerCase()) {
                const decoded = decodeEventLog({
                  abi: TONTINE_ABI,
                  data: log.data,
                  topics: log.topics,
                });
                const timestamp = await getBlockTimestamp(log.blockNumber);
                items.push({
                  id: `${log.transactionHash}-${decoded.args.tontineId}`,
                  type: "Creation",
                  icon: <Plus className="size-5 text-[#10b981]" />,
                  label: `Created Tontine #${Number(decoded.args.tontineId)}`,
                  amount: formatUnits(decoded.args.contributionAmount as bigint, USDT_DECIMALS),
                  tontineId: Number(decoded.args.tontineId),
                  escrowId: null,
                  address: null,
                  blockNumber: Number(log.blockNumber),
                  timestamp,
                  txHash: log.transactionHash,
                  explorerUrl: `${EXPLORER_URL}/tx/${log.transactionHash}`,
                  contractType: "Tontine",
                });
              }
            } catch (err) {
              console.warn("[TransactionHistory] Error processing TontineCreated:", err);
            }
          }
          return items;
        })
        .catch(() => []),

      // MemberJoined
      publicClient
        .getLogs({
          address: TONTINE_CONTRACT_ADDRESS,
          event: TONTINE_ABI.find((item) => item.type === "event" && item.name === "MemberJoined") as any,
          args: { member: userAddress as `0x${string}` },
          fromBlock: 0n,
          toBlock: currentBlock,
        })
        .then(async (logs) => {
          const items: HistoryItem[] = [];
          for (const log of logs) {
            try {
              const decoded = decodeEventLog({
                abi: TONTINE_ABI,
                data: log.data,
                topics: log.topics,
              });
              const timestamp = await getBlockTimestamp(log.blockNumber);
              items.push({
                id: `${log.transactionHash}-${decoded.args.tontineId}-join`,
                type: "Payment/Join",
                icon: <UserPlus className="size-5 text-[#3b82f6]" />,
                label: `Joined Tontine #${Number(decoded.args.tontineId)}`,
                amount: null,
                tontineId: Number(decoded.args.tontineId),
                escrowId: null,
                address: decoded.args.member as `0x${string}`,
                blockNumber: Number(log.blockNumber),
                timestamp,
                txHash: log.transactionHash,
                explorerUrl: `${EXPLORER_URL}/tx/${log.transactionHash}`,
                contractType: "Tontine",
              });
            } catch (err) {
              console.warn("[TransactionHistory] Error processing MemberJoined:", err);
            }
          }
          return items;
        })
        .catch(() => []),

      // ContributionPaid
      publicClient
        .getLogs({
          address: TONTINE_CONTRACT_ADDRESS,
          event: TONTINE_ABI.find((item) => item.type === "event" && item.name === "ContributionPaid") as any,
          args: { member: userAddress as `0x${string}` },
          fromBlock: 0n,
          toBlock: currentBlock,
        })
        .then(async (logs) => {
          const items: HistoryItem[] = [];
          for (const log of logs) {
            try {
              const decoded = decodeEventLog({
                abi: TONTINE_ABI,
                data: log.data,
                topics: log.topics,
              });
              const timestamp = await getBlockTimestamp(log.blockNumber);
              items.push({
                id: `${log.transactionHash}-${decoded.args.tontineId}-contribution`,
                type: "Payment/Join",
                icon: <DollarSign className="size-5 text-[#f59e0b]" />,
                label: `Paid contribution to Tontine #${Number(decoded.args.tontineId)}`,
                amount: formatUnits(decoded.args.amount as bigint, USDT_DECIMALS),
                tontineId: Number(decoded.args.tontineId),
                escrowId: null,
                address: decoded.args.member as `0x${string}`,
                blockNumber: Number(log.blockNumber),
                timestamp,
                txHash: log.transactionHash,
                explorerUrl: `${EXPLORER_URL}/tx/${log.transactionHash}`,
                contractType: "Tontine",
              });
            } catch (err) {
              console.warn("[TransactionHistory] Error processing ContributionPaid:", err);
            }
          }
          return items;
        })
        .catch(() => []),

      // PayoutSent
      publicClient
        .getLogs({
          address: TONTINE_CONTRACT_ADDRESS,
          event: TONTINE_ABI.find((item) => item.type === "event" && item.name === "PayoutSent") as any,
          args: { beneficiary: userAddress as `0x${string}` },
          fromBlock: 0n,
          toBlock: currentBlock,
        })
        .then(async (logs) => {
          const items: HistoryItem[] = [];
          for (const log of logs) {
            try {
              const decoded = decodeEventLog({
                abi: TONTINE_ABI,
                data: log.data,
                topics: log.topics,
              });
              const timestamp = await getBlockTimestamp(log.blockNumber);
              items.push({
                id: `${log.transactionHash}-${decoded.args.tontineId}-payout`,
                type: "Payout",
                icon: <ArrowUpRight className="size-5 text-[#10b981]" />,
                label: `Received payout from Tontine #${Number(decoded.args.tontineId)}`,
                amount: formatUnits(decoded.args.amount as bigint, USDT_DECIMALS),
                tontineId: Number(decoded.args.tontineId),
                escrowId: null,
                address: decoded.args.beneficiary as `0x${string}`,
                blockNumber: Number(log.blockNumber),
                timestamp,
                txHash: log.transactionHash,
                explorerUrl: `${EXPLORER_URL}/tx/${log.transactionHash}`,
                contractType: "Tontine",
              });
            } catch (err) {
              console.warn("[TransactionHistory] Error processing PayoutSent:", err);
            }
          }
          return items;
        })
        .catch(() => []),

      // Withdrawal
      publicClient
        .getLogs({
          address: TONTINE_CONTRACT_ADDRESS,
          event: TONTINE_ABI.find((item) => item.type === "event" && item.name === "Withdrawal") as any,
          args: { user: userAddress as `0x${string}` },
          fromBlock: 0n,
          toBlock: currentBlock,
        })
        .then(async (logs) => {
          const items: HistoryItem[] = [];
          for (const log of logs) {
            try {
              const decoded = decodeEventLog({
                abi: TONTINE_ABI,
                data: log.data,
                topics: log.topics,
              });
              const timestamp = await getBlockTimestamp(log.blockNumber);
              items.push({
                id: `${log.transactionHash}-withdrawal`,
                type: "Withdrawal",
                icon: <Download className="size-5 text-[#8b5cf6]" />,
                label: "Withdrew funds",
                amount: formatUnits(decoded.args.amount as bigint, USDT_DECIMALS),
                tontineId: null,
                escrowId: null,
                address: decoded.args.user as `0x${string}`,
                blockNumber: Number(log.blockNumber),
                timestamp,
                txHash: log.transactionHash,
                explorerUrl: `${EXPLORER_URL}/tx/${log.transactionHash}`,
                contractType: "Tontine",
              });
            } catch (err) {
              console.warn("[TransactionHistory] Error processing Withdrawal:", err);
            }
          }
          return items;
        })
        .catch(() => []),
    ];

    eventPromises.push(...tontineEvents);
  }

  // 2. Escrow Contract Events
  if (ESCROW_SERVICE_ADDRESS) {
    const escrowEvents = [
      // EscrowCreated - filter by depositor
      publicClient
        .getLogs({
          address: ESCROW_SERVICE_ADDRESS,
          event: ESCROW_SERVICE_ABI.find((item) => item.type === "event" && item.name === "EscrowCreated") as any,
          args: { depositor: userAddress as `0x${string}` },
          fromBlock: 0n,
          toBlock: currentBlock,
        })
        .then(async (logs) => {
          const items: HistoryItem[] = [];
          for (const log of logs) {
            try {
              const decoded = decodeEventLog({
                abi: ESCROW_SERVICE_ABI,
                data: log.data,
                topics: log.topics,
              });
              const timestamp = await getBlockTimestamp(log.blockNumber);
              items.push({
                id: `${log.transactionHash}-escrow-${decoded.args.escrowId}`,
                type: "Escrow",
                icon: <Shield className="size-5 text-[#3b82f6]" />,
                label: `Created Escrow #${Number(decoded.args.escrowId)}`,
                amount: formatUnits(decoded.args.amount as bigint, USDT_DECIMALS),
                tontineId: null,
                escrowId: Number(decoded.args.escrowId),
                address: decoded.args.beneficiary as `0x${string}`,
                blockNumber: Number(log.blockNumber),
                timestamp,
                txHash: log.transactionHash,
                explorerUrl: `${EXPLORER_URL}/tx/${log.transactionHash}`,
                contractType: "Escrow",
              });
            } catch (err) {
              console.warn("[TransactionHistory] Error processing EscrowCreated:", err);
            }
          }
          return items;
        })
        .catch(() => []),

      // EscrowReleased - filter by beneficiary
      publicClient
        .getLogs({
          address: ESCROW_SERVICE_ADDRESS,
          event: ESCROW_SERVICE_ABI.find((item) => item.type === "event" && item.name === "EscrowReleased") as any,
          args: { beneficiary: userAddress as `0x${string}` },
          fromBlock: 0n,
          toBlock: currentBlock,
        })
        .then(async (logs) => {
          const items: HistoryItem[] = [];
          for (const log of logs) {
            try {
              const decoded = decodeEventLog({
                abi: ESCROW_SERVICE_ABI,
                data: log.data,
                topics: log.topics,
              });
              const timestamp = await getBlockTimestamp(log.blockNumber);
              items.push({
                id: `${log.transactionHash}-escrow-release-${decoded.args.escrowId}`,
                type: "Escrow",
                icon: <ShieldCheck className="size-5 text-[#10b981]" />,
                label: `Received Escrow #${Number(decoded.args.escrowId)}`,
                amount: formatUnits(decoded.args.amount as bigint, USDT_DECIMALS),
                tontineId: null,
                escrowId: Number(decoded.args.escrowId),
                address: decoded.args.beneficiary as `0x${string}`,
                blockNumber: Number(log.blockNumber),
                timestamp,
                txHash: log.transactionHash,
                explorerUrl: `${EXPLORER_URL}/tx/${log.transactionHash}`,
                contractType: "Escrow",
              });
            } catch (err) {
              console.warn("[TransactionHistory] Error processing EscrowReleased:", err);
            }
          }
          return items;
        })
        .catch(() => []),
    ];

    eventPromises.push(...escrowEvents);
  }

  // 3. Insurance Contract Events (if available)
  // Note: Insurance contract may not have events, so we'll skip for now
  // If events are added later, they can be included here

  // Execute all event fetches in parallel
  const results = await Promise.all(eventPromises);
  const allItems = results.flat();

  // Sort by block number (newest first)
  allItems.sort((a, b) => b.blockNumber - a.blockNumber);

  console.log(`[TransactionHistory] Fetched ${allItems.length} transactions from blockchain`);
  return allItems;
}

export function TransactionHistory() {
  const { walletAddress } = useUser();
  const [transactions, setTransactions] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTransactions = useCallback(async () => {
    if (!walletAddress) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const events = await fetchAllTransactionEvents(walletAddress);
      setTransactions(events);
      console.log(`[TransactionHistory] Loaded ${events.length} transactions`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load transaction history";
      console.error("[TransactionHistory] Error:", errorMessage);
      setError(errorMessage);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions, refreshKey]);

  const handleRefresh = useCallback(() => {
    console.log("[TransactionHistory] Manual refresh triggered");
    // Clear timestamp cache on refresh
    blockTimestampCache.clear();
    setRefreshKey((prev) => prev + 1);
  }, []);

  if (!walletAddress) {
    return (
      <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-12 text-center text-[#4a4a4a]">
        <p className="font-medium">Connect your wallet</p>
        <p className="text-sm mt-1">To see your transaction history</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#111827]">Transaction History</h2>
          <button
            onClick={handleRefresh}
            disabled
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#d1d5db] text-[#6b7280] text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className="size-4 animate-spin" />
            Loading...
          </button>
        </div>
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#111827]">Transaction History</h2>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#d1d5db] text-[#6b7280] text-sm font-medium hover:bg-[#f9fafb] transition-colors"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </div>
        <div className="rounded-2xl border border-[#ef4444] bg-[#ef4444]/10 px-6 py-4 text-sm text-[#ef4444]">
          <p className="font-semibold">Error loading transaction history:</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#111827]">Transaction History</h2>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#d1d5db] text-[#6b7280] text-sm font-medium hover:bg-[#f9fafb] transition-colors"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </div>
        <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-12 text-center text-[#4a4a4a]">
          <p className="font-medium">No transactions found on Plasma Testnet yet</p>
          <p className="text-sm mt-1">Your transactions will appear here once you interact with tontines, escrows, or other services</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#111827]">Transaction History</h2>
          <p className="text-sm text-[#6b7280] mt-1">
            Showing {transactions.length} {transactions.length === 1 ? "transaction" : "transactions"} from blockchain
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#d1d5db] text-[#6b7280] text-sm font-medium hover:bg-[#f9fafb] hover:border-[#10b981] hover:text-[#10b981] transition-colors"
        >
          <RefreshCw className="size-4" />
          Refresh
        </button>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {transactions.map((tx) => (
          <a
            key={tx.id}
            href={tx.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl bg-white border border-[#e5e7eb] px-4 py-4 hover:bg-[#f9fafb] hover:border-[#10b981]/30 transition-all group"
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {/* Icon */}
              <div className="flex items-center justify-center size-12 rounded-full bg-[#f3f4f6] shrink-0 group-hover:bg-[#10b981]/10 transition-colors">
                {tx.icon}
              </div>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#111827] truncate">{tx.label}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#f3f4f6] text-[#6b7280] shrink-0">
                    {tx.contractType}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs text-[#6b7280]">{formatDate(tx.timestamp, tx.blockNumber)}</p>
                  {tx.tontineId !== null && (
                    <>
                      <span className="text-xs text-[#9ca3af]">•</span>
                      <p className="text-xs text-[#6b7280]">Tontine #{tx.tontineId}</p>
                    </>
                  )}
                  {tx.escrowId !== null && (
                    <>
                      <span className="text-xs text-[#9ca3af]">•</span>
                      <p className="text-xs text-[#6b7280]">Escrow #{tx.escrowId}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Amount */}
              {tx.amount && (
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-semibold text-[#10b981]">
                    {tx.type === "Payout" || tx.type === "Escrow" || tx.type === "Withdrawal" ? "+" : ""}
                    {parseFloat(tx.amount).toFixed(2)} USDT
                  </p>
                </div>
              )}
            </div>

            {/* Arrow */}
            <ArrowUpRight className="size-5 text-[#9ca3af] shrink-0 ml-2 group-hover:text-[#10b981] transition-colors" />
          </a>
        ))}
      </div>
    </div>
  );
}
