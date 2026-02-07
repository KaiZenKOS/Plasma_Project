import { useMemo, useState } from "react";
import type { ViewKey } from "./types/navigation";
import { TontineFeatureView } from "./features/tontine";
import { AssurancePage } from "./pages/AssurancePage";
import { EscrowPage } from "./pages/EscrowPage";
import { NexusHubPage } from "./pages/NexusHubPage";

function App() {
  const [activeView, setActiveView] = useState<ViewKey>("nexus");

  const content = useMemo(() => {
    switch (activeView) {
      case "tontine":
        return <TontineFeatureView onNavigate={setActiveView} />;
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
