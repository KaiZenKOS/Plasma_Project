import { Router, Request, Response } from "express";
import * as cheerio from "cheerio";
import { createPublicClient, http, parseAbiItem } from "viem";
import { config } from "../config.js";
import { pool, query } from "../db/client.js";

const EXPLORER_BASE =
  (typeof process.env.PLASMA_EXPLORER_URL === "string" && process.env.PLASMA_EXPLORER_URL) ||
  "https://testnet.plasmascan.to";

export const publicRouter = Router();

const TONTINE_EVENTS = [
  parseAbiItem("event TontineCreated(uint256 indexed tontineId, uint256 contributionAmount, uint256 frequencySeconds, uint256 collateralAmount)"),
  parseAbiItem("event MemberJoined(uint256 indexed tontineId, address indexed member, uint256 turnPosition)"),
  parseAbiItem("event ContributionPaid(uint256 indexed tontineId, address indexed member, uint256 amount, uint256 turnIndex)"),
  parseAbiItem("event CollateralSlashed(uint256 indexed tontineId, address indexed member, uint256 amount)"),
] as const;

function getChain() {
  const { rpcUrl, chainId } = config.blockchain;
  return {
    id: chainId,
    name: "Plasma",
    nativeCurrency: { name: "XPL", symbol: "XPL", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  } as const;
}

function resolveAddress(req: Request): string {
  const paramAddress = (req.params.address ?? "").toLowerCase();
  const queryAddress = (req.query.address ?? "").toString().toLowerCase();
  return paramAddress || queryAddress;
}

type ScrapedTx = {
  hash: string;
  blockNumber?: string;
  method?: string;
  from?: string;
  to?: string;
  value?: string;
  valueSymbol?: string;
  time?: string;
  age?: string;
  explorerUrl: string;
};

async function scrapeAddressTransactions(address: string): Promise<ScrapedTx[]> {
  const url = `${EXPLORER_BASE}/address/${address}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; PlasmaApp/1.0; +https://github.com/plasma)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) return [];
  const html = await res.text();
  const $ = cheerio.load(html);
  const txs: ScrapedTx[] = [];
  const seen = new Set<string>();

  // Find all links to transaction pages to get hashes
  $('a[href*="/tx/0x"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const m = href.match(/\/tx\/(0x[a-fA-F0-9]{64})/);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]);
      txs.push({
        hash: m[1],
        explorerUrl: `${EXPLORER_BASE}/tx/${m[1]}`,
      });
    }
  });

  // If we have a table, try to enrich rows: find table with transaction rows
  const tableRows = $('table tbody tr').toArray();
  if (tableRows.length > 0 && txs.length > 0) {
    tableRows.forEach((tr, i) => {
      const cells = $(tr).find("td").toArray();
      const linkCell = $(tr).find('a[href*="/tx/0x"]').first();
      const hashMatch = (linkCell.attr("href") ?? "").match(/\/tx\/(0x[a-fA-F0-9]{64})/);
      const hash = hashMatch ? hashMatch[1] : null;
      if (!hash) return;
      const tx = txs.find((t) => t.hash === hash) ?? { hash, explorerUrl: `${EXPLORER_BASE}/tx/${hash}` };
      const idx = txs.findIndex((t) => t.hash === hash);
      const texts = cells.map((c) => $(c).text().trim());
      if (texts.length >= 2) tx.blockNumber = texts[1];
      if (texts.length >= 3) tx.method = texts[2];
      if (texts.length >= 4) tx.time = texts[3];
      if (texts.length >= 5) tx.age = texts[4];
      if (texts.length >= 6) tx.from = texts[5];
      if (texts.length >= 7) tx.to = texts[6];
      if (texts.length >= 8) {
        const val = texts[7];
        if (val.includes("XPL")) {
          tx.value = val.replace(/\s*XPL.*/, "").trim();
          tx.valueSymbol = "XPL";
        } else if (val.includes("USDT")) {
          tx.value = val.replace(/\s*USDT.*/, "").trim();
          tx.valueSymbol = "USDT";
        } else {
          tx.value = val;
        }
      }
      if (idx >= 0) txs[idx] = { ...txs[idx], ...tx };
      else txs.push(tx);
    });
  }

  // Fallback: regex on raw HTML for /tx/0x... hashes if cheerio found nothing
  if (txs.length === 0) {
    const hashRegex = /\/tx\/(0x[a-fA-F0-9]{64})/g;
    let match: RegExpExecArray | null;
    while ((match = hashRegex.exec(html)) !== null) {
      if (!seen.has(match[1])) {
        seen.add(match[1]);
        txs.push({
          hash: match[1],
          explorerUrl: `${EXPLORER_BASE}/tx/${match[1]}`,
        });
      }
    }
  }

  // Dedupe by hash (first occurrence wins)
  const byHash = new Map<string, ScrapedTx>();
  for (const tx of txs) {
    if (!byHash.has(tx.hash)) byHash.set(tx.hash, tx);
  }
  return Array.from(byHash.values());
}

function normalizeAddress(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  const hex = s.startsWith("0x") ? s.slice(2) : s;
  if (/^[a-fA-F0-9]{40}$/.test(hex)) return "0x" + hex.toLowerCase();
  return null;
}

/**
 * GET /api/explorer/txlist
 * Query: address (required). Returns transactions scraped from Plasmascan address page.
 */
publicRouter.get("/explorer/txlist", async (req: Request, res: Response) => {
  const raw = req.query.address;
  const address = normalizeAddress(Array.isArray(raw) ? raw[0] : raw);
  if (!address) {
    return res.status(400).json({ error: "Invalid or missing address" });
  }
  try {
    const list = await scrapeAddressTransactions(address);
    res.json({ address, transactions: list });
  } catch (e) {
    console.error("Explorer scrape error:", e);
    res.status(502).json({
      error: "Could not fetch transaction list from explorer",
    });
  }
});

/**
 * GET /api/user/profile
 * GET /api/user/profile/:address
 * Profil utilisateur (RGPD off-chain).
 */
publicRouter.get(
  "/user/profile/:address?",
  async (req: Request, res: Response) => {
    const address = resolveAddress(req);
    if (!address || address.length !== 42) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }
    const result = await query(
      "SELECT wallet_address, pseudo, reputation_score, kyc_validated, created_at, updated_at FROM users WHERE wallet_address = $1",
      [address],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  },
);

/**
 * GET /api/history
 * Historique des transactions (cache SQL).
 */
publicRouter.get("/history", async (req: Request, res: Response) => {
  const address = (req.query.address ?? "").toString().toLowerCase();
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  if (address && address.length !== 42) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  if (address) {
    const result = await query(
      "SELECT tx_hash, block_number, method_name, from_address, to_address, payload, created_at FROM blockchain_events WHERE from_address = $1 OR to_address = $1 ORDER BY block_number DESC, id DESC LIMIT $2",
      [address, limit],
    );
    return res.json(result.rows);
  }

  const result = await query(
    "SELECT tx_hash, block_number, method_name, from_address, to_address, payload, created_at FROM blockchain_events ORDER BY block_number DESC, id DESC LIMIT $1",
    [limit],
  );
  return res.json(result.rows);
});

/**
 * GET /api/history/backfill
 * Récupère les événements tontine passés depuis la chaîne et les enregistre en base.
 * Query: address (optionnel, filtre par wallet)
 */
publicRouter.get("/history/backfill", async (req: Request, res: Response) => {
  const { tontineServiceAddress, rpcUrl, fromBlock: configFromBlock } = config.blockchain;
  const addr = (tontineServiceAddress ?? "").toString();
  if (!addr || addr.length !== 42 || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    return res.status(503).json({
      error: "TONTINE_SERVICE_ADDRESS not set or invalid. Set a valid 0x... address in backend .env",
    });
  }
  const wallet = (req.query.address ?? "").toString().toLowerCase();
  if (wallet && wallet.length !== 42) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  const client = createPublicClient({
    chain: getChain(),
    transport: http(rpcUrl),
  });

  let logs: Array<{ transactionHash?: `0x${string}`; blockNumber?: bigint; eventName: string; args?: unknown }>;
  try {
    const currentBlock = await client.getBlockNumber();
    // RPC Plasma testnet limite eth_getLogs à 10 000 blocs — utiliser une fenêtre courte par défaut
    const RPC_MAX_BLOCK_RANGE = 10_000;
    const defaultLookback = 2_000;
    const fromBlockConfig = Number(configFromBlock);
    const fromBlock = BigInt(Math.max(0, fromBlockConfig));
    const toBlock = currentBlock;
    const range = Number(toBlock - fromBlock);
    const effectiveFrom =
      range > RPC_MAX_BLOCK_RANGE || (fromBlockConfig === 0 && range > defaultLookback)
        ? toBlock - BigInt(Math.min(RPC_MAX_BLOCK_RANGE, defaultLookback))
        : fromBlock;

    const eventNames = ["TontineCreated", "MemberJoined", "ContributionPaid", "CollateralSlashed"] as const;
    const logArrays = await Promise.all(
      TONTINE_EVENTS.map((event, i) =>
        client.getLogs({
          address: tontineServiceAddress as `0x${string}`,
          event,
          fromBlock: effectiveFrom,
          toBlock,
        }).then((arr) => arr.map((log) => ({ ...log, eventName: eventNames[i] }))),
      ),
    );
    logs = logArrays.flat().sort((a, b) => Number((a.blockNumber ?? 0n) - (b.blockNumber ?? 0n)));
  } catch (e) {
    console.error("History backfill getLogs failed:", e);
    return res.status(502).json({
      error: "RPC error (e.g. block range too large). Try again or set FROM_BLOCK in .env.",
    });
  }

  const contractLower = tontineServiceAddress.toLowerCase();
  let inserted = 0;
  for (const log of logs) {
    let fromAddress: string;
    const methodName = log.eventName ?? "Unknown";
    if (methodName === "TontineCreated") {
      try {
        const tx = await client.getTransaction({ hash: log.transactionHash! });
        fromAddress = (tx?.from ?? "").toLowerCase();
      } catch {
        continue;
      }
    } else if (methodName === "MemberJoined" || methodName === "ContributionPaid" || methodName === "CollateralSlashed") {
      const member = (log.args as { member?: string }).member;
      fromAddress = (member ?? "").toLowerCase();
    } else {
      continue;
    }
    if (wallet && fromAddress !== wallet) continue;
    const existing = await query(
      "SELECT 1 FROM blockchain_events WHERE tx_hash = $1 AND block_number = $2 AND method_name = $3 LIMIT 1",
      [log.transactionHash, Number(log.blockNumber), methodName],
    );
    if (existing.rows.length > 0) continue;
    // Serialize BigInt values in log.args before JSON.stringify
    let serializedArgs: string | null = null;
    if (log.args) {
      try {
        serializedArgs = JSON.stringify(log.args, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        );
      } catch (e) {
        console.error("Failed to serialize log.args:", e);
        serializedArgs = null;
      }
    }

    await query(
      `INSERT INTO blockchain_events (tx_hash, block_number, method_name, from_address, to_address, payload)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        log.transactionHash,
        Number(log.blockNumber),
        methodName,
        fromAddress,
        contractLower,
        serializedArgs,
      ],
    );
    inserted++;

    // Pour TontineCreated: créer tontine_groups + tontine_members si pas déjà en base (pour afficher la tontine dans la liste)
    if (methodName === "TontineCreated" && log.args) {
      const args = log.args as { tontineId?: bigint; contributionAmount?: bigint; frequencySeconds?: bigint; collateralAmount?: bigint };
      const contractTontineId = args.tontineId != null ? Number(args.tontineId) : null;
      if (contractTontineId != null) {
        const existingGroup = await query(
          "SELECT id FROM tontine_groups WHERE contract_tontine_id = $1 AND LOWER(smart_contract_address) = $2 LIMIT 1",
          [contractTontineId, contractLower],
        );
        if (existingGroup.rows.length === 0) {
          const client = await pool.connect();
          try {
            await client.query("BEGIN");
            await client.query(
              "INSERT INTO users (wallet_address, reputation_score) VALUES ($1, 100) ON CONFLICT (wallet_address) DO NOTHING",
              [fromAddress],
            );
            const contributionStr = args.contributionAmount != null ? String(args.contributionAmount) : "0";
            const collateralStr = args.collateralAmount != null ? String(args.collateralAmount) : "0";
            const frequencySeconds = args.frequencySeconds != null ? Number(args.frequencySeconds) : 0;
            const groupResult = await client.query(
              `INSERT INTO tontine_groups (name, type, payout_details, frequency_seconds, contribution_amount, collateral_amount, status, contract_tontine_id, smart_contract_address)
               VALUES (NULL, 'STANDARD', NULL, $1, $2, $3, 'active', $4, $5)
               RETURNING id`,
              [frequencySeconds, contributionStr, collateralStr, contractTontineId, contractLower],
            );
            const groupId = (groupResult.rows[0] as { id: string }).id;
            await client.query(
              "INSERT INTO tontine_members (tontine_group_id, wallet_address, turn_position, collateral_status) VALUES ($1, $2, 0, 'ok')",
              [groupId, fromAddress],
            );
            await client.query("COMMIT");
          } catch (e) {
            await client.query("ROLLBACK").catch(() => {});
            console.error("Backfill: failed to create tontine group from TontineCreated", e);
          } finally {
            client.release();
          }
        }
      }
    }
  }
  return res.json({ ok: true, inserted, total: logs.length });
});
