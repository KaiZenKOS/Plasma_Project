import { useState } from "react";
import { Icon } from "@iconify/react";
import { useUser } from "../context/UserContext";

const DEMO_WALLET = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

type LoginProps = { onSuccess: () => void };

export function Login({ onSuccess }: LoginProps) {
  const { registerUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comingSoon, setComingSoon] = useState(false);

  function showComingSoon() {
    setComingSoon(true);
    setError(null);
    setTimeout(() => setComingSoon(false), 2500);
  }

  async function handleDemoWallet() {
    setError(null);
    setLoading(true);
    try {
      await registerUser(DEMO_WALLET, "Demo User");
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans px-8 py-12 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 size-64 bg-primary/10 rounded-full blur-3xl opacity-50" />
      <div className="absolute -bottom-24 -right-24 size-64 bg-primary/10 rounded-full blur-3xl opacity-50" />
      <header className="flex-1 flex flex-col items-center justify-center gap-6 z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="size-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-2xl shadow-primary/10">
            <Icon icon="solar:atom-bold" className="size-12 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold font-heading tracking-tight">
              Plasma <span className="text-primary">Nexus</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground font-medium">
              Financial Services for Everyone
            </p>
          </div>
        </div>
      </header>
      <div className="flex-none flex flex-col gap-4 w-full max-w-sm mx-auto z-10 mb-12">
        {error && (
          <div className="rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {comingSoon && (
          <div className="rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary">
            Coming soon — use demo wallet for now
          </div>
        )}
        <button
          onClick={handleDemoWallet}
          disabled={loading}
          className="flex items-center gap-4 w-full p-4 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity group active:scale-[0.98] disabled:opacity-70"
        >
          <div className="size-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon icon="solar:wallet-bold" className="size-6" />
          </div>
          <span className="font-semibold">
            {loading ? "Connecting…" : "Use demo wallet (backend)"}
          </span>
          <Icon
            icon="solar:arrow-right-linear"
            className="size-5 ml-auto opacity-80 group-hover:translate-x-1 transition-transform"
          />
        </button>
        <button onClick={showComingSoon} className="flex items-center gap-4 w-full p-4 rounded-2xl bg-card border border-border hover:bg-secondary transition-colors group active:scale-[0.98]">
          <div className="size-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
            <Icon icon="logos:google-icon" className="size-5" />
          </div>
          <span className="font-semibold text-foreground">Continue with Google</span>
          <Icon
            icon="solar:arrow-right-linear"
            className="size-5 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </button>
        <button onClick={showComingSoon} className="flex items-center gap-4 w-full p-4 rounded-2xl bg-card border border-border hover:bg-secondary transition-colors group active:scale-[0.98]">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Icon icon="solar:letter-bold" className="size-6" />
          </div>
          <span className="font-semibold text-foreground">Continue with Email</span>
          <Icon
            icon="solar:arrow-right-linear"
            className="size-5 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </button>
        <button onClick={showComingSoon} className="flex items-center gap-4 w-full p-4 rounded-2xl bg-card border border-border hover:bg-secondary transition-colors group active:scale-[0.98]">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Icon icon="solar:face-id-bold" className="size-6" />
          </div>
          <span className="font-semibold text-foreground">Face ID or Passkey</span>
          <Icon
            icon="solar:arrow-right-linear"
            className="size-5 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </button>
        <div className="flex flex-col items-center gap-2 mt-4">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10">
            <Icon icon="solar:shield-check-bold" className="size-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">No complicated passwords</span>
          </div>
        </div>
      </div>
      <footer className="mt-auto text-center z-10">
        <p className="text-[10px] leading-relaxed text-muted-foreground max-w-[240px] mx-auto opacity-70">
          By continuing, you agree to our{" "}
          <button type="button" className="underline decoration-muted-foreground/50 hover:text-foreground">
            Terms
          </button>{" "}
          &{" "}
          <button type="button" className="underline decoration-muted-foreground/50 hover:text-foreground">
            Privacy Policy
          </button>
        </p>
      </footer>
    </div>
  );
}
