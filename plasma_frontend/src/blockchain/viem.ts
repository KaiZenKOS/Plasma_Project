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

/** Vérifier si une adresse est un contrat déployé (getCode). Pour test dans la console : getContractCode("0x6208...") */
export async function getContractCode(address: string): Promise<string> {
  const code = await publicClient.getBytecode({ address: address as `0x${string}` });
  return code ?? "0x";
}

/** true si l'adresse a du bytecode (contrat déployé), false sinon. */
export async function isContractDeployed(address: string): Promise<boolean> {
  const code = await getContractCode(address);
  return code !== "0x" && code.length > 2;
}
