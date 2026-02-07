import { Buffer } from "buffer";

const windowWithGlobals = window as Window & {
  global?: typeof window;
  Buffer?: typeof Buffer;
};

windowWithGlobals.global = window;
windowWithGlobals.Buffer = Buffer;

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PrivyProvider } from "@privy-io/react-auth";
import "./index.css";
import App from "./App.tsx";
import { UserProvider } from "./context/UserContext";
import { plasmaChain } from "./blockchain/viem";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "light",
          accentColor: "#295c4f",
          logo: "https://ton-logo-url.com/logo.png",
          showWalletLoginFirst: false,
        },
        embeddedWallets: { createOnLogin: "users-without-wallets" },
        supportedChains: [plasmaChain],
        defaultChain: plasmaChain,
      }}
    >
      <UserProvider>
        <App />
      </UserProvider>
    </PrivyProvider>
  </StrictMode>,
);
