import { createPublicClient, defineChain, http } from "viem";

const rpcUrl =
  typeof import.meta.env.VITE_PLASMA_RPC_URL === "string" &&
  import.meta.env.VITE_PLASMA_RPC_URL
    ? import.meta.env.VITE_PLASMA_RPC_URL
    : "";

const chainId = Number(import.meta.env.VITE_PLASMA_CHAIN_ID ?? 0) || 0;

const chainName =
  typeof import.meta.env.VITE_PLASMA_CHAIN_NAME === "string" &&
  import.meta.env.VITE_PLASMA_CHAIN_NAME
    ? import.meta.env.VITE_PLASMA_CHAIN_NAME
    : "Plasma";

const explorerUrl =
  typeof import.meta.env.VITE_PLASMA_EXPLORER_URL === "string" &&
  import.meta.env.VITE_PLASMA_EXPLORER_URL
    ? import.meta.env.VITE_PLASMA_EXPLORER_URL
    : "https://explorer.plasma.chain";

export const plasmaChain = defineChain({
  id: chainId,
  name: chainName,
  network: chainName.toLowerCase().replace(/\s+/g, "-"),
  nativeCurrency: {
    name: "Plasma",
    symbol: "XPL",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: rpcUrl ? [rpcUrl] : [] },
  },
  blockExplorers: {
    default: { name: "Plasma Explorer", url: explorerUrl },
  },
});

export const publicClient = createPublicClient({
  chain: plasmaChain,
  transport: http(rpcUrl),
});
