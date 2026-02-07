import { Router, Request, Response } from "express";
import { query } from "../db/client.js";

export const coreRouter = Router();

/**
 * GET /api/core/user/:address
 * Profil utilisateur (wallet = identifiant).
 */
coreRouter.get("/user/:address", async (req: Request, res: Response) => {
  const address = (req.params.address ?? "").toLowerCase();
  if (!address || address.length !== 42) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }
  const result = await query(
    "SELECT wallet_address, pseudo, reputation_score, kyc_validated, created_at, updated_at FROM users WHERE wallet_address = $1",
    [address]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(result.rows[0]);
});

/**
 * GET /api/core/user/:address/score
 * Score calculé depuis l'historique BDD (déterministe, pas d'IA).
 */
coreRouter.get("/user/:address/score", async (req: Request, res: Response) => {
  const address = (req.params.address ?? "").toLowerCase();
  if (!address || address.length !== 42) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }
  const userResult = await query(
    "SELECT reputation_score FROM users WHERE wallet_address = $1",
    [address]
  );
  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: "User not found", score: null });
  }
  res.json({ address, score: userResult.rows[0].reputation_score });
});

/**
 * PUT /api/core/user/:address
 * Création ou mise à jour (pseudo, etc.). Upsert par wallet_address.
 */
coreRouter.put("/user/:address", async (req: Request, res: Response) => {
  const address = (req.params.address ?? "").toLowerCase();
  const { pseudo, kyc_validated } = req.body ?? {};
  if (!address || address.length !== 42) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }
  await query(
    `INSERT INTO users (wallet_address, pseudo, reputation_score, kyc_validated)
     VALUES ($1, $2, 100, COALESCE($3, FALSE))
     ON CONFLICT (wallet_address)
     DO UPDATE SET pseudo = COALESCE(EXCLUDED.pseudo, users.pseudo), kyc_validated = COALESCE(EXCLUDED.kyc_validated, users.kyc_validated)`,
    [address, pseudo ?? null, kyc_validated]
  );
  const result = await query("SELECT * FROM users WHERE wallet_address = $1", [address]);
  res.json(result.rows[0]);
});
