import { Router, Request, Response } from "express";
import { query } from "../db/client.js";

export const publicRouter = Router();

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
