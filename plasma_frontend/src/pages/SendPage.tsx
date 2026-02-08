import { ArrowLeft } from "lucide-react";
import type { ViewKey } from "../types/navigation";
import { SendP2P } from "../components/SendP2P";

type SendPageProps = {
  onNavigate: (view: ViewKey) => void;
};

export function SendPage({ onNavigate }: SendPageProps) {
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
            Send
          </h1>
          <p className="text-xs text-muted-foreground">
            Transfer XPL or USDT (P2P)
          </p>
        </div>
        <div className="size-10" />
      </header>

      <main className="flex-1 overflow-y-auto pb-28">
        <div className="px-6">
          <SendP2P />
        </div>
      </main>
    </div>
  );
}
