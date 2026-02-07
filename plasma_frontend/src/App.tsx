import { useMemo, useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { OnboardingWelcome } from "./pages/OnboardingWelcome";
import { SendMoney } from "./pages/SendMoney";

type ViewKey = "login" | "onboarding" | "dashboard" | "send";

const views: { key: ViewKey; label: string }[] = [
  { key: "login", label: "Login" },
  { key: "onboarding", label: "Onboarding" },
  { key: "dashboard", label: "Dashboard" },
  { key: "send", label: "Send Money" },
];

function App() {
  const [activeView, setActiveView] = useState<ViewKey>("login");

  const content = useMemo(() => {
    switch (activeView) {
      case "onboarding":
        return <OnboardingWelcome />;
      case "dashboard":
        return <Dashboard />;
      case "send":
        return <SendMoney />;
      case "login":
      default:
        return <Login />;
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
