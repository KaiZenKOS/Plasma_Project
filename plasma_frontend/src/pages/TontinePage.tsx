import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { getTontineGroups } from "../api/tontine";
import type { TontineGroup } from "../api/types";

function formatUsdt(raw: string): string {
  const n = Number(raw) / 1e6;
  return Number.isFinite(n) ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : raw;
}

type TontinePageProps = { onBack: () => void };

export function TontinePage({ onBack }: TontinePageProps) {
  const [groups, setGroups] = useState<TontineGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await getTontineGroups();
      setGroups(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans relative overflow-hidden">
      <header className="flex items-center justify-between px-6 pt-12 pb-6">
        <button onClick={onBack} className="size-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center border border-border">
          <Icon icon="solar:alt-arrow-right-linear" className="size-5 rotate-180" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold font-heading">Join a Tontine</h1>
          <p className="text-xs text-muted-foreground">Circles from the backend</p>
        </div>
        <div className="size-10" />
      </header>
      <main className="flex-1 px-6 pb-24 overflow-y-auto">
        {error && (
          <div className="rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-4">
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-12">
            <Icon icon="solar:refresh-circle-bold" className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-8 text-center text-muted-foreground">
            <Icon icon="solar:users-group-rounded-bold" className="size-12 mx-auto mb-3 opacity-50" />
            <p>No tontine groups yet.</p>
            <p className="text-xs mt-1">Add groups in the database to see them here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((g) => (
              <div key={g.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-emerald-700 flex items-center justify-center text-white font-bold text-lg">
                      {(g.name ?? "T")[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold">{g.name ?? "Tontine"}</h3>
                      <p className="text-xs text-muted-foreground">
                        {g.frequency_seconds >= 86400 ? "Monthly" : "Weekly"} • {formatUsdt(g.contribution_amount)} USDT • Collateral {formatUsdt(g.collateral_amount)}
                      </p>
                    </div>
                  </div>
                  <span className="bg-secondary px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground">
                    {g.status}
                  </span>
                </div>
                <button
                  type="button"
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-transform"
                >
                  Join (smart contract required)
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
