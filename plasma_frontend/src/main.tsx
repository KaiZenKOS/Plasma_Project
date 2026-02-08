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
import { PrivateKeyWalletProvider } from "./context/PrivateKeyWalletContext";
import { plasmaChain } from "./blockchain/viem";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID}
      config={{
        // Wallet login first to make MetaMask option prominent
        loginMethods: ["wallet", "email"],
        appearance: {
          theme: "light",
          accentColor: "#295c4f",
          logo: "/vite.svg",
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
      <PrivateKeyWalletProvider>
        <UserProvider>
          <App />
        </UserProvider>
      </PrivateKeyWalletProvider>
    </PrivyProvider>
  </StrictMode>,
);
