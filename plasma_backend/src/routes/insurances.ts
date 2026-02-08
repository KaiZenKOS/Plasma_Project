import { Router, Request, Response } from "express";
import fs from "fs/promises";
import path from "path";

export const insurancesRouter = Router();

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "insurances.json");

export type InsurancePolicyRecord = {
  walletAddress: string;
  policyId: number;
  tontineId: number;
  coverageAmount: string;
  premiumPaid: string;
  active: boolean;
  purchasedAt: number;
  txHash?: string;
};

type InsurancesData = {
  policies: InsurancePolicyRecord[];
};

async function readData(): Promise<InsurancesData> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf-8");
    const data = JSON.parse(raw) as InsurancesData;
    return Array.isArray(data.policies) ? data : { policies: [] };
  } catch (err) {
    return { policies: [] };
  }
}

async function writeData(data: InsurancesData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * GET /api/insurances?address=0x...
 * List policies, optionally filtered by wallet address.
 */
insurancesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const data = await readData();
    const address = (req.query.address ?? "").toString().toLowerCase();
    let list = data.policies;
    if (address) {
      list = list.filter((p) => p.walletAddress.toLowerCase() === address);
    }
    res.json({ policies: list });
  } catch (err) {
    console.error("GET /api/insurances:", err);
    res.status(500).json({ error: "Failed to load insurances" });
  }
});

/**
 * POST /api/insurances
 * Body: { walletAddress, policyId, tontineId, coverageAmount, premiumPaid, active, purchasedAt, txHash? }
 * Register a new insurance policy.
 */
insurancesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<InsurancePolicyRecord>;
    const walletAddress = (body.walletAddress ?? "").toString().trim();
    const policyId = Number(body.policyId);
    const tontineId = Number(body.tontineId);
    const coverageAmount = String(body.coverageAmount ?? "0");
    const premiumPaid = String(body.premiumPaid ?? "0");
    const active = Boolean(body.active);
    const purchasedAt = Number(body.purchasedAt) || Math.floor(Date.now() / 1000);
    const txHash = body.txHash ? String(body.txHash).trim() : undefined;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      res.status(400).json({ error: "Invalid walletAddress" });
      return;
    }
    if (!Number.isFinite(policyId) || policyId < 0) {
      res.status(400).json({ error: "Invalid policyId" });
      return;
    }

    const data = await readData();
    const record: InsurancePolicyRecord = {
      walletAddress: walletAddress.toLowerCase(),
      policyId,
      tontineId,
      coverageAmount,
      premiumPaid,
      active,
      purchasedAt,
      txHash,
    };
    data.policies.push(record);
    await writeData(data);
    res.status(201).json(record);
  } catch (err) {
    console.error("POST /api/insurances:", err);
    res.status(500).json({ error: "Failed to register insurance" });
  }
});
