import { Icon } from "@iconify/react";

type ProtectionPageProps = { onBack: () => void };

export function ProtectionPage({ onBack }: ProtectionPageProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans relative overflow-hidden">
      <header className="flex items-center justify-between px-6 pt-12 pb-6">
        <button onClick={onBack} className="size-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center border border-border">
          <Icon icon="solar:alt-arrow-right-linear" className="size-5 rotate-180" />
        </button>
        <h1 className="text-lg font-bold font-heading">Protection</h1>
        <div className="size-10" />
      </header>
      <main className="flex-1 px-6 pb-24 overflow-y-auto flex flex-col gap-6">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col gap-4">
          <div className="size-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
            <Icon icon="solar:shield-check-bold" className="size-8" />
          </div>
          <h2 className="text-xl font-bold">Parametric Insurance</h2>
          <p className="text-sm text-muted-foreground">
            Weather-based coverage. The backend runs a worker (e.g. OpenWeatherMap) and can trigger payouts when conditions are met.
          </p>
          <p className="text-xs text-muted-foreground">
            Status: Mock — connect a policy contract for real payouts.
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold mb-2">Active coverage</h3>
          <p className="text-sm text-muted-foreground">Premium Plan • Backend CRON worker</p>
        </div>
      </main>
    </div>
  );
}
