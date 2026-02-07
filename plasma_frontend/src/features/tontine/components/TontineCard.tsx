import { Users } from "lucide-react";
import type { TontineGroup } from "../../../api/types";
import { useTontineChain } from "../hooks/useTontineChain";

const USDT_DECIMALS = 6;
function formatUsdt(raw: string | bigint): string {
  const n = typeof raw === "bigint" ? Number(raw) / 10 ** USDT_DECIMALS : Number(raw) / 1e6;
  return Number.isFinite(n) ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
}

type TontineCardProps = {
  group: TontineGroup;
  userAddress: string | null;
  onSelect: () => void;
};

export function TontineCard({ group, userAddress, onSelect }: TontineCardProps) {
  const contractId = group.contract_tontine_id ?? null;
  const chain = useTontineChain({ tontineId: contractId, userAddress });

  const contributionFormatted = formatUsdt(group.contribution_amount);
  const frequencyLabel = group.frequency_seconds >= 30 * 24 * 60 * 60 ? "Monthly" : "Weekly";

  let myTurnInWeeks: number | null = null;
  let isLate = false;
  if (chain.isMember && chain.members.length > 0 && chain.group) {
    const myIndex = chain.members.findIndex(
      (a) => a.toLowerCase() === (userAddress ?? "").toLowerCase(),
    );
    if (myIndex >= 0) {
      const current = chain.group.currentTurnIndex;
      const total = chain.members.length;
      let turnsUntilMe = (myIndex - current + total) % total;
      if (turnsUntilMe === 0 && chain.currentBeneficiary?.toLowerCase() === userAddress?.toLowerCase()) {
        turnsUntilMe = 0; // it's my turn now
      } else if (turnsUntilMe === 0) {
        turnsUntilMe = total;
      }
      const weeksPerTurn = Number(chain.group.frequencySeconds) / (7 * 24 * 60 * 60);
      myTurnInWeeks = Math.ceil(turnsUntilMe * weeksPerTurn);
    }
    if (chain.group.nextDueAt) {
      const due = Number(chain.group.nextDueAt) * 1000;
      isLate = Date.now() > due;
    }
  }

  return (
    <div
      className="rounded-2xl border border-[#e5e7eb] bg-[#FFFFFF] p-6 flex flex-col gap-4 cursor-pointer"
      style={{ boxShadow: "none" }}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-[#569f8c]/20 p-2">
            <Users className="size-5 text-[#295c4f]" />
          </div>
          <div>
            <h3 className="font-bold text-[#1a1a1a]" style={{ fontFamily: "Outfit, DM Sans, sans-serif" }}>
              {group.name ?? "Tontine"}
            </h3>
            <p className="text-xs text-[#4a4a4a]">
              {frequencyLabel} • ${contributionFormatted} USDT
            </p>
          </div>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-lg ${
            isLate ? "bg-[#ef4444]/10 text-[#ef4444]" : "bg-[#295c4f]/10 text-[#295c4f]"
          }`}
        >
          {isLate ? "Late" : "Active"}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <p className="text-[#4a4a4a]">
          Next payment: <strong className="text-[#1a1a1a]">${contributionFormatted}</strong>
        </p>
        {chain.isMember && myTurnInWeeks !== null && (
          <p className="text-[#295c4f] font-medium">
            My turn in {myTurnInWeeks === 0 ? "this round" : `${myTurnInWeeks} weeks`}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        className="mt-auto w-full py-3 rounded-xl border border-[#295c4f] text-[#295c4f] font-semibold text-sm"
      >
        View details
      </button>
    </div>
  );
}
