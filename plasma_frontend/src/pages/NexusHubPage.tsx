import { Icon } from "@iconify/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getUserProfile, getUserScore } from "../api/core";
import { getHistory } from "../api/history";
import type { BlockchainEvent, User } from "../api/types";
import { LoginButton } from "../components/LoginButton";
import { useUser } from "../context/UserContext";
import { useUsdtBalance } from "../hooks/useUsdtBalance";
import type { ViewKey } from "../types/navigation";

type NexusHubPageProps = {
  onNavigate: (view: ViewKey) => void;
};

function clampScore(score: number) {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, score));
}

function formatEventLabel(event: BlockchainEvent) {
  if (event.method_name) return event.method_name;
  if (event.to_address) return `Tx to ${event.to_address.slice(0, 6)}...`;
  return "Blockchain event";
}

function formatEventTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NexusHubPage({ onNavigate }: NexusHubPageProps) {
  const { walletAddress } = useUser();
  const [score, setScore] = useState<number | null>(null);
  const [events, setEvents] = useState<BlockchainEvent[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const {
    balance,
    loading: balanceLoading,
    error: balanceError,
  } = useUsdtBalance(walletAddress);

  const loadScore = useCallback(async () => {
    if (!walletAddress) {
      setScore(null);
      return;
    }
    try {
      const data = await getUserScore(walletAddress);
      setScore(data.score);
    } catch {
      setScore(null);
    }
  }, [walletAddress]);

  const loadProfile = useCallback(async () => {
    if (!walletAddress) {
      setProfile(null);
      return;
    }
    setProfileError(null);
    try {
      const data = await getUserProfile(walletAddress);
      setProfile(data);
    } catch (error) {
      setProfile(null);
      setProfileError(
        error instanceof Error
          ? error.message
          : "Impossible de charger le profil",
      );
    }
  }, [walletAddress]);

  const loadEvents = useCallback(async () => {
    if (!walletAddress) {
      setEvents([]);
      setEventsError(null);
      return;
    }
    setEventsError(null);
    try {
      const data = await getHistory({
        address: walletAddress,
        limit: 5,
      });
      setEvents(data);
    } catch (error) {
      setEventsError(
        error instanceof Error
          ? error.message
          : "Impossible de charger les events",
      );
      setEvents([]);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadScore();
  }, [loadScore]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const reputation = useMemo(
    () => (score === null ? null : clampScore(score)),
    [score],
  );
  const reputationProgress = reputation ?? 0;
  const isConnected = Boolean(walletAddress);
  const balanceValue = isConnected
    ? balanceLoading
      ? "Chargement..."
      : balance
        ? `${Number(balance).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} USDT`
        : "Non disponible"
    : "Connecte ton wallet";
  const lastEvent = events[0];
  const activityLine = lastEvent
    ? `Derniere activite: ${formatEventLabel(lastEvent)}`
    : "Aucune activite recente";

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans text-foreground">
      <header className="flex items-center justify-between px-6 pt-12 pb-4 bg-background z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10">
            <Icon icon="solar:leaf-bold" className="size-6 text-primary" />
          </div>
          <span className="text-2xl font-bold text-primary tracking-tight font-heading">
            Nexus
          </span>
        </div>
        <div className="relative">
          <img
            src="https://lh3.googleusercontent.com/a/ACg8ocLjZAk7ayWnUP4Nh6F0p1Vyze1HIecTg3t33fSQHei6qjmiWe4=s96-c"
            alt="Kevin BJA"
            className="size-10 rounded-full object-cover border border-border"
          />
          <div
            className={`absolute bottom-0 right-0 size-3 border-2 border-white rounded-full ${
              isConnected ? "bg-secondary" : "bg-muted"
            }`}
          />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="px-6 py-4 space-y-8">
          <div className="p-6 rounded-2xl border border-border bg-white flex flex-col gap-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Solde USDT
                </p>
                <h2 className="text-3xl font-bold font-heading text-foreground tracking-tight">
                  {balanceValue}
                </h2>
                <div className="flex items-center gap-1 mt-2 text-sm text-secondary font-medium">
                  <Icon icon="solar:graph-up-linear" className="size-4" />
                  <span>{activityLine}</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="relative size-16">
                  <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-muted"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="text-secondary"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${reputationProgress}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-secondary">
                      {reputation ?? "--"}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  Reputation
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Connexion
                  </p>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      isConnected
                        ? "border-secondary text-secondary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {isConnected ? "Connecte" : "Non connecte"}
                  </span>
                </div>
                {walletAddress ? (
                  <div className="mt-2">
                    <p className="text-sm font-semibold text-foreground">
                      {profile?.pseudo ? profile.pseudo : "Wallet connected"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </p>
                    {balanceError && (
                      <p className="mt-1 text-[10px] text-destructive">
                        {balanceError}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Connecte ton wallet pour charger le profil.
                  </p>
                )}
              </div>
              <div className="size-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <Icon
                  icon="solar:user-bold"
                  className="size-5 text-secondary"
                />
              </div>
            </div>
            {!walletAddress && (
              <div className="mt-4">
                <LoginButton />
              </div>
            )}
            {profileError && (
              <div className="mt-3 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                {profileError}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold font-heading text-foreground mb-4">
              Services
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <button
                type="button"
                onClick={() => onNavigate("tontine")}
                className="flex items-center p-5 bg-white border border-border rounded-2xl gap-4 active:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-center size-14 rounded-full bg-blue-50 text-blue-600">
                  <Icon icon="solar:refresh-circle-bold" className="size-8" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="text-lg font-bold text-foreground">
                    Ma Tontine
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Manage your savings circles
                  </p>
                </div>
                <div className="p-2 text-muted-foreground">
                  <Icon
                    icon="solar:alt-arrow-right-linear"
                    className="size-6"
                  />
                </div>
              </button>
              <button
                type="button"
                onClick={() => onNavigate("escrow")}
                className="flex items-center p-5 bg-white border border-border rounded-2xl gap-4 active:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-center size-14 rounded-full bg-purple-50 text-purple-600">
                  <Icon icon="solar:shield-check-bold" className="size-8" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="text-lg font-bold text-foreground">Escrow</h4>
                  <p className="text-sm text-muted-foreground">
                    Secure transactions & trust
                  </p>
                </div>
                <div className="p-2 text-muted-foreground">
                  <Icon
                    icon="solar:alt-arrow-right-linear"
                    className="size-6"
                  />
                </div>
              </button>
              <button
                type="button"
                onClick={() => onNavigate("assurance")}
                className="flex items-center p-5 bg-white border border-border rounded-2xl gap-4 active:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-center size-14 rounded-full bg-orange-50 text-orange-600">
                  <Icon icon="solar:umbrella-bold" className="size-8" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="text-lg font-bold text-foreground">
                    Assurance
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Protection for your assets
                  </p>
                </div>
                <div className="p-2 text-muted-foreground">
                  <Icon
                    icon="solar:alt-arrow-right-linear"
                    className="size-6"
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
        <div className="mt-2 bg-muted/50 py-8 px-6 rounded-t-3xl min-h-[200px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold font-heading text-foreground">
              Recent Activity
            </h3>
            <button
              type="button"
              onClick={loadEvents}
              className="text-sm font-medium text-primary"
            >
              Rafraichir
            </button>
          </div>
          {eventsError ? (
            <div className="rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {eventsError}
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl bg-white border border-border px-4 py-6 text-sm text-muted-foreground text-center">
              No blockchain events yet.
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={`${event.tx_hash}-${event.block_number}`}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-10 rounded-full bg-white border border-border">
                      <Icon
                        icon="solar:wallet-money-bold"
                        className="size-5 text-blue-600"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {formatEventLabel(event)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatEventTime(event.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Block {event.block_number}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-2 pb-6 z-50">
        <div className="flex items-center justify-between">
          <button type="button" className="flex flex-col items-center gap-1">
            <div className="p-1.5 rounded-xl bg-primary/10">
              <Icon icon="solar:home-2-bold" className="size-6 text-primary" />
            </div>
            <span className="text-[10px] font-medium text-primary">
              Nexus Hub
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("tontine")}
            className="flex flex-col items-center gap-1 opacity-50"
          >
            <div className="p-1.5 rounded-xl">
              <Icon
                icon="solar:users-group-rounded-linear"
                className="size-6 text-foreground"
              />
            </div>
            <span className="text-[10px] font-medium text-foreground">
              Tontine
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("escrow")}
            className="flex flex-col items-center gap-1 opacity-50"
          >
            <div className="p-1.5 rounded-xl">
              <Icon
                icon="solar:shield-check-linear"
                className="size-6 text-foreground"
              />
            </div>
            <span className="text-[10px] font-medium text-foreground">
              Escrow
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("assurance")}
            className="flex flex-col items-center gap-1 opacity-50"
          >
            <div className="p-1.5 rounded-xl">
              <Icon
                icon="solar:umbrella-linear"
                className="size-6 text-foreground"
              />
            </div>
            <span className="text-[10px] font-medium text-foreground">
              Assurance
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
