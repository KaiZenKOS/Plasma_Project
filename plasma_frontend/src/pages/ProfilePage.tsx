import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useUser } from "../context/UserContext";
import { getUser, getUserScore, upsertUser } from "../api/core";

type ProfilePageProps = { onBack: () => void; onLogout?: () => void };

export function ProfilePage({ onBack, onLogout }: ProfilePageProps) {
  const { walletAddress, clearUser } = useUser();
  const [pseudo, setPseudo] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const addr = walletAddress.toLowerCase();
      const [user, scoreRes] = await Promise.all([
        getUser(addr).catch(() => null),
        getUserScore(addr).catch(() => null),
      ]);
      setPseudo(user?.pseudo ?? "");
      setScore(scoreRes?.score ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!walletAddress) return;
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await upsertUser(walletAddress.toLowerCase(), { pseudo: pseudo.trim() || undefined });
      setMessage("Profile updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    clearUser();
    onLogout?.();
  }

  if (!walletAddress) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground font-sans p-6">
        <button onClick={onBack} className="self-start size-10 rounded-full bg-secondary flex items-center justify-center border border-border">
          <Icon icon="solar:alt-arrow-right-linear" className="size-5 rotate-180" />
        </button>
        <p className="mt-8 text-muted-foreground text-center">Not connected. Go to Login.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans relative overflow-hidden">
      <header className="flex items-center justify-between px-6 pt-12 pb-6">
        <button onClick={onBack} className="size-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center border border-border">
          <Icon icon="solar:alt-arrow-right-linear" className="size-5 rotate-180" />
        </button>
        <h1 className="text-lg font-bold font-heading">Profile</h1>
        <div className="size-10" />
      </header>
      <main className="flex-1 px-6 pb-24 overflow-y-auto">
        {error && (
          <div className="rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-4">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 mb-4">
            {message}
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-12">
            <Icon icon="solar:refresh-circle-bold" className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground">Wallet</label>
              <p className="font-mono text-sm break-all bg-card border border-border rounded-xl px-4 py-3">
                {walletAddress}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground">Display name (pseudo)</label>
              <input
                type="text"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                placeholder="Your name"
                className="rounded-xl bg-card border border-border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {score != null && (
              <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border">
                <span className="text-muted-foreground">Reputation score</span>
                <span className="text-2xl font-bold text-primary">{score}</span>
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold disabled:opacity-70"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-4 rounded-2xl border border-border text-muted-foreground font-semibold hover:bg-secondary transition-colors"
            >
              Log out
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
