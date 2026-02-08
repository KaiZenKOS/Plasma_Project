import { Buffer } from "buffer";

const windowWithGlobals = window as Window & {
  global?: typeof window;
  Buffer?: typeof Buffer;
};

windowWithGlobals.global = window;
windowWithGlobals.Buffer = Buffer;

import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PrivyProvider } from "@privy-io/react-auth";
import "./index.css";
import App from "./App.tsx";
import { UserProvider } from "./context/UserContext";
import { PrivateKeyWalletProvider } from "./context/PrivateKeyWalletContext";
import { plasmaChain } from "./blockchain/viem";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingScreen } from "./components/LoadingScreen";

/**
 * Provider hierarchy (order matters for proper hook resolution):
 * 
 * 1. PrivyProvider (Auth - must be outermost for wallet context)
 *    - Provides authentication and wallet connection
 * 
 * 2. BrowserRouter (Routing - must be before components using useNavigate/useParams)
 *    - Provides routing context for React Router hooks
 *    - MUST be inside PrivyProvider to access wallet context if needed
 * 
 * 3. Custom Providers (PrivateKeyWalletProvider, UserProvider)
 *    - App-specific context providers
 * 
 * 4. App component
 *    - Main application component that uses all the above contexts
 * 
 * This order ensures:
 * - All hooks are called within the correct React context
 * - No "Invalid Hook Call" errors from duplicate React instances
 * - Proper access to routing, auth, and app state
 */

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found. Make sure index.html has a <div id='root'></div>");
}

// Check if Privy App ID is configured
const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;
if (!privyAppId) {
  console.warn("[main.tsx] VITE_PRIVY_APP_ID is not set. Privy authentication may not work.");
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <PrivyProvider
          appId={privyAppId || "placeholder-app-id"}
          config={{
            // Wallet login first to make MetaMask option prominent
            loginMethods: ["wallet", "email"],
            appearance: {
              theme: "light",
              accentColor: "#295c4f",
              logo: "/orbit.png",
              // Show wallet login first to make MetaMask option obvious
              showWalletLoginFirst: true,
              // Prioritize external wallets (MetaMask first)
              walletList: ["metamask", "detected_wallets"],
            },
            // Only create embedded wallet for users without a wallet (email/phone flow)
            embeddedWallets: {
              createOnLogin: "users-without-wallets",
            },
            supportedChains: [plasmaChain],
            defaultChain: plasmaChain,
          }}
        >
          <BrowserRouter>
            <PrivateKeyWalletProvider>
              <UserProvider>
                <App />
              </UserProvider>
            </PrivateKeyWalletProvider>
          </BrowserRouter>
        </PrivyProvider>
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
);
