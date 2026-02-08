import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { Plus, UserPlus, DollarSign, ArrowUpRight, Download, RefreshCw } from "lucide-react";
import { useUser } from "../../../context/UserContext";
import { TONTINE_CONTRACT_ADDRESS, USDT_DECIMALS } from "../config";
import { publicClient } from "../../../blockchain/viem";
import { TONTINE_ABI } from "../abi";

// Event types from the contract
type TontineCreatedEvent = {
  eventName: "TontineCreated";
  args: {
    tontineId: bigint;
    contributionAmount: bigint;
    frequencySeconds: bigint;
    collateralAmount: bigint;
  };
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp?: number;
};

type MemberJoinedEvent = {
  eventName: "MemberJoined";
  args: {
    tontineId: bigint;
    member: `0x${string}`;
    turnPosition: bigint;
  };
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp?: number;
};

type ContributionPaidEvent = {
  eventName: "ContributionPaid";
  args: {
    tontineId: bigint;
    member: `0x${string}`;
    amount: bigint;
    turnIndex: bigint;
  };
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp?: number;
};

type PayoutSentEvent = {
  eventName: "PayoutSent";
  args: {
    tontineId: bigint;
    beneficiary: `0x${string}`;
    amount: bigint;
  };
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp?: number;
};

type WithdrawalEvent = {
  eventName: "Withdrawal";
  args: {
    user: `0x${string}`;
    amount: bigint;
  };
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp?: number;
};

type TransactionEvent = TontineCreatedEvent | MemberJoinedEvent | ContributionPaidEvent | PayoutSentEvent | WithdrawalEvent;

// Processed transaction for display
type TransactionItem = {
  id: string;
  type: "Create" | "Join" | "Deposit" | "Payout" | "Withdrawal";
  icon: React.ReactNode;
  label: string;
  amount: string | null;
  tontineId: number | null;
  address: string | null;
  blockNumber: number;
  timestamp: number | null;
  txHash: `0x${string}`;
  explorerUrl: string;
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

// Process event into display item
function processEvent(event: TransactionEvent, userAddress: string): TransactionItem | null {
  const txHash = event.transactionHash;
  const blockNumber = Number(event.blockNumber);
  const timestamp = event.blockTimestamp || null;

  switch (event.eventName) {
    case "TontineCreated": {
      // Check if user is the creator (we need to check the transaction from address)
      // For now, we'll show all created tontines
      return {
        id: `${txHash}-${event.args.tontineId}`,
        type: "Create",
        icon: <Plus className="size-5 text-[#10b981]" />,
        label: `Created Tontine #${Number(event.args.tontineId)}`,
        amount: formatUnits(event.args.contributionAmount, USDT_DECIMALS),
        tontineId: Number(event.args.tontineId),
        address: null,
        blockNumber,
        timestamp,
        txHash,
        explorerUrl: `${EXPLORER_URL}/tx/${txHash}`,
      };
    }

    case "MemberJoined": {
      // Only show if user is the member
      if (event.args.member.toLowerCase() !== userAddress.toLowerCase()) {
        return null;
      }
      return {
        id: `${txHash}-${event.args.tontineId}-join`,
        type: "Join",
        icon: <UserPlus className="size-5 text-[#3b82f6]" />,
        label: `Joined Tontine #${Number(event.args.tontineId)}`,
        amount: null,
        tontineId: Number(event.args.tontineId),
        address: event.args.member,
        blockNumber,
        timestamp,
        txHash,
        explorerUrl: `${EXPLORER_URL}/tx/${txHash}`,
      };
    }

    case "ContributionPaid": {
      // Only show if user is the member
      if (event.args.member.toLowerCase() !== userAddress.toLowerCase()) {
        return null;
      }
      return {
        id: `${txHash}-${event.args.tontineId}-contribution`,
        type: "Deposit",
        icon: <DollarSign className="size-5 text-[#f59e0b]" />,
        label: `Paid contribution to Tontine #${Number(event.args.tontineId)}`,
        amount: formatUnits(event.args.amount, USDT_DECIMALS),
        tontineId: Number(event.args.tontineId),
        address: event.args.member,
        blockNumber,
        timestamp,
        txHash,
        explorerUrl: `${EXPLORER_URL}/tx/${txHash}`,
      };
    }

    case "PayoutSent": {
      // Only show if user is the beneficiary
      if (event.args.beneficiary.toLowerCase() !== userAddress.toLowerCase()) {
        return null;
      }
      return {
        id: `${txHash}-${event.args.tontineId}-payout`,
        type: "Payout",
        icon: <ArrowUpRight className="size-5 text-[#10b981]" />,
        label: `Received payout from Tontine #${Number(event.args.tontineId)}`,
        amount: formatUnits(event.args.amount, USDT_DECIMALS),
        tontineId: Number(event.args.tontineId),
        address: event.args.beneficiary,
        blockNumber,
        timestamp,
        txHash,
        explorerUrl: `${EXPLORER_URL}/tx/${txHash}`,
      };
    }

    case "Withdrawal": {
      // Only show if user is the one withdrawing
      if (event.args.user.toLowerCase() !== userAddress.toLowerCase()) {
        return null;
      }
      return {
        id: `${txHash}-withdrawal`,
        type: "Withdrawal",
        icon: <Download className="size-5 text-[#8b5cf6]" />,
        label: "Withdrew funds",
        amount: formatUnits(event.args.amount, USDT_DECIMALS),
        tontineId: null,
        address: event.args.user,
        blockNumber,
        timestamp,
        txHash,
        explorerUrl: `${EXPLORER_URL}/tx/${txHash}`,
      };
    }

    default:
      return null;
  }
}

// Fetch events from blockchain
async function fetchTransactionEvents(userAddress: string): Promise<TransactionItem[]> {
  if (!TONTINE_CONTRACT_ADDRESS || !userAddress) {
    return [];
  }

  try {
    console.log("[TransactionHistory] Fetching events for address:", userAddress);

    // Get current block number to limit search range
    const currentBlock = await publicClient.getBlockNumber();
    console.log("[TransactionHistory] Current block:", Number(currentBlock));

    // Find event definitions from ABI
    const tontineCreatedEvent = TONTINE_ABI.find((item) => item.type === "event" && item.name === "TontineCreated");
    const memberJoinedEvent = TONTINE_ABI.find((item) => item.type === "event" && item.name === "MemberJoined");
    const contributionPaidEvent = TONTINE_ABI.find((item) => item.type === "event" && item.name === "ContributionPaid");
    const payoutSentEvent = TONTINE_ABI.find((item) => item.type === "event" && item.name === "PayoutSent");
    const withdrawalEvent = TONTINE_ABI.find((item) => item.type === "event" && item.name === "Withdrawal");

    if (!tontineCreatedEvent || !memberJoinedEvent || !contributionPaidEvent || !payoutSentEvent || !withdrawalEvent) {
      throw new Error("Event definitions not found in ABI");
    }

    // Fetch all events in parallel
    const eventPromises = [
      // TontineCreated - we'll filter by transaction from address later
      publicClient.getLogs({
        address: TONTINE_CONTRACT_ADDRESS,
        event: tontineCreatedEvent as any,
        fromBlock: 0n,
        toBlock: currentBlock,
      }).catch((err) => {
        console.warn("[TransactionHistory] Error fetching TontineCreated:", err);
        return [];
      }),
      // MemberJoined - filter by member address
      publicClient.getLogs({
        address: TONTINE_CONTRACT_ADDRESS,
        event: memberJoinedEvent as any,
        args: {
          member: userAddress as `0x${string}`,
        },
        fromBlock: 0n,
        toBlock: currentBlock,
      }).catch((err) => {
        console.warn("[TransactionHistory] Error fetching MemberJoined:", err);
        return [];
      }),
      // ContributionPaid - filter by member address
      publicClient.getLogs({
        address: TONTINE_CONTRACT_ADDRESS,
        event: contributionPaidEvent as any,
        args: {
          member: userAddress as `0x${string}`,
        },
        fromBlock: 0n,
        toBlock: currentBlock,
      }).catch((err) => {
        console.warn("[TransactionHistory] Error fetching ContributionPaid:", err);
        return [];
      }),
      // PayoutSent - filter by beneficiary address
      publicClient.getLogs({
        address: TONTINE_CONTRACT_ADDRESS,
        event: payoutSentEvent as any,
        args: {
          beneficiary: userAddress as `0x${string}`,
        },
        fromBlock: 0n,
        toBlock: currentBlock,
      }).catch((err) => {
        console.warn("[TransactionHistory] Error fetching PayoutSent:", err);
        return [];
      }),
      // Withdrawal - filter by user address
      publicClient.getLogs({
        address: TONTINE_CONTRACT_ADDRESS,
        event: withdrawalEvent as any,
        args: {
          user: userAddress as `0x${string}`,
        },
        fromBlock: 0n,
        toBlock: currentBlock,
      }).catch((err) => {
        console.warn("[TransactionHistory] Error fetching Withdrawal:", err);
        return [];
      }),
    ];

    const [createdLogs, joinedLogs, contributionLogs, payoutLogs, withdrawalLogs] = await Promise.all(eventPromises);
    
    // For TontineCreated, we need to check the transaction from address
    const createdEvents: TransactionItem[] = [];
    for (const log of createdLogs) {
      try {
        const tx = await publicClient.getTransaction({ hash: log.transactionHash });
        if (tx.from.toLowerCase() === userAddress.toLowerCase()) {
          const decoded = publicClient.decodeEventLog({
            abi: TONTINE_ABI,
            data: log.data,
            topics: log.topics,
          });
          
          let blockTimestamp: number | undefined;
          try {
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
            blockTimestamp = Number(block.timestamp);
          } catch {}

          const event: TontineCreatedEvent = {
            eventName: "TontineCreated",
            args: decoded.args as TontineCreatedEvent["args"],
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            blockTimestamp,
          };

          const processed = processEvent(event, userAddress);
          if (processed) {
            createdEvents.push(processed);
          }
        }
      } catch (err) {
        console.warn("[TransactionHistory] Error processing TontineCreated log:", err);
      }
    }

    // Process other events
    const allLogs = [...joinedLogs, ...contributionLogs, ...payoutLogs, ...withdrawalLogs];
    console.log(`[TransactionHistory] Found ${allLogs.length} raw logs (excluding TontineCreated)`);

    const processedEvents: TransactionItem[] = [...createdEvents];

    for (const log of allLogs) {
      try {
        // Decode the log
        const decoded = publicClient.decodeEventLog({
          abi: TONTINE_ABI,
          data: log.data,
          topics: log.topics,
        });

        // Get block timestamp if available
        let blockTimestamp: number | undefined;
        try {
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
          blockTimestamp = Number(block.timestamp);
        } catch {
          // Ignore if we can't get timestamp
        }

        // Create event object based on event name
        let event: TransactionEvent | null = null;

        if (decoded.eventName === "MemberJoined") {
          event = {
            eventName: "MemberJoined",
            args: decoded.args as MemberJoinedEvent["args"],
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            blockTimestamp,
          };
        } else if (decoded.eventName === "ContributionPaid") {
          event = {
            eventName: "ContributionPaid",
            args: decoded.args as ContributionPaidEvent["args"],
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            blockTimestamp,
          };
        } else if (decoded.eventName === "PayoutSent") {
          event = {
            eventName: "PayoutSent",
            args: decoded.args as PayoutSentEvent["args"],
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            blockTimestamp,
          };
        } else if (decoded.eventName === "Withdrawal") {
          event = {
            eventName: "Withdrawal",
            args: decoded.args as WithdrawalEvent["args"],
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            blockTimestamp,
          };
        }

        if (event) {
          const processed = processEvent(event, userAddress);
          if (processed) {
            processedEvents.push(processed);
          }
        }
      } catch (err) {
        console.warn("[TransactionHistory] Error decoding log:", err, log);
      }
    }

    // Sort by block number (newest first)
    processedEvents.sort((a, b) => b.blockNumber - a.blockNumber);

    console.log(`[TransactionHistory] Processed ${processedEvents.length} events`);
    return processedEvents;
  } catch (err) {
    console.error("[TransactionHistory] Error fetching events:", err);
    throw err;
  }
}

export function TransactionHistory() {
  const { walletAddress } = useUser();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTransactions = useCallback(async () => {
    if (!walletAddress) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    if (!TONTINE_CONTRACT_ADDRESS) {
      setError("Tontine contract address not configured");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const events = await fetchTransactionEvents(walletAddress);
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
          <p className="font-medium">No blockchain activity found yet</p>
          <p className="text-sm mt-1">Your transactions will appear here once you interact with tontines</p>
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
                <p className="text-sm font-semibold text-[#111827] truncate">{tx.label}</p>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs text-[#6b7280]">{formatDate(tx.timestamp, tx.blockNumber)}</p>
                  {tx.tontineId !== null && (
                    <>
                      <span className="text-xs text-[#9ca3af]">•</span>
                      <p className="text-xs text-[#6b7280]">Tontine #{tx.tontineId}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Amount */}
              {tx.amount && (
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-semibold text-[#10b981]">
                    +{parseFloat(tx.amount).toFixed(2)} USDT
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

