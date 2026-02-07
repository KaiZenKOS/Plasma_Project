import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  HeartPulse,
  ShieldCheck,
  Umbrella,
  Users,
  Wallet,
} from "lucide-react";
import type { ViewKey } from "../types/navigation";

type AssurancePageProps = {
  onNavigate: (view: ViewKey) => void;
};

export function AssurancePage({ onNavigate }: AssurancePageProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background font-sans text-foreground">
      <header className="flex items-center justify-between px-6 pt-12 pb-6">
        <button
          type="button"
          onClick={() => onNavigate("nexus")}
          className="size-10 rounded-xl border border-border bg-white flex items-center justify-center"
          aria-label="Retour"
        >
          <ArrowLeft className="size-5 text-primary" />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-bold font-heading text-primary">
            Assurance
          </h1>
          <p className="text-xs text-muted-foreground">
            Protection simple et claire
          </p>
        </div>
        <div className="relative">
          <img
            src="https://lh3.googleusercontent.com/a/ACg8ocLjZAk7ayWnUP4Nh6F0p1Vyze1HIecTg3t33fSQHei6qjmiWe4=s96-c"
            alt="Kevin BJA"
            className="size-10 rounded-full object-cover border border-border"
          />
          <div className="absolute bottom-0 right-0 size-3 bg-secondary border-2 border-white rounded-full" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-28">
        <div className="px-6 space-y-8">
          <section className="relative overflow-hidden rounded-2xl border border-border bg-white p-6">
            <div className="absolute -right-10 -top-8 size-32 rounded-full bg-secondary/10" />
            <div className="absolute -left-12 bottom-0 size-24 rounded-full bg-primary/10" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Couverture active
                </p>
                <h2 className="mt-2 text-2xl font-bold text-foreground">
                  Non disponible
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Donnees assurance en attente de backend.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="size-6 text-primary" />
                </div>
                <span className="text-[10px] font-semibold text-primary">
                  Actif
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-heading text-foreground">
                Votre plan
              </h3>
              <span className="text-xs font-semibold text-secondary">
                Renouvellement: en attente
              </span>
            </div>
            <div className="grid gap-4">
              <div className="rounded-2xl border border-border bg-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">
                      Plan Essentiel
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      Non disponible
                    </p>
                  </div>
                  <div className="size-12 rounded-full bg-secondary/10 flex items-center justify-center">
                    <Umbrella className="size-6 text-secondary" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <Users className="size-4 text-secondary" />
                  Donnees indisponibles
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">
                      Assurance Escrow
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      Non disponible
                    </p>
                  </div>
                  <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wallet className="size-6 text-primary" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <Calendar className="size-4 text-primary" />
                  Donnees indisponibles
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-muted p-5">
            <h3 className="text-lg font-bold font-heading text-foreground">
              Protections incluses
            </h3>
            <div className="mt-4 grid gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl border border-border bg-white flex items-center justify-center">
                  <ShieldCheck className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Couverture fraude
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Remboursement rapide sous 48h
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl border border-border bg-white flex items-center justify-center">
                  <HeartPulse className="size-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Assistance 24/7
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Chat et support humain
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl border border-border bg-white flex items-center justify-center">
                  <CheckCircle2 className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Contrats verifies
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Validation automatique du risque
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-heading text-foreground">
                Etat des sinistres
              </h3>
              <span className="text-xs font-semibold text-muted-foreground">
                En attente
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-[10px] font-semibold text-muted-foreground">
              <span className="flex-1 text-center bg-muted rounded-full py-2 border border-border">
                Declare
              </span>
              <span className="flex-1 text-center bg-muted rounded-full py-2 border border-border">
                Analyse
              </span>
              <span className="flex-1 text-center bg-muted rounded-full py-2 border border-border">
                Resolution
              </span>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Aucune donnee backend pour le moment.
            </p>
          </section>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-4">
        <button className="w-full rounded-xl bg-primary text-primary-foreground py-4 font-semibold">
          Mettre a niveau mon assurance
        </button>
      </footer>
    </div>
  );
}
