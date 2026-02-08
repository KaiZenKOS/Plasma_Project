import { useUser } from "../../../context/UserContext";
import { useTontineList } from "../hooks/useTontineList";
import { JoinTontine } from "./JoinTontine";
import { TONTINE_CONTRACT_ADDRESS } from "../config";

const EXPLORER_URL = typeof import.meta.env.VITE_PLASMA_EXPLORER_URL === "string" && import.meta.env.VITE_PLASMA_EXPLORER_URL
  ? import.meta.env.VITE_PLASMA_EXPLORER_URL
  : "https://testnet.plasmascan.to";

export function BlockchainTontineList() {
  const { walletAddress } = useUser();
  const { tontines, loading, error, reload } = useTontineList();

  if (!TONTINE_CONTRACT_ADDRESS) {
    return (
      <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-6 text-center text-[#4a4a4a]">
        <p className="text-sm">Tontine contract not configured.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#4a4a4a]">
        <div className="animate-pulse text-sm">Chargement des tontines depuis la blockchain…</div>
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

  if (tontines.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-12 text-center text-[#4a4a4a]">
        <p className="font-medium">No tontine on the blockchain</p>
        <p className="text-sm mt-1">Create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#295c4f]" style={{ fontFamily: "Outfit, DM Sans, sans-serif" }}>
          Tontines on blockchain ({tontines.length})
        </h2>
        <button
          type="button"
          onClick={() => reload()}
          className="text-sm text-[#295c4f] hover:underline"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tontines.map((tontine) => {
          const isMember = walletAddress
            ? tontine.members.some((m) => m.toLowerCase() === walletAddress.toLowerCase())
            : false;
          const frequencyLabel = tontine.frequencySeconds >= 30 * 24 * 60 * 60 ? "Monthly" : "Weekly";

          return (
            <div
              key={tontine.id}
              className="rounded-2xl border border-[#e5e7eb] bg-[#FFFFFF] p-6 flex flex-col gap-4"
              style={{ boxShadow: "none" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-[#1a1a1a]" style={{ fontFamily: "Outfit, DM Sans, sans-serif" }}>
                    Tontine #{tontine.id}
                  </h3>
                  <p className="text-xs text-[#4a4a4a]">
                    {frequencyLabel} • ${Number(tontine.contributionAmount).toFixed(2)} USDT
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-[#295c4f]/10 text-[#295c4f]">
                  Active
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <p className="text-[#4a4a4a]">
                  <strong className="text-[#1a1a1a]">Créateur:</strong>{" "}
                  <span className="font-mono text-xs">
                    {tontine.creator.slice(0, 6)}…{tontine.creator.slice(-4)}
                  </span>
                </p>
                <p className="text-[#4a4a4a]">
                  <strong className="text-[#1a1a1a]">Members:</strong> {tontine.memberCount}
                </p>
                <p className="text-[#4a4a4a]">
                  <strong className="text-[#1a1a1a]">Contribution:</strong> ${Number(tontine.contributionAmount).toFixed(2)} USDT
                </p>
                {Number(tontine.collateralAmount) > 0 && (
                  <p className="text-[#4a4a4a]">
                    <strong className="text-[#1a1a1a]">Nantissement:</strong> ${Number(tontine.collateralAmount).toFixed(2)} USDT
                  </p>
                )}
              </div>

              <div className="mt-auto space-y-2">
                {isMember ? (
                  <p className="text-sm text-[#295c4f] font-medium text-center">
                    You are a member
                  </p>
                ) : (
                  <JoinTontine tontineId={tontine.id} onSuccess={reload} />
                )}
                <a
                  href={`${EXPLORER_URL}/address/${TONTINE_CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-center text-[#295c4f] hover:underline"
                >
                  View on explorer
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

