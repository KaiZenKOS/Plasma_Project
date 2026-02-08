import { useCallback, useEffect, useState } from "react";
import { getTontineGroups } from "../../../api/tontine";
import type { TontineGroup } from "../../../api/types";
import { useUser } from "../../../context/UserContext";
import { TontineCard } from "./TontineCard";

type TontineListProps = {
  onSelectTontine: (group: TontineGroup) => void;
};

export function TontineList({ onSelectTontine }: TontineListProps) {
  const { walletAddress } = useUser();
  const [groups, setGroups] = useState<TontineGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!walletAddress) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await getTontineGroups(walletAddress);
      setGroups(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load tontines";
      setError(
        msg.includes("Backend unreachable") || msg.includes("Backend injoignable")
          ? "Backend unreachable. Start it with: cd plasma_backend && npm run dev"
          : msg,
      );
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#4a4a4a]">
        <div className="animate-pulse text-sm">Loading tontines…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#ef4444] bg-[#ef4444]/10 px-6 py-4 text-sm text-[#ef4444]">
        {error}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-12 text-center text-[#4a4a4a]">
        <p className="font-medium">{walletAddress ? "No tontines yet" : "Connect your wallet"}</p>
        <p className="text-sm mt-1">
          {walletAddress ? "Create one or wait for an invite." : "To see your tontines or create one."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {groups.map((group) => (
        <TontineCard
          key={group.id}
          group={group}
          userAddress={walletAddress}
          onSelect={() => onSelectTontine(group)}
        />
      ))}
    </div>
  );
}
