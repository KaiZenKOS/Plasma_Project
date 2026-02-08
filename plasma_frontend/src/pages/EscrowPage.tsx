import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { Icon } from "@iconify/react";
import type { ViewKey } from "../types/navigation";
import { useUser } from "../context/UserContext";
import {
  createEasEscrow,
  getEasEscrows,
  getEasEscrowDetail,
  releaseEasEscrow,
  type EasEscrow,
  type EasEscrowDetail,
} from "../api/eas";
import { useWalletClient } from "../features/tontine";
import { publicClient } from "../blockchain/viem";
import {
  ESCROW_SERVICE_ADDRESS,
  ESCROW_USDT_ADDRESS,
  ESCROW_SERVICE_ABI,
  ERC20_ABI,
  USDT_DECIMALS,
} from "../blockchain/escrowService";

const explorerUrl =
  typeof import.meta.env.VITE_PLASMA_EXPLORER_URL === "string" && import.meta.env.VITE_PLASMA_EXPLORER_URL
    ? import.meta.env.VITE_PLASMA_EXPLORER_URL
    : "https://testnet.plasmascan.to";

function shorten(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

type EscrowPageProps = {
  onNavigate: (view: ViewKey) => void;
};

export function EscrowPage({ onNavigate }: EscrowPageProps) {
  const { walletAddress } = useUser();
  const [list, setList] = useState<EasEscrow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<EasEscrowDetail | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [description, setDescription] = useState("");

  const walletClient = useWalletClient();
  type ChainEscrow = { escrowId: number; depositor: string; beneficiary: string; amount: bigint; released: boolean };
  const [chainList, setChainList] = useState<ChainEscrow[]>([]);
  const [chainLoading, setChainLoading] = useState(false);
  const [chainCreating, setChainCreating] = useState(false);
  const [chainReleasingId, setChainReleasingId] = useState<number | null>(null);
  const [chainError, setChainError] = useState<string | null>(null);
  const [chainAmount, setChainAmount] = useState("");
  const [chainBeneficiary, setChainBeneficiary] = useState("");

  const loadList = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getEasEscrows(walletAddress);
      setList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const d = await getEasEscrowDetail(id);
      setDetail(d);
      setDetailId(id);
    } catch {
      setDetail(null);
      setDetailId(null);
    }
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      setError("Connectez votre wallet.");
      return;
    }
    const amt = parseFloat(amount);
    const ben = beneficiary.trim();
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Montant invalide.");
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(ben)) {
      setError("Adresse bénéficiaire invalide (0x...).");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const escrow = await createEasEscrow({
        depositor_wallet: walletAddress,
        beneficiary_address: ben,
        amount_usdt: amt,
        description: description.trim() || undefined,
      });
      setList((prev) => [escrow, ...prev]);
      setAmount("");
      setBeneficiary("");
      setDescription("");
      setDetail(escrow as EasEscrowDetail);
      setDetailId(escrow.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible");
    } finally {
      setCreating(false);
    }
  };

  const handleRelease = async (id: string) => {
    setReleasingId(id);
    setError(null);
    try {
      await releaseEasEscrow(id);
      await loadList();
      if (detailId === id) await loadDetail(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Release impossible");
    } finally {
      setReleasingId(null);
    }
  };

  const loadChainList = useCallback(async () => {
    if (!ESCROW_SERVICE_ADDRESS || !walletAddress) return;
    setChainLoading(true);
    setChainError(null);
    try {
      const nextId = await publicClient.readContract({
        address: ESCROW_SERVICE_ADDRESS,
        abi: ESCROW_SERVICE_ABI,
        functionName: "nextEscrowId",
      });
      const list: ChainEscrow[] = [];
      const w = walletAddress.toLowerCase();
      for (let i = 0; i < Number(nextId); i++) {
        const [depositor, beneficiary, amount, released] = await publicClient.readContract({
          address: ESCROW_SERVICE_ADDRESS,
          abi: ESCROW_SERVICE_ABI,
          functionName: "getEscrow",
          args: [BigInt(i)],
        });
        if (depositor.toLowerCase() === w || beneficiary.toLowerCase() === w)
          list.push({ escrowId: i, depositor, beneficiary, amount, released });
      }
      setChainList(list.reverse());
    } catch (e) {
      setChainError(e instanceof Error ? e.message : "Erreur chargement chain");
    } finally {
      setChainLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (ESCROW_SERVICE_ADDRESS && walletAddress) loadChainList();
  }, [loadChainList, walletAddress]);

  const handleCreateChain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ESCROW_SERVICE_ADDRESS || !ESCROW_USDT_ADDRESS || !walletClient?.account) {
      setChainError("Contrat ou wallet non configuré.");
      return;
    }
    const amt = parseFloat(chainAmount);
    const ben = chainBeneficiary.trim();
    if (!Number.isFinite(amt) || amt <= 0) {
      setChainError("Montant invalide.");
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(ben)) {
      setChainError("Adresse bénéficiaire invalide (0x...).");
      return;
    }
    const amountWei = BigInt(Math.round(amt * 10 ** USDT_DECIMALS));
    setChainCreating(true);
    setChainError(null);
    try {
      await walletClient.writeContract({
        address: ESCROW_USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [ESCROW_SERVICE_ADDRESS, amountWei],
        account: walletClient.account,
      });
      await walletClient.writeContract({
        address: ESCROW_SERVICE_ADDRESS,
        abi: ESCROW_SERVICE_ABI,
        functionName: "createEscrow",
        args: [ben as `0x${string}`, amountWei],
        account: walletClient.account,
      });
      setChainAmount("");
      setChainBeneficiary("");
      await loadChainList();
    } catch (err) {
      setChainError(err instanceof Error ? err.message : "Création on-chain impossible");
    } finally {
      setChainCreating(false);
    }
  };

  const handleReleaseChain = async (escrowId: number) => {
    if (!ESCROW_SERVICE_ADDRESS || !walletClient?.account) return;
    setChainReleasingId(escrowId);
    setChainError(null);
    try {
      await walletClient.writeContract({
        address: ESCROW_SERVICE_ADDRESS,
        abi: ESCROW_SERVICE_ABI,
        functionName: "release",
        args: [BigInt(escrowId)],
        account: walletClient.account,
      });
      await loadChainList();
    } catch (err) {
      setChainError(err instanceof Error ? err.message : "Release impossible");
    } finally {
      setChainReleasingId(null);
    }
  };

  const isDepositorChain = (e: ChainEscrow) =>
    walletAddress && e.depositor.toLowerCase() === walletAddress.toLowerCase();

  const isDepositor = (e: EasEscrow) =>
    walletAddress && e.depositor_address.toLowerCase() === walletAddress.toLowerCase();

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans text-foreground">
      <header className="flex items-center justify-between px-6 pt-12 pb-4 bg-background z-10">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigate("nexus")}
            className="flex items-center justify-center size-10 rounded-xl bg-muted active:scale-95 transition-transform"
          >
            <Icon icon="solar:arrow-left-linear" className="size-6 text-primary" />
          </button>
          <h1 className="text-2xl font-bold text-primary tracking-tight font-heading">Escrow</h1>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto pb-32">
        <div className="px-6 py-4 space-y-8">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 text-red-600 text-sm font-medium">{error}</div>
          )}

          <div className="space-y-6">
            <h3 className="text-lg font-bold font-heading text-foreground">Nouvel escrow</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground ml-1">Montant (USDT)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">$</div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-4 rounded-2xl bg-input border-none focus:ring-2 focus:ring-primary/20 text-foreground font-semibold outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground ml-1">Bénéficiaire (adresse 0x...)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Icon icon="solar:user-bold" className="size-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={beneficiary}
                    onChange={(e) => setBeneficiary(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-input border-none focus:ring-2 focus:ring-primary/20 text-foreground font-semibold outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground ml-1">Description (optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: paiement livraison"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-4 rounded-2xl bg-input border-none focus:ring-2 focus:ring-primary/20 text-foreground outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={creating || !walletAddress}
                className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {creating ? "Création…" : "Créer l'escrow"}
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-heading text-foreground">Contrats</h3>
            </div>
            {!walletAddress ? (
              <p className="text-sm text-muted-foreground">Connectez votre wallet pour voir vos escrows.</p>
            ) : loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : list.length === 0 ? (
              <div className="rounded-2xl border border-border bg-muted px-4 py-6 text-sm text-muted-foreground text-center">
                Aucun contrat pour l'instant.
              </div>
            ) : (
              <ul className="space-y-4">
                {list.map((e) => (
                  <li
                    key={e.id}
                    className="p-4 rounded-2xl border border-border bg-white space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{e.amount_usdt} USDT</span>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          e.status === "LOCKED" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                        }`}
                      >
                        {e.status === "LOCKED" ? "Verrouillé" : "Libéré"}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Déposant {shorten(e.depositor_address)} → Bénéficiaire {shorten(e.beneficiary_address)}
                    </div>
                    {e.description && (
                      <p className="text-sm text-muted-foreground">{e.description}</p>
                    )}
                    {e.status === "LOCKED" && (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">Dépôt:</span>
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {e.deposit_wallet_address}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(e.deposit_wallet_address);
                            }}
                            className="text-primary text-xs font-medium"
                          >
                            Copier
                          </button>
                          <a
                            href={`${explorerUrl}/address/${e.deposit_wallet_address}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary"
                          >
                            Explorateur
                          </a>
                        </div>
                        {detailId === e.id && detail?.balanceFormatted != null && (
                          <p className="text-sm">
                            Solde déposé: <strong>{detail.balanceFormatted} USDT</strong>
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => loadDetail(e.id)}
                            className="text-sm text-primary font-medium"
                          >
                            Voir solde
                          </button>
                          {isDepositor(e) && (
                            <button
                              type="button"
                              onClick={() => handleRelease(e.id)}
                              disabled={releasingId === e.id}
                              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50"
                            >
                              {releasingId === e.id ? "Envoi…" : "Libérer vers bénéficiaire"}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                    {e.status === "RELEASED" && e.release_tx_hash && (
                      <a
                        href={`${explorerUrl}/tx/${e.release_tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary"
                      >
                        Voir la transaction
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {ESCROW_SERVICE_ADDRESS && (
            <div className="space-y-6 rounded-2xl border border-border bg-white p-6">
              <h3 className="text-lg font-bold font-heading text-foreground">Escrow on-chain (contrat)</h3>
              {chainError && (
                <div className="p-3 rounded-xl bg-red-500/10 text-red-600 text-sm font-medium">{chainError}</div>
              )}
              <form onSubmit={handleCreateChain} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground ml-1">Montant USDT</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={chainAmount}
                    onChange={(e) => setChainAmount(e.target.value)}
                    className="w-full px-4 py-4 rounded-2xl bg-input border-none focus:ring-2 focus:ring-primary/20 text-foreground outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground ml-1">Bénéficiaire (0x...)</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={chainBeneficiary}
                    onChange={(e) => setChainBeneficiary(e.target.value)}
                    className="w-full px-4 py-4 rounded-2xl bg-input border-none focus:ring-2 focus:ring-primary/20 text-foreground outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={chainCreating || !walletClient?.account}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {chainCreating ? "Approve + Création…" : "Créer (contrat)"}
                </button>
              </form>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground">Contrats on-chain</h4>
                {!walletAddress ? (
                  <p className="text-sm text-muted-foreground">Connectez votre wallet.</p>
                ) : chainLoading ? (
                  <p className="text-sm text-muted-foreground">Chargement…</p>
                ) : chainList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun.</p>
                ) : (
                  <ul className="space-y-3">
                    {chainList.map((e) => (
                      <li key={e.escrowId} className="p-3 rounded-xl border border-border bg-muted/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{formatUnits(e.amount, USDT_DECIMALS)} USDT</span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded ${
                              e.released ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {e.released ? "Libéré" : "Verrouillé"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Déposant {shorten(e.depositor)} → Bénéficiaire {shorten(e.beneficiary)}
                        </div>
                        {!e.released && isDepositorChain(e) && (
                          <button
                            type="button"
                            onClick={() => handleReleaseChain(e.escrowId)}
                            disabled={chainReleasingId === e.escrowId}
                            className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-50"
                          >
                            {chainReleasingId === e.escrowId ? "Envoi…" : "Libérer"}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-2 pb-6 z-50">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate("nexus")}
            className="flex flex-col items-center gap-1 opacity-50"
          >
            <div className="p-1.5 rounded-xl">
              <Icon icon="solar:home-2-linear" className="size-6 text-foreground" />
            </div>
            <span className="text-[10px] font-medium text-foreground">Orbit</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("tontine")}
            className="flex flex-col items-center gap-1 opacity-50"
          >
            <div className="p-1.5 rounded-xl">
              <Icon icon="solar:users-group-rounded-linear" className="size-6 text-foreground" />
            </div>
            <span className="text-[10px] font-medium text-foreground">Tontine</span>
          </button>
          <button type="button" className="flex flex-col items-center gap-1">
            <div className="p-1.5 rounded-xl bg-primary/10">
              <Icon icon="solar:shield-check-bold" className="size-6 text-primary" />
            </div>
            <span className="text-[10px] font-medium text-primary">Escrow</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("assurance")}
            className="flex flex-col items-center gap-1 opacity-50"
          >
            <div className="p-1.5 rounded-xl">
              <Icon icon="solar:umbrella-linear" className="size-6 text-foreground" />
            </div>
            <span className="text-[10px] font-medium text-foreground">Assurance</span>
          </button>
        </div>
      </div>
    </div>
  );
}
