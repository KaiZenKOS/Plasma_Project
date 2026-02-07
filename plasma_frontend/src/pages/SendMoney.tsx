import { useState } from "react";
import { Icon } from "@iconify/react";

type SendMoneyProps = { onBack?: () => void; onTontine?: () => void };

export function SendMoney({ onBack, onTontine }: SendMoneyProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [escrow, setEscrow] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const setPreset = (value: number) => {
    setAmount(value === -1 ? "999999" : String(value));
  };

  const handleReviewSend = async () => {
    const addr = (recipient || "").trim();
    const num = parseFloat(amount || "0");
    if (!addr) {
      setMessage({ type: "error", text: "Enter recipient (wallet or name)" });
      return;
    }
    if (!Number.isFinite(num) || num <= 0) {
      setMessage({ type: "error", text: "Enter a valid amount" });
      return;
    }
    setMessage(null);
    setSending(true);
    try {
      // Mock: no backend send endpoint yet
      await new Promise((r) => setTimeout(r, 800));
      setMessage({ type: "success", text: `Payment of $${num.toFixed(2)} USDT prepared. Connect wallet to confirm on-chain.` });
      setAmount("");
      setNote("");
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans relative overflow-hidden">
      <div className="absolute -top-24 left-12 size-72 bg-primary/10 rounded-full blur-3xl opacity-60" />
      <div className="absolute -bottom-32 -right-24 size-80 bg-primary/10 rounded-full blur-3xl opacity-60" />
      <header className="flex items-center justify-between px-6 pt-12 pb-6">
        <button onClick={onBack} className="size-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center border border-border">
          <Icon icon="solar:alt-arrow-right-linear" className="size-5 rotate-180" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold font-heading">Send Money</h1>
          <p className="text-xs text-muted-foreground">Secure payment with optional escrow</p>
        </div>
        <button onClick={onTontine} className="size-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center border border-border">
          <Icon icon="solar:users-group-rounded-bold" className="size-5" />
        </button>
      </header>

      <main className="flex-1 px-6 pb-24 flex flex-col gap-6">
        {message && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border border-destructive/20 text-destructive"
            }`}
          >
            {message.text}
          </div>
        )}
        <section className="bg-card border border-border/60 rounded-3xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Icon icon="solar:user-bold" className="size-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recipient</p>
                <p className="font-semibold">Choose who gets paid</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-secondary/60 border border-border px-4 py-3">
            <Icon icon="solar:search-bold" className="size-4 text-muted-foreground" />
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Name, username, or wallet"
              className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </div>
        </section>

        <section className="bg-card border border-border/60 rounded-3xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-semibold">How much to send</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Icon icon="solar:wallet-money-bold" className="size-4" />
              USDT
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-secondary/60 border border-border px-4 py-3">
            <span className="text-primary text-lg font-bold">$</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent outline-none text-2xl font-bold placeholder:text-muted-foreground"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPreset(50)}
              className="rounded-full bg-secondary border border-border py-2 font-semibold text-muted-foreground hover:bg-secondary/80 transition-colors"
            >
              50
            </button>
            <button
              type="button"
              onClick={() => setPreset(150)}
              className="rounded-full bg-secondary border border-border py-2 font-semibold text-muted-foreground hover:bg-secondary/80 transition-colors"
            >
              150
            </button>
            <button
              type="button"
              onClick={() => setPreset(-1)}
              className="rounded-full bg-secondary border border-border py-2 font-semibold text-muted-foreground hover:bg-secondary/80 transition-colors"
            >
              Max
            </button>
          </div>
        </section>

        <section className="bg-card border border-border/60 rounded-3xl p-5 flex flex-col gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="font-semibold">What is this payment for?</p>
          </div>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for the recipient"
            className="w-full rounded-2xl bg-secondary/60 border border-border px-4 py-3 text-sm outline-none placeholder:text-muted-foreground resize-none"
          />
        </section>

        <section className="bg-card border border-border/60 rounded-3xl p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Escrow protection</p>
              <p className="font-semibold">Hold funds until delivery</p>
              <p className="text-xs text-muted-foreground mt-1">
                Protect both sides by releasing funds only when approved.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEscrow(!escrow)}
              className={`w-12 h-7 rounded-full border flex items-center shrink-0 transition-colors ${
                escrow ? "bg-primary border-primary" : "bg-primary/20 border-primary/40"
              }`}
            >
              <span className={`size-6 rounded-full bg-white block shadow transition-transform ${escrow ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Escrow fee</span>
            <span className="font-semibold text-foreground">{escrow ? "1.5%" : "—"}</span>
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-background/90 backdrop-blur border-t border-border">
        <button
          type="button"
          onClick={handleReviewSend}
          disabled={sending}
          className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {sending ? "Preparing…" : "Review & Send"}
          <Icon icon="solar:arrow-right-linear" className="size-6" />
        </button>
      </footer>
    </div>
  );
}
