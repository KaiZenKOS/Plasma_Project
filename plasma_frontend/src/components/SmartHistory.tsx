import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { getAddressTxList, normalizeAddress, type ScrapedTx } from "../api/explorer";

const EXPLORER_URL =
  typeof import.meta.env.VITE_PLASMA_EXPLORER_URL === "string" && import.meta.env.VITE_PLASMA_EXPLORER_URL
    ? import.meta.env.VITE_PLASMA_EXPLORER_URL
    : "https://testnet.plasmascan.to";

const PAGE_SIZE = 10;

/** Même source que pour l'affichage du solde (UserContext = usePrivy + useWallets). */
function useWalletAddressForHistory(): string | null {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const raw = authenticated ? (wallets?.[0]?.address ?? null) : null;
  const str = typeof raw === "string" ? raw.trim() : "";
  return normalizeAddress(str || null);
}

function shortAddress(addr: string | null | undefined): string {
  if (addr == null || typeof addr !== "string" || addr.length < 12) return addr ?? "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function SmartHistory() {
  const normalizedAddress = useWalletAddressForHistory();
  const walletAddress = normalizedAddress;
  const [transactions, setTransactions] = useState<ScrapedTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!normalizedAddress) {
      setTransactions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getAddressTxList(normalizedAddress);
      setTransactions(data.transactions ?? []);
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load history");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [normalizedAddress]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const paginatedTxs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return transactions.slice(start, start + PAGE_SIZE);
  }, [transactions, page]);

  if (!walletAddress || !normalizedAddress) {
    return (
      <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-12 text-center text-[#4a4a4a]">
        <p className="font-medium">Connect your wallet</p>
        <p className="text-sm mt-1">To view history on the explorer</p>
      </div>
    );
  }

  const explorerAddressUrl = `${EXPLORER_URL}/address/${normalizedAddress}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#111827]">Wallet history</h2>
          <p className="text-sm text-[#6b7280] mt-1">
            {transactions.length > 0
              ? `${transactions.length} transaction${transactions.length > 1 ? "s" : ""} — Page ${page}/${totalPages}`
              : "Transactions fetched from Plasmascan"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="px-3 py-2 rounded-lg border border-[#d1d5db] text-sm font-medium text-[#6b7280] hover:bg-[#f9fafb] disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <a
            href={explorerAddressUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#d1d5db] text-[#6b7280] text-sm font-medium hover:bg-[#f9fafb] hover:border-[#295c4f] hover:text-[#295c4f] transition-colors"
          >
            <ExternalLink className="size-4" />
            View all on explorer
          </a>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading && transactions.length === 0 ? (
        <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-12 text-center text-[#4a4a4a]">
          <p className="font-medium">Loading transactions…</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-12 text-center text-[#4a4a4a]">
          <p className="font-medium">No transactions found</p>
          <p className="text-sm mt-1">Use the button above to view the explorer.</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-[#e5e7eb] bg-white overflow-hidden">
            <ul className="divide-y divide-[#e5e7eb]">
              {paginatedTxs.map((tx) => (
                <li key={tx.hash}>
                  <a
                    href={tx.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 px-4 py-4 hover:bg-[#f9fafb] transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {tx.method && (
                            <span className="px-2.5 py-1 rounded-lg bg-[#e5e7eb] text-xs font-semibold text-[#374151]">
                              {tx.method}
                            </span>
                          )}
                          {(tx.value ?? tx.valueSymbol) && (
                            <span className="text-sm font-semibold text-[#111827]">
                              {[tx.value, tx.valueSymbol].filter(Boolean).join(" ")}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#6b7280] shrink-0">
                          {tx.age ?? tx.time ?? "—"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-[#6b7280]">
                        {tx.blockNumber && (
                          <span><span className="text-[#9ca3af]">Block</span> {tx.blockNumber}</span>
                        )}
                        {(tx.from || tx.to) && (
                          <span>
                            <span className="text-[#9ca3af]">From</span>{" "}
                            <span className="font-mono">{tx.from ? shortAddress(tx.from) : "—"}</span>
                            {" → "}
                            <span className="text-[#9ca3af]">To</span>{" "}
                            <span className="font-mono">{tx.to ? shortAddress(tx.to) : "—"}</span>
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-[#9ca3af]" title={tx.hash}>
                        {tx.hash.slice(0, 8)}…{tx.hash.slice(-6)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[#9ca3af]" aria-hidden>
                      <ExternalLink className="size-4" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              <p className="text-sm text-[#6b7280]">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, transactions.length)} of {transactions.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </button>
                <span className="text-sm text-[#6b7280]">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 disabled:pointer-events-none"
                >
                  Next
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
