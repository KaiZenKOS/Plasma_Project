import { useMemo, useState } from "react";
import type { ViewKey } from "./types/navigation";
import { AssurancePage } from "./pages/AssurancePage";
import { EscrowPage } from "./pages/EscrowPage";
import { NexusHubPage } from "./pages/NexusHubPage";
import { TontinePage } from "./pages/TontinePage";

function App() {
  const [activeView, setActiveView] = useState<ViewKey>("nexus");

  const content = useMemo(() => {
    switch (activeView) {
      case "tontine":
        return <TontinePage onNavigate={setActiveView} />;
      case "escrow":
        return <EscrowPage onNavigate={setActiveView} />;
      case "assurance":
        return <AssurancePage onNavigate={setActiveView} />;
      case "nexus":
      default:
        return <NexusHubPage onNavigate={setActiveView} />;
    }
  }, [activeView]);

  return (
    <div className="min-h-screen bg-background text-foreground">{content}</div>
  );
}

export default App;
