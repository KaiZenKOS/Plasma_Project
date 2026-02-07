/**
 * Worker : écoute les événements ContributionPaid et CollateralSlashed du TontineService.
 * Met à jour blockchain_events et recalcule le score utilisateur (ScoreCalculator).
 */
import { createPublicClient, http, parseAbiItem } from "viem";
import { config } from "../config.js";
import { query } from "../db/client.js";
import {
  getPaymentScoreDelta,
  applyDelta,
  getScoreAfterSlash,
  INITIAL_SCORE,
  MAX_SCORE,
} from "../utils/ScoreCalculator.js";

const TONTINE_ABI = [
  parseAbiItem("event ContributionPaid(uint256 indexed tontineId, address indexed member, uint256 amount, uint256 turnIndex)"),
  parseAbiItem("event CollateralSlashed(uint256 indexed tontineId, address indexed member, uint256 amount)"),
  parseAbiItem("event PaymentSuccessRecorded(address indexed user)"),
];

function getChain() {
  // Plasma / custom chain - adapter si besoin
  return {
    id: 0,
    name: "Plasma",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [config.blockchain.rpcUrl] } },
  } as const;
}

async function ensureUser(address: string) {
  await query(
    `INSERT INTO users (wallet_address, reputation_score)
     VALUES ($1, $2)
     ON CONFLICT (wallet_address) DO NOTHING`,
    [address.toLowerCase(), INITIAL_SCORE]
  );
}

async function recordEvent(params: {
  txHash: string;
  blockNumber: bigint;
  methodName: string;
  fromAddress: string;
  toAddress: string;
  payload?: object;
}) {
  await query(
    `INSERT INTO blockchain_events (tx_hash, block_number, method_name, from_address, to_address, payload)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      params.txHash,
      Number(params.blockNumber),
      params.methodName,
      params.fromAddress?.toLowerCase() ?? null,
      params.toAddress?.toLowerCase() ?? null,
      params.payload ? JSON.stringify(params.payload) : null,
    ]
  );
}

async function getCurrentScore(walletAddress: string): Promise<number> {
  const result = await query<{ reputation_score: number }>(
    "SELECT reputation_score FROM users WHERE wallet_address = $1",
    [walletAddress.toLowerCase()]
  );
  if (result.rows.length === 0) return INITIAL_SCORE;
  return result.rows[0].reputation_score;
}

async function updateUserScore(walletAddress: string, newScore: number) {
  await query(
    "UPDATE users SET reputation_score = $1, updated_at = NOW() WHERE wallet_address = $2",
    [Math.max(0, Math.min(MAX_SCORE, newScore)), walletAddress.toLowerCase()]
  );
}

async function main() {
  const { tontineServiceAddress, rpcUrl, fromBlock } = config.blockchain;
  if (!tontineServiceAddress) {
    console.warn("TONTINE_SERVICE_ADDRESS not set, indexer will no-op.");
    return;
  }

  const client = createPublicClient({
    chain: getChain(),
    transport: http(rpcUrl),
  });

  console.log("Blockchain indexer started. Watching ContributionPaid & CollateralSlashed.");

  const unwatch = client.watchContractEvent({
    address: tontineServiceAddress,
    abi: TONTINE_ABI,
    eventName: "ContributionPaid",
    fromBlock,
    onLogs: async (logs) => {
      for (const log of logs) {
        const member = (log.args as { member?: string }).member;
        const tontineId = (log.args as { tontineId?: bigint }).tontineId;
        const amount = (log.args as { amount?: bigint }).amount;
        if (!member) continue;
        const address = member.toLowerCase();
        await ensureUser(address);
        await recordEvent({
          txHash: log.transactionHash ?? "",
          blockNumber: log.blockNumber ?? 0n,
          methodName: "ContributionPaid",
          fromAddress: address,
          toAddress: tontineServiceAddress,
          payload: { tontineId: String(tontineId), amount: String(amount) },
        });
        // Paiement à l'heure : on considère que l'event émis = à l'heure. Sinon le backend pourrait avoir une table payment_due_dates.
        const paidAt = new Date();
        const dueAt = new Date(); // simplification : même date = à l'heure => +1
        const delta = getPaymentScoreDelta(paidAt, dueAt);
        const current = await getCurrentScore(address);
        const next = applyDelta(current, delta);
        await updateUserScore(address, next);
        console.log(`ContributionPaid: ${address} score ${current} -> ${next}`);
      }
    },
  });

  client.watchContractEvent({
    address: tontineServiceAddress,
    abi: TONTINE_ABI,
    eventName: "CollateralSlashed",
    fromBlock,
    onLogs: async (logs) => {
      for (const log of logs) {
        const member = (log.args as { member?: string }).member;
        const amount = (log.args as { amount?: bigint }).amount;
        if (!member) continue;
        const address = member.toLowerCase();
        await ensureUser(address);
        await recordEvent({
          txHash: log.transactionHash ?? "",
          blockNumber: log.blockNumber ?? 0n,
          methodName: "CollateralSlashed",
          fromAddress: address,
          toAddress: tontineServiceAddress,
          payload: { amount: String(amount) },
        });
        await updateUserScore(address, getScoreAfterSlash());
        console.log(`CollateralSlashed: ${address} score -> 0`);
      }
    },
  });

  process.on("SIGINT", () => {
    unwatch();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
