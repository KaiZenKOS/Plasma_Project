import { Router, Request, Response } from "express";
import { query } from "../db/client.js";

export const tontineRouter = Router();

/**
 * GET /api/tontine/groups
 * Liste des groupes tontine (config BDD).
 */
tontineRouter.get("/groups", async (_req: Request, res: Response) => {
  const result = await query(
    "SELECT id, name, frequency_seconds, contribution_amount, collateral_amount, status, contract_tontine_id, smart_contract_address, created_at FROM tontine_groups ORDER BY created_at DESC"
  );
  res.json(result.rows);
});

/**
 * GET /api/tontine/groups/:id
 * Détail d'un groupe + membres.
 */
tontineRouter.get("/groups/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const groupResult = await query(
    "SELECT * FROM tontine_groups WHERE id = $1",
    [id]
  );
  if (groupResult.rows.length === 0) {
    return res.status(404).json({ error: "Group not found" });
  }
  const membersResult = await query(
    "SELECT wallet_address, turn_position, collateral_status, joined_at FROM tontine_members WHERE tontine_group_id = $1 ORDER BY turn_position",
    [id]
  );
  res.json({ ...groupResult.rows[0], members: membersResult.rows });
});

/**
 * GET /api/tontine/events
 * Derniers événements blockchain (cache local).
 */
tontineRouter.get("/events", async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const result = await query(
    "SELECT tx_hash, block_number, method_name, from_address, to_address, payload, created_at FROM blockchain_events ORDER BY block_number DESC, id DESC LIMIT $1",
    [limit]
  );
  res.json(result.rows);
});
