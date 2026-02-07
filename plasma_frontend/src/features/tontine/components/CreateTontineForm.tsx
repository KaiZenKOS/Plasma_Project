import { ChevronRight } from "lucide-react";
import { useCallback, useState } from "react";
import { useTontineToast } from "../context/ToastContext";
import { useTontineWrite } from "../hooks/useTontineWrite";
import { useWalletClient } from "../hooks/useWalletClient";

const FREQUENCY_OPTIONS = [
  { label: "Weekly", value: 7 * 24 * 60 * 60 },
  { label: "Monthly", value: 30 * 24 * 60 * 60 },
] as const;

const MAX_PARTICIPANTS_OPTIONS = [4, 6, 8, 10, 12];

type Step = 1 | 2 | 3;

export function CreateTontineForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useTontineToast();
  const walletClient = useWalletClient();
  const {
    createTontine,
    txState,
    txError,
    resetTx,
  } = useTontineWrite(walletClient);

  const [step, setStep] = useState<Step>(1);
  const [contribution, setContribution] = useState("");
  const [frequencySeconds, setFrequencySeconds] = useState(FREQUENCY_OPTIONS[0].value);
  const [collateral, setCollateral] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(6);

  const contributionNum = Number(contribution) || 0;
  const collateralNum = Number(collateral) || 0;
  const estimatedPot = contributionNum * maxParticipants;
  const isValidStep1 = contributionNum > 0 && collateralNum >= 0;

  const handleSubmit = useCallback(async () => {
    if (!isValidStep1) return;
    resetTx();
    const result = await createTontine(
      String(contributionNum),
      frequencySeconds,
      String(collateralNum),
    );
    if (result?.hash) {
      toast("Tontine created successfully", "success");
      onSuccess?.();
    } else if (txError) {
      toast(txError, "error");
    }
  }, [
    isValidStep1,
    contributionNum,
    collateralNum,
    frequencySeconds,
    createTontine,
    resetTx,
    txError,
    toast,
    onSuccess,
  ]);

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-[#FFFFFF] p-8" style={{ boxShadow: "none" }}>
      <h2 className="text-xl font-bold text-[#295c4f] mb-6" style={{ fontFamily: "Outfit, DM Sans, sans-serif" }}>
        Create a Tontine
      </h2>

      {step === 1 && (
        <div className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-[#4a4a4a] mb-2">
              Contribution per round (USDT)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={contribution}
              onChange={(e) => setContribution(e.target.value)}
              placeholder="e.g. 50"
              className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-[#1a1a1a] outline-none focus:border-[#295c4f]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#4a4a4a] mb-2">
              Collateral (USDT)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={collateral}
              onChange={(e) => setCollateral(e.target.value)}
              placeholder="e.g. 25"
              className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-[#1a1a1a] outline-none focus:border-[#295c4f]"
            />
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!isValidStep1}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-white bg-[#295c4f] disabled:opacity-50"
          >
            Next
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-[#4a4a4a] mb-2">
              Frequency
            </label>
            <div className="flex gap-3">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequencySeconds(opt.value)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium ${
                    frequencySeconds === opt.value
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
            <label className="block text-sm font-medium text-[#4a4a4a] mb-2">
              Max participants
            </label>
            <div className="flex flex-wrap gap-2">
              {MAX_PARTICIPANTS_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMaxParticipants(n)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium ${
                    maxParticipants === n
                      ? "border-[#295c4f] bg-[#295c4f]/10 text-[#295c4f]"
                      : "border-[#e5e7eb] bg-[#f8fafc] text-[#4a4a4a]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
            <p className="text-xs text-[#4a4a4a]">Estimated total pot (one full cycle)</p>
            <p className="text-2xl font-bold text-[#295c4f]">
              ${estimatedPot.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDT
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-4 rounded-xl border border-[#e5e7eb] font-semibold text-[#4a4a4a]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-white bg-[#295c4f]"
            >
              Next
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-8">
          <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-4 space-y-2 text-sm">
            <p><strong>Contribution:</strong> ${contributionNum} USDT</p>
            <p><strong>Frequency:</strong> {FREQUENCY_OPTIONS.find((o) => o.value === frequencySeconds)?.label ?? "—"}</p>
            <p><strong>Collateral:</strong> ${collateralNum} USDT</p>
            <p><strong>Max participants:</strong> {maxParticipants}</p>
            <p className="pt-2 font-bold text-[#295c4f]">
              Estimated pot: ${estimatedPot.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDT
            </p>
          </div>
          {txError && (
            <div className="rounded-xl border border-[#ef4444] bg-[#ef4444]/10 px-4 py-3 text-sm text-[#ef4444]">
              {txError}
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={txState === "confirming"}
              className="flex-1 py-4 rounded-xl border border-[#e5e7eb] font-semibold text-[#4a4a4a] disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={txState === "confirming" || !walletClient}
              className="flex-1 py-4 rounded-xl font-semibold text-white bg-[#295c4f] disabled:opacity-50"
            >
              {txState === "confirming" ? "Confirm in wallet…" : "Create Tontine"}
            </button>
          </div>
          {!walletClient && (
            <p className="text-sm text-[#4a4a4a]">
              Connect your wallet (e.g. MetaMask) to create a tontine on-chain.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-2 justify-center">
        {([1, 2, 3] as Step[]).map((s) => (
          <div
            key={s}
            className={`size-2 rounded-full ${step === s ? "bg-[#295c4f]" : "bg-[#e5e7eb]"}`}
          />
        ))}
      </div>
    </div>
  );
}
