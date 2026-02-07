import { useMemo, useState } from "react";
import type { ViewKey } from "./types/navigation";
import { useUser } from "./context/UserContext";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { OnboardingWelcome } from "./pages/OnboardingWelcome";
import { SendMoney } from "./pages/SendMoney";
import { TontinePage } from "./pages/TontinePage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProtectionPage } from "./pages/ProtectionPage";

const views: { key: ViewKey; label: string }[] = [
  { key: "login", label: "Login" },
  { key: "onboarding", label: "Onboarding" },
  { key: "dashboard", label: "Dashboard" },
  { key: "send", label: "Send" },
  { key: "tontine", label: "Tontine" },
  { key: "profile", label: "Profile" },
  { key: "protection", label: "Protection" },
];

function App() {
  const { walletAddress } = useUser();
  const [activeView, setActiveView] = useState<ViewKey>(walletAddress ? "dashboard" : "login");

  const content = useMemo(() => {
    switch (activeView) {
      case "onboarding":
        return <OnboardingWelcome onNext={() => setActiveView("dashboard")} />;
      case "dashboard":
        return <Dashboard onNavigate={setActiveView} />;
      case "send":
        return <SendMoney onBack={() => setActiveView("dashboard")} onTontine={() => setActiveView("tontine")} />;
      case "tontine":
        return <TontinePage onBack={() => setActiveView("dashboard")} />;
      case "profile":
        return <ProfilePage onBack={() => setActiveView("dashboard")} onLogout={() => setActiveView("login")} />;
      case "protection":
        return <ProtectionPage onBack={() => setActiveView("dashboard")} />;
      case "login":
      default:
        return <Login onSuccess={() => setActiveView("dashboard")} />;
    }
  }, [activeView]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed top-4 left-1/2 z-[999] -translate-x-1/2 rounded-full bg-card/80 px-2 py-1 backdrop-blur border border-border shadow-lg">
        <div className="flex items-center gap-2">
          {views.map((view) => (
            <button
              key={view.key}
              onClick={() => setActiveView(view.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                activeView === view.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>
      {content}
    </div>
  );
}

export default App;
