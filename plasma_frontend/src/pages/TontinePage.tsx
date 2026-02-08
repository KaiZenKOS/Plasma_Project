import { Icon } from "@iconify/react";
import { useCallback, useEffect, useState } from "react";
import { getTontineGroup, getTontineGroups } from "../api/tontine";
import type { TontineGroup, TontineGroupDetail } from "../api/types";
import type { ViewKey } from "../types/navigation";
import { useUser } from "../context/UserContext";
import { useTontineReads } from "../hooks/useTontineReads";

type TontinePageProps = {
  onNavigate: (view: ViewKey) => void;
};

function formatUsdt(raw: string): string {
  const n = Number(raw) / 1e6;
  return Number.isFinite(n)
    ? n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : raw;
}

export function TontinePage({ onNavigate }: TontinePageProps) {
  const { walletAddress } = useUser();
  const [groups, setGroups] = useState<TontineGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupDetail, setGroupDetail] = useState<TontineGroupDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const frequencyLabel = groupDetail
    ? groupDetail.frequency_seconds >= 86400
      ? "Mensuel"
      : "Hebdo"
    : "—";
  const contributionLabel = groupDetail
    ? formatUsdt(groupDetail.contribution_amount)
    : "--";
  const collateralLabel = groupDetail
    ? formatUsdt(groupDetail.collateral_amount)
    : "--";
  const memberCount = groupDetail?.members.length ?? 0;
  const tontineId = groupDetail?.contract_tontine_id ?? null;
  const missingContractId = Boolean(groupDetail && tontineId === null);
  const tontineReads = useTontineReads({
    tontineId,
    userAddress: walletAddress,
    decimals: 6,
  });
  const chainTurn = tontineReads.currentTurnIndex;
  const chainPot = tontineReads.poolBalance;
  const chainBeneficiary = tontineReads.currentBeneficiary;
  const canClaim =
    Boolean(chainBeneficiary && walletAddress) &&
    chainBeneficiary?.toLowerCase() === walletAddress?.toLowerCase();
  const claimAmount = tontineReads.pendingWithdrawal;

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
      setError(
        e instanceof Error ? e.message : "Impossible de charger les tontines",
      );
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailError(null);
    setDetailLoading(true);
    setSelectedGroupId(id);
    try {
      const data = await getTontineGroup(id);
      setGroupDetail(data);
    } catch (e) {
      setGroupDetail(null);
      setDetailError(
        e instanceof Error ? e.message : "Impossible de charger le detail",
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans text-foreground">
      <header className="flex items-center justify-between px-6 pt-12 pb-4 bg-background z-10">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigate("nexus")}
            className="flex items-center justify-center size-10 rounded-xl bg-muted active:bg-border transition-colors"
          >
            <Icon
              icon="solar:arrow-left-linear"
              className="size-6 text-primary"
            />
          </button>
          <h1 className="text-xl font-bold font-heading text-primary">
            Ma Tontine
          </h1>
        </div>
        </header>
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="px-6 py-4 space-y-6">
          <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Groupe selectionne
                </p>
                <h2 className="text-lg font-bold text-foreground">
                  {groupDetail
                    ? (groupDetail.name ?? "Tontine")
                    : "Aucun groupe"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {groupDetail
                    ? `${frequencyLabel} • ${contributionLabel} USDT`
                    : "Selectionne un groupe pour voir les details."}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Tour actuel :
                  {chainTurn !== null ? ` #${chainTurn + 1}` : " —"}
                </p>
                {missingContractId && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    Contract ID manquant dans la base (contract_tontine_id).
                  </p>
                )}
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-1 rounded-md border ${
                  groupDetail
                    ? "border-secondary text-secondary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {groupDetail ? groupDetail.status : "N/A"}
              </span>
            </div>
            {(detailError || tontineReads.error) && (
              <div className="rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {detailError ?? tontineReads.error}
              </div>
            )}
            {(detailLoading || tontineReads.loading) && (
              <div className="flex justify-center py-4">
                <Icon
                  icon="solar:refresh-circle-bold"
                  className="size-6 animate-spin text-muted-foreground"
                />
              </div>
            )}
            {groupDetail && (
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl border border-border bg-muted px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">
                    Participants
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {memberCount}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">
                    Collateral
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {collateralLabel} USDT
                  </p>
                </div>
              </div>
            )}
            {groupDetail && (
              <div className="rounded-xl border border-border bg-muted px-3 py-3 text-xs text-muted-foreground">
                <p>
                  Pot actuel:{" "}
                  {chainPot
                    ? `${Number(chainPot).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} USDT`
                    : "—"}
                </p>
                <p>
                  Beneficiaire:{" "}
                  {chainBeneficiary
                    ? `${chainBeneficiary.slice(0, 6)}...${chainBeneficiary.slice(-4)}`
                    : "—"}
                </p>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <button
                disabled={!groupDetail}
                className="w-full py-4 px-6 bg-primary text-primary-foreground rounded-xl font-bold text-lg disabled:opacity-50"
              >
                Payer ma cotisation ({contributionLabel} USDT)
              </button>
              <button
                disabled={!canClaim || !claimAmount || Number(claimAmount) <= 0}
                className="w-full py-4 px-6 border-2 border-primary text-primary rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Retirer mes gains
                {claimAmount
                  ? ` (${Number(claimAmount).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} USDT)`
                  : ""}
              </button>
              <p className="text-center text-xs text-muted-foreground italic">
                {canClaim
                  ? "Disponible maintenant."
                  : "Disponible quand c'est ton tour."}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-primary mb-4">
                Participants
              </h3>
              {groupDetail ? (
                <div className="space-y-2">
                  {groupDetail.members.map((member) => (
                    <div
                      key={`${groupDetail.id}-${member.wallet_address}`}
                      className="flex items-center justify-between rounded-xl border border-border bg-muted px-3 py-2"
                    >
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {member.wallet_address.slice(0, 6)}...
                          {member.wallet_address.slice(-4)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Statut: {member.collateral_status}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold text-secondary">
                        Tour {member.turn_position}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-muted px-3 py-4 text-xs text-muted-foreground">
                  Selectionne un groupe pour voir les membres.
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-heading text-primary">
                Groupes disponibles
              </h3>
              <button
                type="button"
                className="text-xs font-bold text-primary"
                onClick={load}
              >
                Rafraichir
              </button>
            </div>
            {error && (
              <div className="rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {loading ? (
              <div className="flex justify-center py-8">
                <Icon
                  icon="solar:refresh-circle-bold"
                  className="size-8 animate-spin text-muted-foreground"
                />
              </div>
            ) : groups.length === 0 ? (
              <div className="rounded-2xl bg-white border border-border p-6 text-center text-sm text-muted-foreground">
                Aucun groupe disponible pour le moment.
              </div>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="p-4 rounded-2xl border border-border bg-white flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {group.name ?? "Tontine"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {group.frequency_seconds >= 86400
                            ? "Mensuel"
                            : "Hebdo"}{" "}
                          • {formatUsdt(group.contribution_amount)} USDT
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-md uppercase">
                          {group.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => loadDetail(group.id)}
                          className="text-[10px] font-semibold text-secondary"
                        >
                          Voir details
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Collateral: {formatUsdt(group.collateral_amount)} USDT
                      </span>
                      <span>
                        {group.smart_contract_address
                          ? "On-chain"
                          : "Off-chain"}
                      </span>
                    </div>
                    <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-transform">
                      Rejoindre
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
              <Icon
                icon="solar:home-2-linear"
                className="size-6 text-foreground"
              />
            </div>
            <span className="text-[10px] font-medium text-foreground">
              Orbit
            </span>
          </button>
          <button type="button" className="flex flex-col items-center gap-1">
            <div className="p-1.5 rounded-xl bg-primary/10">
              <Icon
                icon="solar:users-group-rounded-bold"
                className="size-6 text-primary"
              />
            </div>
            <span className="text-[10px] font-medium text-primary">
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
