import { useState } from "react";
import { parseEther, parseUnits } from "viem";
import { useWalletClient } from "../features/tontine/hooks/useWalletClient";
import { useNativeBalance } from "../hooks/useNativeBalance";
import { useUsdtBalance } from "../hooks/useUsdtBalance";
import { useUser } from "../context/UserContext";
import { useTontineToast } from "../features/tontine/context/ToastContext";

const USDT_DISPLAY_ADDRESS =
  (typeof import.meta.env.VITE_USDT_DISPLAY_ADDRESS === "string" && import.meta.env.VITE_USDT_DISPLAY_ADDRESS) ||
  (typeof import.meta.env.VITE_USDT_ADDRESS === "string" && import.meta.env.VITE_USDT_ADDRESS) ||
  null;

const USDT_DECIMALS = 6;

const EXPLORER_URL =
  typeof import.meta.env.VITE_PLASMA_EXPLORER_URL === "string" && import.meta.env.VITE_PLASMA_EXPLORER_URL
    ? import.meta.env.VITE_PLASMA_EXPLORER_URL
    : "https://testnet.plasmascan.to";

const ERC20_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

function isValidAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s.trim());
}

type Asset = "XPL" | "USDT";

export function SendP2P() {
  const { walletAddress } = useUser();
  const { toast } = useTontineToast();
  const walletClient = useWalletClient();
  const { balance: usdtBalance, reload: reloadUsdt } = useUsdtBalance(walletAddress);
  const { balance: xplBalance, reload: reloadXpl } = useNativeBalance(walletAddress);

  const [asset, setAsset] = useState<Asset>("XPL");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccess, setLastSuccess] = useState<{ hash: string; amount: string; symbol: string } | null>(null);

  const handleSend = async () => {
    setError(null);
    setLastSuccess(null);
    const toAddress = to.trim();
    const amountStr = amount.trim().replace(",", ".");

    if (!toAddress || !amountStr) {
      setError("Enter address and amount.");
      return;
    }
    if (!isValidAddress(toAddress)) {
      setError("Invalid address (0x...).");
      return;
    }
    const num = parseFloat(amountStr);
    if (!Number.isFinite(num) || num <= 0) {
      setError("Invalid amount.");
      return;
    }
    if (!walletClient?.account) {
      setError("Wallet not connected.");
      return;
    }

    setSending(true);
    try {
      if (asset === "XPL") {
        const valueWei = parseEther(amountStr);
        const xplNum = Number(xplBalance ?? 0);
        if (num > xplNum) {
          setError("Insufficient XPL balance.");
          setSending(false);
          return;
        }
        const hash = await walletClient.sendTransaction({
          to: toAddress as `0x${string}`,
          value: valueWei,
          account: walletClient.account,
        });
        setLastSuccess({ hash, amount: amountStr, symbol: "XPL" });
        toast(`XPL sent. Hash: ${hash.slice(0, 10)}…`, "success");
        window.dispatchEvent(new CustomEvent("transaction-confirmed", { detail: { txHash: hash } }));
        reloadXpl();
        setAmount("");
        setTo("");
      } else {
        if (!USDT_DISPLAY_ADDRESS) {
          setError("USDT token not configured.");
          setSending(false);
          return;
        }
        const valueWei = parseUnits(amountStr, USDT_DECIMALS);
        const usdtNum = Number(usdtBalance ?? 0);
        if (num > usdtNum) {
          setError("Insufficient USDT balance.");
          setSending(false);
          return;
        }
        const hash = await walletClient.writeContract({
          address: USDT_DISPLAY_ADDRESS as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [toAddress as `0x${string}`, valueWei],
          account: walletClient.account,
        });
        setLastSuccess({ hash, amount: amountStr, symbol: "USDT" });
        toast(`USDT sent. Hash: ${hash.slice(0, 10)}…`, "success");
        window.dispatchEvent(new CustomEvent("transaction-confirmed", { detail: { txHash: hash } }));
        reloadUsdt();
        setAmount("");
        setTo("");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error sending.";
      setError(msg);
      toast(msg, "error");
    } finally {
      setSending(false);
    }
  };

  if (!walletAddress) {
    return (
      <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center text-muted-foreground">
        <p className="text-sm">Connect your wallet to send funds.</p>
      </div>
    );
  }

  const maxBalance = asset === "XPL" ? (xplBalance ?? "0") : (usdtBalance ?? "0");
  const symbol = asset;

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <h3 className="text-lg font-bold text-foreground mb-4">Send (P2P)</h3>
      {lastSuccess && (
        <div className="mb-4 rounded-xl border border-secondary/30 bg-secondary/10 p-4">
          <p className="text-sm font-semibold text-secondary flex items-center gap-2">
            <span className="size-2 rounded-full bg-secondary" aria-hidden />
            Transaction sent
          </p>
          <p className="mt-1 text-sm text-foreground">
            {lastSuccess.amount} {lastSuccess.symbol} sent.
          </p>
          <a
            href={`${EXPLORER_URL}/tx/${lastSuccess.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View on explorer
            <span className="text-xs" aria-hidden>external</span>
          </a>
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Asset</label>
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value as Asset)}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
          >
            <option value="XPL">XPL (native)</option>
            <option value="USDT">USDT</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Recipient address</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x..."
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-mono placeholder:text-muted-foreground"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Amount</label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm"
            />
            <span className="flex items-center text-sm text-muted-foreground">{" "}{symbol}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Balance: {Number(maxBalance).toLocaleString("en-US", { maximumFractionDigits: asset === "XPL" ? 6 : 2 })} {symbol}
          </p>
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !walletClient}
          className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-3 px-4 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
