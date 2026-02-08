import { useCallback, useState, useEffect } from "react";
import { useUser } from "../../../context/UserContext";
import { useTontineToast } from "../context/ToastContext";
import { useWalletClient } from "../hooks/useWalletClient";
import { useTontineWrite } from "../hooks/useTontineWrite";
import { publicClient } from "../../../blockchain/viem";
import { TONTINE_ABI } from "../abi";
import { TONTINE_CONTRACT_ADDRESS } from "../config";

const PERIOD_OPTIONS = [
  { label: "Hebdomadaire", value: "weekly" as const },
  { label: "Mensuel", value: "monthly" as const },
] as const;

const EXPLORER_URL = typeof import.meta.env.VITE_PLASMA_EXPLORER_URL === "string" && import.meta.env.VITE_PLASMA_EXPLORER_URL
  ? import.meta.env.VITE_PLASMA_EXPLORER_URL
  : "https://testnet.plasmascan.to";

export function CreateTontineForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useTontineToast();
  const { walletAddress } = useUser();
  const walletClient = useWalletClient();
  const { createTontine, txState, txError, resetTx } = useTontineWrite(walletClient);

  const [name, setName] = useState("");
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [contribution, setContribution] = useState("");
  const [collateral, setCollateral] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [tontineId, setTontineId] = useState<number | null>(null);

  const contributionNum = Number(contribution) || 0;
  const collateralNum = Number(collateral) || 0;
  const creatorWallet = (() => {
    const w = walletAddress?.trim().toLowerCase();
    if (w) return w;
    const addr = walletClient?.account?.address;
    return addr ? addr.toLowerCase() : "";
  })();

  // Wait for transaction receipt when hash is available
  useEffect(() => {
    if (!txHash || !TONTINE_CONTRACT_ADDRESS) return;
    
    const waitForReceipt = async () => {
      try {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        // Read the latest tontine ID
        const nextId = await publicClient.readContract({
          address: TONTINE_CONTRACT_ADDRESS,
          abi: TONTINE_ABI,
          functionName: "nextTontineId",
        });
        const latestId = Number(nextId) - 1;
        if (latestId >= 0) {
          setTontineId(latestId);
          toast("Tontine créée avec succès sur la blockchain!", "success");
          onSuccess?.();
        }
      } catch (err) {
        console.error("Error waiting for receipt:", err);
      }
    };
    
    waitForReceipt();
  }, [txHash, toast, onSuccess]);

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
    if (!creatorWallet || !walletClient) {
      toast("Connectez votre wallet pour créer une tontine.", "error");
      return;
    }
    if (contributionNum <= 0) {
      toast("Indiquez un montant de cotisation > 0.", "error");
      return;
    }
    if (!TONTINE_CONTRACT_ADDRESS) {
      toast("Contrat Tontine non configuré.", "error");
      return;
    }

    resetTx();
    setTxHash(null);
    setTontineId(null);

    // Convert period to frequency in seconds
    const frequencySeconds = period === "weekly" ? 7 * 24 * 60 * 60 : 30 * 24 * 60 * 60;

    try {
      const result = await createTontine(
        contribution,
        frequencySeconds,
        collateral || "0"
      );
      
      if (result?.hash) {
        setTxHash(result.hash);
        if (result.tontineId >= 0) {
          setTontineId(result.tontineId);
        }
      } else {
        toast(txError || "Erreur lors de la création", "error");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast(msg || "Erreur lors de la création", "error");
    }
  }, [creatorWallet, walletClient, contribution, collateral, period, contributionNum, createTontine, txError, resetTx, toast]);

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
          disabled={txState === "confirming" || txState === "success" || contributionNum <= 0 || !creatorWallet || !walletClient}
          className="w-full py-4 rounded-xl font-semibold text-white bg-[#295c4f] disabled:opacity-50"
        >
          {txState === "confirming" ? "Confirmez dans votre wallet…" : txState === "success" ? "Transaction envoyée" : "Créer la tontine"}
        </button>

        {txState === "confirming" && (
          <p className="text-sm text-[#295c4f] text-center">
            ⏳ En attente de confirmation dans votre wallet…
          </p>
        )}

        {txHash && (
          <div className="rounded-xl border-2 border-[#295c4f] bg-[#295c4f]/5 p-4 space-y-2">
            <p className="text-sm font-semibold text-[#295c4f]">Transaction envoyée!</p>
            <a
              href={`${EXPLORER_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-[#295c4f] hover:underline break-all"
            >
              Voir sur l'explorateur: {txHash.slice(0, 10)}…{txHash.slice(-8)}
            </a>
            {tontineId !== null && (
              <p className="text-sm text-[#4a4a4a]">
                Tontine ID: <strong>{tontineId}</strong>
              </p>
            )}
          </div>
        )}

        {txError && (
          <p className="text-sm text-[#ef4444] text-center">{txError}</p>
        )}

        {!creatorWallet && (
          <p className="text-sm text-[#4a4a4a]">Connectez votre wallet pour créer une tontine.</p>
        )}

        {!walletClient && creatorWallet && (
          <p className="text-sm text-[#4a4a4a]">Initialisation du wallet…</p>
        )}
      </div>
    </div>
  );
}
