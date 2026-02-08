import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { Users, ShieldCheck, DollarSign, Plus, UserPlus, ArrowUpRight, Download, RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import { useUser } from "../context/UserContext";
import { publicClient } from "../blockchain/viem";
import { TONTINE_CONTRACT_ADDRESS, USDT_DECIMALS } from "../features/tontine/config";
import { TONTINE_ABI } from "../features/tontine/abi";
import { ESCROW_SERVICE_ADDRESS, ESCROW_SERVICE_ABI } from "../blockchain/escrowService";

const EXPLORER_URL =
  typeof import.meta.env.VITE_PLASMA_EXPLORER_URL === "string" && import.meta.env.VITE_PLASMA_EXPLORER_URL
    ? import.meta.env.VITE_PLASMA_EXPLORER_URL
    : "https://testnet.plasmascan.to";

// Unified history item type
type HistoryItem = {
  id: string; // Unique identifier: `${contract}-${txHash}-${logIndex}`
  type: "TontineCreated" | "TontineJoined" | "TontineContribution" | "TontinePayout" | "TontineWithdrawal" | "EscrowCreated" | "EscrowReleased";
  contract: "Tontine" | "Escrow";
  title: string;
  description: string;
  icon: React.ReactNode;
  amount: string | null; // Formatted USDT amount
  amountRaw: bigint | null; // Raw amount for sorting
  tontineId: number | null;
  escrowId: number | null;
  blockNumber: number;
  blockTimestamp: number | null;
  txHash: `0x${string}`;
  explorerUrl: string;
};

// Format address for display
function formatAddress(address: string): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format date from timestamp
function formatDate(timestamp: number | null, blockNumber: number): string {
  if (timestamp) {
    return new Date(timestamp * 1000).toLocaleString("en-US", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }
  return `Block #${blockNumber}`;
}

// Fetch all history events from both contracts
async function fetchSmartHistory(userAddress: string): Promise<HistoryItem[]> {
  if (!userAddress) return [];

  const items: HistoryItem[] = [];

  try {
    // Get current block number
    const currentBlock = await publicClient.getBlockNumber();
    console.log("[SmartHistory] Current block:", Number(currentBlock));

    // Fetch events in parallel from both contracts
    const eventPromises: Promise<HistoryItem[]>[] = [];

    // ===== TONTINE CONTRACT EVENTS =====
    if (TONTINE_CONTRACT_ADDRESS) {
      // Find event definitions
      const tontineCreatedEvent = TONTINE_ABI.find((item) => item.type === "event" && item.name === "TontineCreated");
      const memberJoinedEvent = TONTINE_ABI.find((item) => item.type === "event" && item.name === "MemberJoined");
      const contributionPaidEvent = TONTINE_ABI.find((item) => item.type === "event" && item.name === "ContributionPaid");
      const payoutSentEvent = TONTINE_ABI.find((item) => item.type === "event" && item.name === "PayoutSent");
      const withdrawalEvent = TONTINE_ABI.find((item) => item.type === "event" && item.name === "Withdrawal");

      // TontineCreated - need to check transaction from address
      if (tontineCreatedEvent) {
        eventPromises.push(
          publicClient
            .getLogs({
              address: TONTINE_CONTRACT_ADDRESS,
              event: tontineCreatedEvent as any,
              fromBlock: 0n,
              toBlock: currentBlock,
            })
            .then(async (logs) => {
              const tontineItems: HistoryItem[] = [];
              for (const log of logs) {
                try {
                  // Check if user is the creator by checking transaction from address
                  const tx = await publicClient.getTransaction({ hash: log.transactionHash });
                  if (tx.from.toLowerCase() === userAddress.toLowerCase()) {
                    const decoded = publicClient.decodeEventLog({
                      abi: TONTINE_ABI,
                      data: log.data,
                      topics: log.topics,
                    });

                    let blockTimestamp: number | null = null;
                    try {
                      const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
                      blockTimestamp = Number(block.timestamp);
                    } catch {}

                    const args = decoded.args as { tontineId: bigint; contributionAmount: bigint; frequencySeconds: bigint; collateralAmount: bigint };
                    const amount = args.contributionAmount;

                    tontineItems.push({
                      id: `tontine-${log.transactionHash}-${log.logIndex}`,
                      type: "TontineCreated",
                      contract: "Tontine",
                      title: `Tontine Creation #${Number(args.tontineId)}`,
                      description: `Created a new tontine with ${formatUnits(amount, USDT_DECIMALS)} USDT contribution`,
                      icon: <Users className="size-5 text-[#295c4f]" />,
                      amount: formatUnits(amount, USDT_DECIMALS),
                      amountRaw: amount,
                      tontineId: Number(args.tontineId),
                      escrowId: null,
                      blockNumber: Number(log.blockNumber),
                      blockTimestamp,
                      txHash: log.transactionHash,
                      explorerUrl: `${EXPLORER_URL}/tx/${log.transactionHash}`,
                    });
                  }
                } catch (err) {
                  console.warn("[SmartHistory] Error processing TontineCreated log:", err);
                }
              }
              return tontineItems;
            })
            .catch(() => [])
        );
      }

      // MemberJoined - filter by member address
      if (memberJoinedEvent) {
        eventPromises.push(
          publicClient
            .getLogs({
              address: TONTINE_CONTRACT_ADDRESS,
              event: memberJoinedEvent as any,
              args: {
                member: userAddress as `0x${string}`,
              },
              fromBlock: 0n,
              toBlock: currentBlock,
            })
            .then(async (logs) => {
              const items: HistoryItem[] = [];
              for (const log of logs) {
                try {
                  const decoded = publicClient.decodeEventLog({
                    abi: TONTINE_ABI,
                    data: log.data,
                    topics: log.topics,
                  });

                  let blockTimestamp: number | null = null;
                  try {
                    const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
                    blockTimestamp = Number(block.timestamp);
                  } catch {}

                  const args = decoded.args as { tontineId: bigint; member: `0x${string}`; turnPosition: bigint };

                  items.push({
                    id: `tontine-${log.transactionHash}-${log.logIndex}`,
                    type: "TontineJoined",
                    contract: "Tontine",
                    title: `Joined Tontine #${Number(args.tontineId)}`,
                    description: `Joined as member at position ${Number(args.turnPosition) + 1}`,
                    icon: <UserPlus className="size-5 text-[#3b82f6]" />,
                    amount: null,
                    amountRaw: null,
                    tontineId: Number(args.tontineId),
                    escrowId: null,
                    blockNumber: Number(log.blockNumber),
                    blockTimestamp,
                    txHash: log.transactionHash,
                    explorerUrl: `${EXPLORER_URL}/tx/${log.transactionHash}`,
                  });
                } catch (err) {
                  console.warn("[SmartHistory] Error processing MemberJoined log:", err);
                }
              }
              return items;
            })
            .catch(() => [])
        );
      }

      // ContributionPaid - filter by member address
      if (contributionPaidEvent) {
        eventPromises.push(
          publicClient
            .getLogs({
              address: TONTINE_CONTRACT_ADDRESS,
              event: contributionPaidEvent as any,
              args: {
                member: userAddress as `0x${string}`,
              },
              fromBlock: 0n,
              toBlock: currentBlock,
            })
            .then(async (logs) => {
              const items: HistoryItem[] = [];
              for (const log of logs) {
                try {
                  const decoded = publicClient.decodeEventLog({
                    abi: TONTINE_ABI,
                    data: log.data,
                    topics: log.topics,
                  });

                  let blockTimestamp: number | null = null;
                  try {
                    const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
                    blockTimestamp = Number(block.timestamp);
                  } catch {}

                  const args = decoded.args as { tontineId: bigint; member: `0x${string}`; amount: bigint; turnIndex: bigint };

                  items.push({
                    id: `tontine-${log.transactionHash}-${log.logIndex}`,
                    type: "TontineContribution",
                    contract: "Tontine",
                    title: `Paid Contribution to Tontine #${Number(args.tontineId)}`,
                    description: `Turn ${Number(args.turnIndex) + 1} contribution`,
                    icon: <DollarSign className="size-5 text-[#f59e0b]" />,
                    amount: formatUnits(args.amount, USDT_DECIMALS),
                    amountRaw: args.amount,
                    tontineId: Number(args.tontineId),
                    escrowId: null,
                    blockNumber: Number(log.blockNumber),
                    blockTimestamp,
                    txHash: log.transactionHash,
                    explorerUrl: `${EXPLORER_URL}/tx/${log.transactionHash}`,
                  });
                } catch (err) {
                  console.warn("[SmartHistory] Error processing ContributionPaid log:", err);
                }
              }
              return items;
            })
            .catch(() => [])
        );
      }

      // PayoutSent - filter by beneficiary address
      if (payoutSentEvent) {
        eventPromises.push(
          publicClient
            .getLogs({
              address: TONTINE_CONTRACT_ADDRESS,
              event: payoutSentEvent as any,
              args: {
                beneficiary: userAddress as `0x${string}`,
              },
              fromBlock: 0n,
              toBlock: currentBlock,
            })
            .then(async (logs) => {
              const items: HistoryItem[] = [];
              for (const log of logs) {
                try {
                  const decoded = publicClient.decodeEventLog({
                    abi: TONTINE_ABI,
                    data: log.data,
                    topics: log.topics,
                  });

                  let blockTimestamp: number | null = null;
                  try {
                    const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
                    blockTimestamp = Number(block.timestamp);
                  } catch {}

                  const args = decoded.args as { tontineId: bigint; beneficiary: `0x${string}`; amount: bigint };

                  items.push({
                    id: `tontine-${log.transactionHash}-${log.logIndex}`,
                    type: "TontinePayout",
                    contract: "Tontine",
                    title: `Received Payout from Tontine #${Number(args.tontineId)}`,
                    description: `You received a payout as the beneficiary`,
                    icon: <ArrowUpRight className="size-5 text-[#10b981]" />,
                    amount: formatUnits(args.amount, USDT_DECIMALS),
                    amountRaw: args.amount,
                    tontineId: Number(args.tontineId),
                    escrowId: null,
                    blockNumber: Number(log.blockNumber),
                    blockTimestamp,
                    txHash: log.transactionHash,
                    explorerUrl: `${EXPLORER_URL}/tx/${log.transactionHash}`,
                  });
                } catch (err) {
                  console.warn("[SmartHistory] Error processing PayoutSent log:", err);
                }
              }
              return items;
            })
            .catch(() => [])
        );
      }

      // Withdrawal - filter by user address
      if (withdrawalEvent) {
        eventPromises.push(
          publicClient
            .getLogs({
              address: TONTINE_CONTRACT_ADDRESS,
              event: withdrawalEvent as any,
              args: {
                user: userAddress as `0x${string}`,
              },
              fromBlock: 0n,
              toBlock: currentBlock,
            })
            .then(async (logs) => {
              const items: HistoryItem[] = [];
              for (const log of logs) {
                try {
                  const decoded = publicClient.decodeEventLog({
                    abi: TONTINE_ABI,
                    data: log.data,
                    topics: log.topics,
                  });

                  let blockTimestamp: number | null = null;
                  try {
                    const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
                    blockTimestamp = Number(block.timestamp);
                  } catch {}

                  const args = decoded.args as { user: `0x${string}`; amount: bigint };

                  items.push({
                    id: `tontine-${log.transactionHash}-${log.logIndex}`,
                    type: "TontineWithdrawal",
                    contract: "Tontine",
                    title: "Withdrew Funds",
                    description: `Withdrew pending funds from tontine`,
                    icon: <Download className="size-5 text-[#8b5cf6]" />,
                    amount: formatUnits(args.amount, USDT_DECIMALS),
                    amountRaw: args.amount,
                    tontineId: null,
                    escrowId: null,
                    blockNumber: Number(log.blockNumber),
                    blockTimestamp,
                    txHash: log.transactionHash,
                    explorerUrl: `${EXPLORER_URL}/tx/${log.transactionHash}`,
                  });
                } catch (err) {
                  console.warn("[SmartHistory] Error processing Withdrawal log:", err);
                }
              }
              return items;
            })
            .catch(() => [])
        );
      }
    }

    // ===== ESCROW CONTRACT EVENTS =====
    if (ESCROW_SERVICE_ADDRESS) {
      // Find event definitions
      const escrowCreatedEvent = ESCROW_SERVICE_ABI.find((item) => item.type === "event" && item.name === "EscrowCreated");
      const escrowReleasedEvent = ESCROW_SERVICE_ABI.find((item) => item.type === "event" && item.name === "EscrowReleased");

      // EscrowCreated - filter by depositor address
      if (escrowCreatedEvent) {
        eventPromises.push(
          publicClient
            .getLogs({
              address: ESCROW_SERVICE_ADDRESS,
              event: escrowCreatedEvent as any,
              args: {
                depositor: userAddress as `0x${string}`,
              },
              fromBlock: 0n,
              toBlock: currentBlock,
            })
          .then(async (logs) => {
            const items: HistoryItem[] = [];
            for (const log of logs) {
              try {
                const decoded = publicClient.decodeEventLog({
                  abi: ESCROW_SERVICE_ABI,
                  data: log.data,
                  topics: log.topics,
                });

                let blockTimestamp: number | null = null;
                try {
                  const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
                  blockTimestamp = Number(block.timestamp);
                } catch {}

                const args = decoded.args as { escrowId: bigint; depositor: `0x${string}`; beneficiary: `0x${string}`; amount: bigint };

                items.push({
                  id: `escrow-${log.transactionHash}-${log.logIndex}`,
                  type: "EscrowCreated",
                  contract: "Escrow",
                  title: `Escrow Deposit #${Number(args.escrowId)}`,
                  description: `Deposited funds for ${formatAddress(args.beneficiary)}`,
                  icon: <ShieldCheck className="size-5 text-[#3b82f6]" />,
                  amount: formatUnits(args.amount, USDT_DECIMALS),
                  amountRaw: args.amount,
                  tontineId: null,
                  escrowId: Number(args.escrowId),
                  blockNumber: Number(log.blockNumber),
                  blockTimestamp,
                  txHash: log.transactionHash,
                  explorerUrl: `${EXPLORER_URL}/tx/${log.transactionHash}`,
                });
              } catch (err) {
                console.warn("[SmartHistory] Error processing EscrowCreated log:", err);
              }
            }
            return items;
          })
          .catch(() => [])
        );
      }

      // EscrowReleased - filter by beneficiary address
      if (escrowReleasedEvent) {
        eventPromises.push(
          publicClient
            .getLogs({
              address: ESCROW_SERVICE_ADDRESS,
              event: escrowReleasedEvent as any,
              args: {
                beneficiary: userAddress as `0x${string}`,
              },
              fromBlock: 0n,
              toBlock: currentBlock,
            })
          .then(async (logs) => {
            const items: HistoryItem[] = [];
            for (const log of logs) {
              try {
                const decoded = publicClient.decodeEventLog({
                  abi: ESCROW_SERVICE_ABI,
                  data: log.data,
                  topics: log.topics,
                });

                let blockTimestamp: number | null = null;
                try {
                  const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
                  blockTimestamp = Number(block.timestamp);
                } catch {}

                const args = decoded.args as { escrowId: bigint; beneficiary: `0x${string}`; amount: bigint };

                items.push({
                  id: `escrow-${log.transactionHash}-${log.logIndex}`,
                  type: "EscrowReleased",
                  contract: "Escrow",
                  title: `Escrow Released #${Number(args.escrowId)}`,
                  description: `Received funds from escrow`,
                  icon: <ArrowUpRight className="size-5 text-[#10b981]" />,
                  amount: formatUnits(args.amount, USDT_DECIMALS),
                  amountRaw: args.amount,
                  tontineId: null,
                  escrowId: Number(args.escrowId),
                  blockNumber: Number(log.blockNumber),
                  blockTimestamp,
                  txHash: log.transactionHash,
                  explorerUrl: `${EXPLORER_URL}/tx/${log.transactionHash}`,
                });
              } catch (err) {
                console.warn("[SmartHistory] Error processing EscrowReleased log:", err);
              }
            }
            return items;
          })
          .catch(() => [])
        );
      }
    }

    // Wait for all event fetches to complete
    const results = await Promise.all(eventPromises);
    const allItems = results.flat();

    // Sort by block number (newest first)
    allItems.sort((a, b) => b.blockNumber - a.blockNumber);

    console.log(`[SmartHistory] Loaded ${allItems.length} history items`);
    return allItems;
  } catch (err) {
    console.error("[SmartHistory] Error fetching history:", err);
    throw err;
  }
}

export function SmartHistory() {
  const { walletAddress } = useUser();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadHistory = useCallback(async () => {
    if (!walletAddress) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const items = await fetchSmartHistory(walletAddress);
      setHistory(items);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load history";
      console.error("[SmartHistory] Error:", errorMessage);
      setError(errorMessage);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshKey]);

  // Auto-refresh every 15 seconds to catch new transactions
  useEffect(() => {
    if (!walletAddress) return;
    
    const interval = setInterval(() => {
      console.log("[SmartHistory] Auto-refresh triggered");
      setRefreshKey((prev) => prev + 1);
    }, 15000); // Refresh every 15 seconds

    return () => clearInterval(interval);
  }, [walletAddress]);

  // Listen for custom events to trigger refresh (e.g., after transaction completion)
  useEffect(() => {
    if (!walletAddress) return;

    const handleTransactionComplete = () => {
      console.log("[SmartHistory] Transaction complete event received, refreshing...");
      // Wait a bit for the transaction to be included in a block
      setTimeout(() => {
        setRefreshKey((prev) => prev + 1);
      }, 3000);
    };

    // Listen for custom events from transaction components
    window.addEventListener("transaction-complete", handleTransactionComplete);
    window.addEventListener("transaction-confirmed", handleTransactionComplete);

    return () => {
      window.removeEventListener("transaction-complete", handleTransactionComplete);
      window.removeEventListener("transaction-confirmed", handleTransactionComplete);
    };
  }, [walletAddress]);

  const handleRefresh = useCallback(() => {
    console.log("[SmartHistory] Manual refresh triggered");
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
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
          <p className="font-semibold">Error loading history:</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
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
          <p className="font-medium">No blockchain activity found yet</p>
          <p className="text-sm mt-1">Your transactions will appear here once you interact with tontines or escrows</p>
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
            Showing {history.length} {history.length === 1 ? "transaction" : "transactions"} from blockchain
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

      {/* History List - Receipt Style */}
      <div className="space-y-3">
        {history.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-[#e5e7eb] bg-white p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex items-center justify-center size-12 rounded-full bg-[#f3f4f6] shrink-0">
                {item.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-[#111827] mb-1">{item.title}</h3>
                    <p className="text-sm text-[#6b7280]">{item.description}</p>
                  </div>
                  {item.amount && (
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-[#10b981]">
                        ${parseFloat(item.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-[#6b7280]">USDT</p>
                    </div>
                  )}
                </div>

                {/* Footer - Transaction Link */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#e5e7eb]">
                  <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                    <span>{formatDate(item.blockTimestamp, item.blockNumber)}</span>
                    {item.tontineId !== null && (
                      <>
                        <span>•</span>
                        <span>Tontine #{item.tontineId}</span>
                      </>
                    )}
                    {item.escrowId !== null && (
                      <>
                        <span>•</span>
                        <span>Escrow #{item.escrowId}</span>
                      </>
                    )}
                  </div>
                  <a
                    href={item.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-[#295c4f] hover:text-[#1f4a3f] hover:underline transition-colors"
                  >
                    <span className="font-mono">{item.txHash.slice(0, 6)}...{item.txHash.slice(-4)}</span>
                    <ExternalLink className="size-3" />
                    <span className="text-[#6b7280]">Plasmascan</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

