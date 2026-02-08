import { Router, Request, Response } from "express";
import { createPublicClient, http, parseAbiItem } from "viem";
import { config } from "../config.js";
import { pool, query } from "../db/client.js";

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
