import { useCallback, useState } from "react";
import { createTontineGroupSimple } from "../../../api/tontine";
import { useUser } from "../../../context/UserContext";
import { useTontineToast } from "../context/ToastContext";
import { useWalletClient } from "../hooks/useWalletClient";

const PERIOD_OPTIONS = [
  { label: "Hebdomadaire", value: "weekly" as const },
  { label: "Mensuel", value: "monthly" as const },
] as const;

export function CreateTontineForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useTontineToast();
  const { walletAddress } = useUser();
  const walletClient = useWalletClient();

  const [name, setName] = useState("");
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [contribution, setContribution] = useState("");
  const [collateral, setCollateral] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const contributionNum = Number(contribution) || 0;
  const collateralNum = Number(collateral) || 0;
  const creatorWallet = (() => {
    const w = walletAddress?.trim().toLowerCase();
    if (w) return w;
    const addr = walletClient?.account?.address;
    return addr ? addr.toLowerCase() : "";
  })();

  const addMember = useCallback(() => {
    const addr = memberInput.trim().toLowerCase();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      toast("Adresse wallet invalide (0x...)", "error");
      return;
    }
    if (members.includes(addr)) {
      toast("Déjà ajouté", "error");
      return;
    }
    setMembers((prev) => [...prev, addr]);
    setMemberInput("");
  }, [memberInput, members, toast]);

  const removeMember = useCallback((addr: string) => {
    setMembers((prev) => prev.filter((a) => a !== addr));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!creatorWallet) {
      toast("Connectez votre wallet pour créer une tontine.", "error");
      return;
    }
    if (contributionNum <= 0) {
      toast("Indiquez un montant de cotisation > 0.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await createTontineGroupSimple({
        name: name.trim() || "Ma Tontine",
        period,
        contribution_amount_usdt: contributionNum,
        collateral_amount_usdt: collateralNum,
        creator_wallet: creatorWallet,
        members,
      });
      toast("Tontine créée. Elle apparaît dans la liste.", "success");
      onSuccess?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast(msg || "Erreur lors de la création", "error");
    } finally {
      setSubmitting(false);
    }
  }, [creatorWallet, name, period, contributionNum, collateralNum, members, toast, onSuccess]);

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-[#FFFFFF] p-8" style={{ boxShadow: "none" }}>
      <h2 className="text-xl font-bold text-[#295c4f] mb-6" style={{ fontFamily: "Outfit, DM Sans, sans-serif" }}>
        Créer une tontine
      </h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#4a4a4a] mb-2">Nom</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Tontine famille"
            className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-[#1a1a1a] outline-none focus:border-[#295c4f]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#4a4a4a] mb-2">Période</label>
          <div className="flex gap-3">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                className={`flex-1 py-3 rounded-xl border text-sm font-medium ${
                  period === opt.value
                    ? "border-[#295c4f] bg-[#295c4f]/10 text-[#295c4f]"
                    : "border-[#e5e7eb] bg-[#f8fafc] text-[#4a4a4a]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#4a4a4a] mb-2">Cotisation (USDT)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={contribution}
            onChange={(e) => setContribution(e.target.value)}
            placeholder="Ex: 50"
            className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-[#1a1a1a] outline-none focus:border-[#295c4f]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#4a4a4a] mb-2">Nantissement (USDT, optionnel)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={collateral}
            onChange={(e) => setCollateral(e.target.value)}
            placeholder="0"
            className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-[#1a1a1a] outline-none focus:border-[#295c4f]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#4a4a4a] mb-2">Membres (adresses wallet)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMember())}
              placeholder="0x..."
              className="flex-1 rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-[#1a1a1a] font-mono text-sm outline-none focus:border-[#295c4f]"
            />
            <button
              type="button"
              onClick={addMember}
              className="py-3 px-4 rounded-xl border border-[#295c4f] text-[#295c4f] font-medium text-sm"
            >
              Ajouter
            </button>
          </div>
          {members.length > 0 && (
            <ul className="mt-2 space-y-1">
              {members.map((addr) => (
                <li key={addr} className="flex items-center justify-between text-sm font-mono text-[#4a4a4a] bg-[#f8fafc] rounded-lg px-3 py-2">
                  <span className="truncate">{addr}</span>
                  <button
                    type="button"
                    onClick={() => removeMember(addr)}
                    className="text-[#ef4444] hover:underline ml-2 shrink-0"
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-[#4a4a4a]">Vous êtes créateur et premier membre. Ajoutez les autres participants.</p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || contributionNum <= 0 || !creatorWallet}
          className="w-full py-4 rounded-xl font-semibold text-white bg-[#295c4f] disabled:opacity-50"
        >
          {submitting ? "Création…" : "Créer la tontine"}
        </button>

        {!creatorWallet && (
          <p className="text-sm text-[#4a4a4a]">Connectez votre wallet pour créer une tontine.</p>
        )}
      </div>
    </div>
  );
}
