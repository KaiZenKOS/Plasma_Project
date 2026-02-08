#!/usr/bin/env node
/**
 * Lit broadcast/Deploy.s.sol/9746/run-latest.json et met à jour
 * plasma_backend/.env et plasma_frontend/.env avec les adresses déployées.
 *
 * Usage: après avoir déployé avec
 *   export PRIVATE_KEY=0x...
 *   forge script script/Deploy.s.sol --rpc-url https://testnet-rpc.plasma.to --broadcast --chain-id 9746
 * exécuter:
 *   node scripts/update-env-from-broadcast.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const broadcastPath = join(root, "broadcast/Deploy.s.sol/9746/run-latest.json");

const names = ["MockUSDT", "NexusRegistry", "TontineService", "EscrowService"];

let data;
try {
  data = JSON.parse(readFileSync(broadcastPath, "utf8"));
} catch (e) {
  console.error("Fichier broadcast introuvable ou invalide:", broadcastPath);
  console.error("Déploie d'abord avec: forge script script/Deploy.s.sol --rpc-url https://testnet-rpc.plasma.to --broadcast --chain-id 9746");
  process.exit(1);
}

const addresses = {};
for (const tx of data.transactions || []) {
  if (tx.transactionType === "CREATE" && tx.contractName && names.includes(tx.contractName)) {
    addresses[tx.contractName] = (tx.contractAddress || "").toLowerCase();
  }
}

if (!addresses.MockUSDT || !addresses.TontineService || !addresses.EscrowService) {
  console.error("Adresses manquantes dans le broadcast. Contrats trouvés:", Object.keys(addresses));
  process.exit(1);
}

console.log("Adresses lues:", addresses);

// Backend .env
const backendEnvPath = join(root, "..", "plasma_backend", ".env");
let backendEnv;
try {
  backendEnv = readFileSync(backendEnvPath, "utf8");
} catch {
  backendEnv = "";
}
const backendLines = backendEnv.split("\n");
const backendReplace = {
  TONTINE_SERVICE_ADDRESS: addresses.TontineService,
  USDT_ADDRESS: addresses.MockUSDT,
  EAS_ESCROW_SERVICE_ADDRESS: addresses.EscrowService,
};
for (const [key, value] of Object.entries(backendReplace)) {
  const re = new RegExp(`^(${key})=.*`, "m");
  if (re.test(backendLines.join("\n"))) {
    backendEnv = backendEnv.replace(re, `${key}=${value}`);
  } else {
    backendEnv = backendEnv.trimEnd() + "\n" + `${key}=${value}` + "\n";
  }
}
writeFileSync(backendEnvPath, backendEnv);
console.log("Mis à jour:", backendEnvPath);

// Frontend .env
const frontendEnvPath = join(root, "..", "plasma_frontend", ".env");
let frontendEnv = readFileSync(frontendEnvPath, "utf8");
const frontendReplace = {
  VITE_USDT_ADDRESS: addresses.MockUSDT,
  VITE_TONTINE_CONTRACT_ADDRESS: addresses.TontineService,
  VITE_NEXUS_REGISTRY_ADDRESS: addresses.NexusRegistry || "",
  VITE_EAS_ESCROW_SERVICE_ADDRESS: addresses.EscrowService,
};
for (const [key, value] of Object.entries(frontendReplace)) {
  const re = new RegExp(`^(${key})=.*`, "m");
  if (re.test(frontendEnv)) {
    frontendEnv = frontendEnv.replace(re, `${key}=${value}`);
  } else {
    frontendEnv = frontendEnv.trimEnd() + "\n" + `${key}=${value}` + "\n";
  }
}
// Aligner VITE_ESCROW_CONTRACT_ADDRESS sur EAS si présent
if (frontendReplace.VITE_EAS_ESCROW_SERVICE_ADDRESS) {
  frontendEnv = frontendEnv.replace(/^VITE_ESCROW_CONTRACT_ADDRESS=.*/m, `VITE_ESCROW_CONTRACT_ADDRESS=${frontendReplace.VITE_EAS_ESCROW_SERVICE_ADDRESS}`);
}
writeFileSync(frontendEnvPath, frontendEnv);
console.log("Mis à jour:", frontendEnvPath);
console.log("Terminé. Redémarre backend et frontend pour prendre en compte les .env.");
