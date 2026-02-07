import { Icon } from "@iconify/react";
import type { ViewKey } from "../types/navigation";

type EscrowPageProps = {
  onNavigate: (view: ViewKey) => void;
};

export function EscrowPage({ onNavigate }: EscrowPageProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background font-sans text-foreground">
      <header className="flex items-center justify-between px-6 pt-12 pb-4 bg-background z-10">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigate("nexus")}
            className="flex items-center justify-center size-10 rounded-xl bg-muted active:scale-95 transition-transform"
          >
            <Icon
              icon="solar:arrow-left-linear"
              className="size-6 text-primary"
            />
          </button>
          <h1 className="text-2xl font-bold text-primary tracking-tight font-heading">
            Escrow
          </h1>
        </div>
        <div className="relative">
          <img
            src="https://lh3.googleusercontent.com/a/ACg8ocLjZAk7ayWnUP4Nh6F0p1Vyze1HIecTg3t33fSQHei6qjmiWe4=s96-c"
            alt="Kevin BJA"
            className="size-10 rounded-full object-cover border border-border"
          />
          <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-white rounded-full" />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto pb-32">
        <div className="px-6 py-4 space-y-8">
          <div className="p-6 rounded-2xl border border-border bg-white flex flex-col gap-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">
              Current Phase
            </h3>
            <div className="flex items-center justify-between relative">
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted z-0">
                <div className="h-full bg-secondary w-1/2 rounded-full" />
              </div>
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="size-10 rounded-full bg-secondary text-white flex items-center justify-center">
                  <Icon icon="solar:lock-bold" className="size-5" />
                </div>
                <span className="text-[10px] font-bold text-center leading-tight">
                  Funds
                  <br />
                  Locked
                </span>
              </div>
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="size-10 rounded-full bg-secondary text-white flex items-center justify-center">
                  <Icon icon="solar:case-bold" className="size-5" />
                </div>
                <span className="text-[10px] font-bold text-center leading-tight">
                  Work
                  <br />
                  Delivered
                </span>
              </div>
              <div className="relative z-10 flex flex-col items-center gap-2 opacity-30">
                <div className="size-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center border-2 border-border">
                  <Icon icon="solar:wad-of-money-bold" className="size-5" />
                </div>
                <span className="text-[10px] font-bold text-center leading-tight">
                  Funds
                  <br />
                  Released
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <h3 className="text-lg font-bold font-heading text-foreground">
              New Escrow Contract
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground ml-1">
                  Montant (Amount)
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">
                    $
                  </div>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-4 rounded-2xl bg-input border-none focus:ring-2 focus:ring-primary/20 text-foreground font-semibold outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground ml-1">
                  Destinataire (Recipient)
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Icon icon="solar:user-bold" className="size-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Username or Wallet Address"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-input border-none focus:ring-2 focus:ring-primary/20 text-foreground font-semibold outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground ml-1">
                  Preuve (Evidence/Proof)
                </label>
                <div className="w-full p-4 rounded-2xl bg-input border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground active:bg-muted transition-colors">
                  <Icon
                    icon="solar:upload-bold"
                    className="size-6 text-primary"
                  />
                  <span className="text-sm font-medium">
                    Upload service agreement or invoice
                  </span>
                </div>
              </div>
              <button className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg active:scale-[0.98] transition-all">
                Lock Funds
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-heading text-foreground">
                Active Contracts
              </h3>
              <button type="button" className="text-sm font-bold text-primary">
                History
              </button>
            </div>
            <div className="rounded-2xl border border-border bg-muted px-4 py-6 text-sm text-muted-foreground text-center">
              Aucun contrat charge pour l'instant.
            </div>
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
          <button type="button" className="flex flex-col items-center gap-1">
            <div className="p-1.5 rounded-xl bg-primary/10">
              <Icon
                icon="solar:shield-check-bold"
                className="size-6 text-primary"
              />
            </div>
            <span className="text-[10px] font-medium text-primary">Escrow</span>
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
