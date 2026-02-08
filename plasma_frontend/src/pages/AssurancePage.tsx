import { useRef } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";
import type { ViewKey } from "../types/navigation";
import { InsuranceCard } from "../features/insurance";

type AssurancePageProps = {
  onNavigate: (view: ViewKey) => void;
};

export function AssurancePage({ onNavigate }: AssurancePageProps) {
  const insuranceCardRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans text-foreground">
      <header className="flex items-center justify-between px-6 pt-12 pb-6">
        <button
          type="button"
          onClick={() => onNavigate("nexus")}
          className="size-10 rounded-xl border border-border bg-white flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="size-5 text-primary" />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-bold font-heading text-primary">
            Insurance
          </h1>
          <p className="text-xs text-muted-foreground">
            Simple, clear protection
          </p>
        </div>
        <div className="size-10" aria-hidden />
      </header>

      <main className="flex-1 overflow-y-auto pb-28">
        <div className="px-6 space-y-8">
          <section ref={insuranceCardRef} className="space-y-4">
            <InsuranceCard />
          </section>

          <section className="rounded-2xl border border-border bg-muted p-5">
            <h3 className="text-lg font-bold font-heading text-foreground">
              Included protections
            </h3>
            <div className="mt-4 grid gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl border border-border bg-white flex items-center justify-center">
                  <ShieldCheck className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Fraud coverage
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fast refund within 48h
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl border border-border bg-white flex items-center justify-center">
                  <HeartPulse className="size-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    24/7 support
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Chat and human support
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl border border-border bg-white flex items-center justify-center">
                  <CheckCircle2 className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Verified contracts
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Automatic risk validation
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-heading text-foreground">
                Claims status
              </h3>
              <span className="text-xs font-semibold text-muted-foreground">
                Pending
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-[10px] font-semibold text-muted-foreground">
              <span className="flex-1 text-center bg-muted rounded-full py-2 border border-border">
                Declare
              </span>
              <span className="flex-1 text-center bg-muted rounded-full py-2 border border-border">
                Analysis
              </span>
              <span className="flex-1 text-center bg-muted rounded-full py-2 border border-border">
                Resolution
              </span>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No backend data at this time.
            </p>
          </section>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-4">
        <button
          type="button"
          onClick={() => insuranceCardRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="w-full rounded-xl bg-primary text-primary-foreground py-4 font-semibold"
        >
          Upgrade my insurance
        </button>
      </footer>
    </div>
  );
}
