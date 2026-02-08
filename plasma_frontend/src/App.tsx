import { useMemo, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import type { ViewKey } from "./types/navigation";
import { PlasmaNetworkBanner } from "./components/PlasmaNetworkBanner";
import { TontineFeatureView, TontineToastProvider } from "./features/tontine";
import { AssurancePage } from "./pages/AssurancePage";
import { EscrowPage } from "./pages/EscrowPage";
import { NexusHubPage } from "./pages/NexusHubPage";
import { SendPage } from "./pages/SendPage";
import { TontineJoinPage } from "./pages/TontineJoinPage";
import { EscrowReleasePage } from "./pages/EscrowReleasePage";
import { TontineDetailsPage } from "./pages/TontineDetailsPage";

function AppContent() {
  const [activeView, setActiveView] = useState<ViewKey>("nexus");

  const content = useMemo(() => {
    switch (activeView) {
      case "tontine":
        return <TontineFeatureView onNavigate={setActiveView} />;
      case "escrow":
        return <EscrowPage onNavigate={setActiveView} />;
      case "assurance":
        return <AssurancePage onNavigate={setActiveView} />;
      case "send":
        return <SendPage onNavigate={setActiveView} />;
      case "nexus":
      default:
        return <NexusHubPage onNavigate={setActiveView} />;
    }
  }, [activeView]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PlasmaNetworkBanner />
      {content}
    </div>
  );
}

// BrowserRouter is now in main.tsx to ensure proper provider hierarchy
function App() {
  return (
      <TontineToastProvider>
      <Routes>
        {/* QR Code Landing Pages */}
        <Route path="/tontine/join/:id" element={<TontineJoinPage />} />
        <Route path="/escrow/release/:id" element={<EscrowReleasePage />} />
        
        {/* Tontine Details Page (Blockchain-only) */}
        <Route path="/tontine/:id" element={<TontineDetailsPage />} />
        
        {/* Main App Routes */}
        <Route path="/*" element={<AppContent />} />
        
        {/* Fallback */}
        <Route path="/" element={<Navigate to="/nexus" replace />} />
      </Routes>
      </TontineToastProvider>
  );
}

export default App;
