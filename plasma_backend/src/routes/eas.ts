/**
 * Escrow as a Service (EaS) - API simple : créer un escrow, déposer USDT, libérer vers le bénéficiaire.
 */
import { Router, Request, Response } from "express";
import { createPublicClient, createWalletClient, http, type Chain } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { config } from "../config.js";
import { query } from "../db/client.js";

export const easRouter = Router();

const USDT_DECIMALS = 6;

const plasmaChain: Chain = {
  id: config.blockchain.chainId,
  name: "Plasma",
  nativeCurrency: { name: "XPL", symbol: "XPL", decimals: 18 },
  rpcUrls: { default: { http: [config.blockchain.rpcUrl] } },
};

function getChainClient() {
  return createPublicClient({
    chain: plasmaChain,
    transport: http(config.blockchain.rpcUrl),
  });
}

const ERC20_ABI = [
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transfer", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
] as const;

/**
 * POST /api/eas/escrows
 * Créer un escrow : déposant, bénéficiaire, montant USDT. Retourne l'adresse de dépôt.
 */
easRouter.post("/escrows", async (req: Request, res: Response) => {
  const body = req.body as { depositor_wallet?: string; beneficiary_address?: string; amount_usdt?: number; description?: string };
  const depositor = typeof body.depositor_wallet === "string" ? body.depositor_wallet.trim().toLowerCase() : "";
  const beneficiary = typeof body.beneficiary_address === "string" ? body.beneficiary_address.trim().toLowerCase() : "";
  const amount_usdt = Number(body.amount_usdt);
  const description = typeof body.description === "string" ? body.description.trim() || null : null;

  if (!/^0x[a-fA-F0-9]{40}$/.test(depositor) || !/^0x[a-fA-F0-9]{40}$/.test(beneficiary)) {
    return res.status(400).json({ error: "depositor_wallet et beneficiary_address requis (0x...)" });
  }
  if (!Number.isFinite(amount_usdt) || amount_usdt <= 0) {
    return res.status(400).json({ error: "amount_usdt requis et > 0" });
  }

  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  try {
    const result = await query(
      `INSERT INTO eas_escrows (deposit_wallet_address, deposit_wallet_private_key, depositor_address, beneficiary_address, amount_usdt, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'LOCKED')
       RETURNING id, deposit_wallet_address, depositor_address, beneficiary_address, amount_usdt, description, status, created_at`,
      [account.address.toLowerCase(), privateKey, depositor, beneficiary, amount_usdt, description]
    );
    const row = result.rows[0] as Record<string, unknown>;
    const { deposit_wallet_private_key: _pk, ...safe } = row;
    console.log("[EaS] Escrow created", row.id, "depositor=", depositor, "beneficiary=", beneficiary);
    return res.status(201).json(safe);
  } catch (e) {
    console.error("[EaS] create error:", e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Failed to create escrow" });
  }
});

/**
 * GET /api/eas/escrows?wallet=0x...
 * Liste des escrows où le wallet est déposant ou bénéficiaire (sans exposer la clé privée).
 */
easRouter.get("/escrows", async (req: Request, res: Response) => {
  const wallet = typeof req.query.wallet === "string" ? req.query.wallet.trim().toLowerCase() : null;
  if (!wallet || !/^0x[a-fa-f0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: "Query wallet=0x... required" });
  }
  const result = await query(
    `SELECT id, deposit_wallet_address, depositor_address, beneficiary_address, amount_usdt, description, status, created_at, released_at, release_tx_hash
     FROM eas_escrows
     WHERE depositor_address = $1 OR beneficiary_address = $1
     ORDER BY created_at DESC`,
    [wallet]
  );
  return res.json(result.rows);
});

/**
 * GET /api/eas/escrows/:id
 * Détail d'un escrow + solde USDT du wallet de dépôt.
 */
easRouter.get("/escrows/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await query(
    `SELECT id, deposit_wallet_address, depositor_address, beneficiary_address, amount_usdt, description, status, created_at, released_at, release_tx_hash
     FROM eas_escrows WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Escrow not found" });
  const row = result.rows[0] as { deposit_wallet_address: string; status: string };
  let balanceFormatted = "0";
  if (row.status === "LOCKED" && row.deposit_wallet_address && config.blockchain.usdtAddress) {
    try {
      const publicClient = getChainClient();
      const balance = await publicClient.readContract({
        address: config.blockchain.usdtAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [row.deposit_wallet_address as `0x${string}`],
      });
      balanceFormatted = (Number(balance) / 10 ** USDT_DECIMALS).toFixed(2);
    } catch {
      // ignore
    }
  }
  return res.json({ ...result.rows[0], balanceFormatted });
});

/**
 * POST /api/eas/escrows/:id/release
 * Libère les USDT du wallet de dépôt vers le bénéficiaire.
 */
easRouter.post("/escrows/:id/release", async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await query(
    "SELECT id, deposit_wallet_address, deposit_wallet_private_key, beneficiary_address, status FROM eas_escrows WHERE id = $1",
    [id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Escrow not found" });
  const row = result.rows[0] as { deposit_wallet_address: string; deposit_wallet_private_key: string; beneficiary_address: string; status: string };
  if (row.status !== "LOCKED") {
    return res.status(400).json({ error: "Escrow already released.", code: "ALREADY_RELEASED" });
  }
  if (!row.deposit_wallet_private_key || !config.blockchain.usdtAddress) {
    return res.status(500).json({ error: "Escrow or USDT config missing" });
  }

  const publicClient = getChainClient();
  let balance: bigint;
  try {
    balance = await publicClient.readContract({
      address: config.blockchain.usdtAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [row.deposit_wallet_address as `0x${string}`],
    });
  } catch (e) {
    console.error("[EaS] balanceOf failed for", row.deposit_wallet_address, e);
    return res.status(502).json({ error: "Could not read balance (RPC or USDT contract).", code: "BALANCE_READ_FAILED" });
  }

  if (balance <= 0n) {
    return res.status(400).json({ error: "No USDT in deposit wallet. Send USDT to the escrow deposit address first.", code: "NO_BALANCE" });
  }

  const walletClient = createWalletClient({
    chain: plasmaChain,
    transport: http(config.blockchain.rpcUrl),
    account: privateKeyToAccount(row.deposit_wallet_private_key as `0x${string}`),
  });
  try {
    const hash = await walletClient.writeContract({
      address: config.blockchain.usdtAddress,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [row.beneficiary_address as `0x${string}`, balance],
      account: walletClient.account!,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    await query(
      "UPDATE eas_escrows SET status = 'RELEASED', released_at = NOW(), release_tx_hash = $1 WHERE id = $2",
      [hash, id]
    );
    console.log("[EaS] Released", id, "to", row.beneficiary_address, "tx", hash);
    return res.json({ released: true, tx_hash: hash, block_number: Number(receipt.blockNumber) });
  } catch (e) {
    console.error("[EaS] release error:", e);
    return res.status(502).json({ error: "Release failed. Check RPC and gas." });
  }
});
