import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { ViewKey } from "../types/navigation";
import { useUser } from "../context/UserContext";
import { getUser, getUserScore } from "../api/core";
import { getTontineGroups, getBlockchainEvents } from "../api/tontine";
import type { User, TontineGroup, BlockchainEvent } from "../api/types";

type DashboardProps = { onNavigate: (view: ViewKey) => void };

function formatUsdt(raw: string): string {
  const n = Number(raw) / 1e6;
  return Number.isFinite(n) ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : raw;
}

function formatMethod(method: string | null): string {
  if (!method) return "Transaction";
  if (method === "ContributionPaid") return "Tontine Contribution";
  if (method === "CollateralSlashed") return "Collateral Slashed";
  if (method === "PayoutSent") return "Payment Received";
  return method;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { walletAddress, user, registerUser } = useUser();
  const [profile, setProfile] = useState<User | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [groups, setGroups] = useState<TontineGroup[]>([]);
  const [events, setEvents] = useState<BlockchainEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const addr = walletAddress.toLowerCase();
      const [userRes, scoreRes, groupsRes, eventsRes] = await Promise.allSettled([
        getUser(addr).catch(() => null),
        getUserScore(addr).catch(() => null),
        getTontineGroups(),
        getBlockchainEvents(20),
      ]);
      const userData = userRes.status === "fulfilled" ? userRes.value : null;
      if (!userData) {
        await registerUser(walletAddress, "User");
        const u = await getUser(addr);
        setProfile(u);
      } else {
        setProfile(userData);
      }
      setScore(scoreRes.status === "fulfilled" && scoreRes.value != null ? scoreRes.value.score : null);
      setGroups(groupsRes.status === "fulfilled" ? groupsRes.value : []);
      setEvents(eventsRes.status === "fulfilled" ? eventsRes.value : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [walletAddress, registerUser]);

  useEffect(() => {
    load();
  }, [load]);

  const displayName = profile?.pseudo ?? user?.pseudo ?? (walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "Guest");
  const displayScore = score ?? profile?.reputation_score ?? null;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans pb-24 relative overflow-hidden">
      <header className="flex items-center justify-between px-6 pt-12 pb-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold font-heading tracking-tight">My Nexus</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {displayName}</p>
        </div>
        <button onClick={() => onNavigate("profile")} className="relative">
          <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-border">
            <Icon icon="solar:user-bold" className="size-5 text-primary" />
          </div>
          {displayScore != null && (
            <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
              {displayScore}
            </div>
          )}
        </button>
      </header>
      <main className="flex-1 flex flex-col gap-8 px-6 overflow-y-auto">
        {error && (
          <div className="rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Icon icon="solar:refresh-circle-bold" className="size-8 animate-spin" />
          </div>
        ) : (
          <>
        <div className="relative overflow-hidden rounded-[2rem] bg-card border border-border/50 p-6 shadow-sm">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Icon icon="solar:graph-up-bold" className="size-32 text-primary rotate-12 -mr-8 -mt-8" />
          </div>
          <div className="relative z-10 flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Reputation Score
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-bold tracking-tight text-foreground">{displayScore ?? "—"}</span>
              <span className="text-lg font-bold text-primary">/ 100</span>
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs font-medium text-emerald-500 bg-emerald-500/10 w-fit px-3 py-1.5 rounded-full">
              <Icon icon="solar:shield-check-bold" className="size-3.5" />
              <span>From backend (no AI)</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <button onClick={() => onNavigate("send")} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 active:scale-95 transition-transform">
            <div className="size-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Icon icon="solar:plain-3-bold" className="size-6 text-white" />
            </div>
            <span className="text-xs font-bold">Send</span>
          </button>
          <button onClick={() => onNavigate("tontine")} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-secondary text-secondary-foreground border border-border shadow-sm active:scale-95 transition-transform">
            <div className="size-10 rounded-full bg-background/50 flex items-center justify-center">
              <Icon icon="solar:users-group-rounded-bold" className="size-6 text-primary" />
            </div>
            <span className="text-xs font-semibold">Join Tontine</span>
          </button>
          <button onClick={() => onNavigate("send")} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-secondary text-secondary-foreground border border-border shadow-sm active:scale-95 transition-transform">
            <div className="size-10 rounded-full bg-background/50 flex items-center justify-center">
              <Icon icon="solar:qr-code-bold" className="size-6 text-primary" />
            </div>
            <span className="text-xs font-semibold">Request</span>
          </button>
        </div>
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-heading">Recent Activity</h2>
          </div>
          <div className="flex flex-col gap-3">
            {events.length === 0 ? (
              <div className="p-6 rounded-2xl bg-card border border-border/50 text-center text-sm text-muted-foreground">
                No blockchain events yet
              </div>
            ) : (
              events.map((ev) => (
                <div key={ev.tx_hash + ev.block_number} className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50">
                  <div className="flex items-center gap-4">
                    <div className={`size-10 rounded-full flex items-center justify-center ${
                      ev.method_name === "CollateralSlashed" ? "bg-destructive/10 text-destructive" : "bg-blue-500/10 text-blue-500"
                    }`}>
                      <Icon
                        icon={ev.method_name === "PayoutSent" ? "solar:arrow-left-down-bold" : "solar:users-group-rounded-bold"}
                        className="size-5"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{formatMethod(ev.method_name)}</span>
                      <span className="text-xs text-muted-foreground">
                        {ev.from_address ? `${ev.from_address.slice(0, 6)}…${ev.from_address.slice(-4)}` : "—"} • {ev.created_at ? new Date(ev.created_at).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </div>
                  {ev.payload && typeof ev.payload === "object" && "amount" in ev.payload && (
                    <span className="font-bold text-foreground">{formatUsdt(String(ev.payload.amount))} USDT</span>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-heading">My Circles</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            {groups.length === 0 ? (
              <div className="min-w-[280px] p-6 rounded-2xl bg-card border border-border text-center text-sm text-muted-foreground">
                No tontine groups yet
              </div>
            ) : (
              groups.map((g) => (
                <div key={g.id} className="min-w-[280px] bg-card p-4 rounded-2xl border border-border flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-emerald-700 flex items-center justify-center text-white font-bold text-lg">
                        {(g.name ?? "T")[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm">{g.name ?? "Tontine"}</h3>
                        <p className="text-xs text-muted-foreground">
                          {g.frequency_seconds >= 86400 ? "Monthly" : "Weekly"} • {formatUsdt(g.contribution_amount)} USDT
                        </p>
                      </div>
                    </div>
                    <span className="bg-secondary px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground">
                      {g.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
          </>
        )}
        <button onClick={() => onNavigate("protection")} className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4 mb-4 w-full text-left active:scale-[0.99] transition-transform">
          <div className="size-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Icon icon="solar:shield-check-bold" className="size-5" />
          </div>
          <div className="flex flex-col flex-1">
            <h3 className="font-bold text-sm text-foreground">My Protection</h3>
            <p className="text-xs text-emerald-500 font-medium">Active Coverage • Premium Plan</p>
          </div>
          <Icon icon="solar:alt-arrow-right-linear" className="ml-auto text-emerald-500" />
        </button>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-3 flex justify-between items-center z-50">
        <button onClick={() => onNavigate("dashboard")} className="flex flex-col items-center gap-1 text-primary">
          <Icon icon="solar:home-2-bold" className="size-6" />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button onClick={() => onNavigate("send")} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <Icon icon="solar:wallet-money-bold" className="size-6" />
          <span className="text-[10px] font-medium">Payments</span>
        </button>
        <button onClick={() => onNavigate("tontine")} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <Icon icon="solar:users-group-rounded-bold" className="size-6" />
          <span className="text-[10px] font-medium">Circles</span>
        </button>
        <button onClick={() => onNavigate("protection")} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <Icon icon="solar:shield-check-bold" className="size-6" />
          <span className="text-[10px] font-medium">Protection</span>
        </button>
        <button onClick={() => onNavigate("profile")} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <Icon icon="solar:user-bold" className="size-6" />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </nav>
    </div>
  );
}
