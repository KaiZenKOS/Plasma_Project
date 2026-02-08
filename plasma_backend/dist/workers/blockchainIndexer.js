"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Worker : écoute les événements ContributionPaid et CollateralSlashed du TontineService.
 * Met à jour blockchain_events et recalcule le score utilisateur (ScoreCalculator).
 */
const viem_1 = require("viem");
const config_js_1 = require("../config.js");
const client_js_1 = require("../db/client.js");
const ScoreCalculator_js_1 = require("../utils/ScoreCalculator.js");
const TONTINE_ABI = [
    (0, viem_1.parseAbiItem)("event TontineCreated(uint256 indexed tontineId, uint256 contributionAmount, uint256 frequencySeconds, uint256 collateralAmount)"),
    (0, viem_1.parseAbiItem)("event MemberJoined(uint256 indexed tontineId, address indexed member, uint256 turnPosition)"),
    (0, viem_1.parseAbiItem)("event ContributionPaid(uint256 indexed tontineId, address indexed member, uint256 amount, uint256 turnIndex)"),
    (0, viem_1.parseAbiItem)("event CollateralSlashed(uint256 indexed tontineId, address indexed member, uint256 amount)"),
    (0, viem_1.parseAbiItem)("event PaymentSuccessRecorded(address indexed user)"),
];
function getChain() {
    const { rpcUrl, chainId } = config_js_1.config.blockchain;
    return {
        id: chainId,
        name: chainId === 9746 ? "Plasma Testnet" : "Plasma",
        nativeCurrency: { name: "XPL", symbol: "XPL", decimals: 18 },
        rpcUrls: { default: { http: [rpcUrl] } },
    };
}
async function ensureUser(address) {
    await (0, client_js_1.query)(`INSERT INTO users (wallet_address, reputation_score)
     VALUES ($1, $2)
     ON CONFLICT (wallet_address) DO NOTHING`, [address.toLowerCase(), ScoreCalculator_js_1.INITIAL_SCORE]);
}
async function recordEvent(params) {
    await (0, client_js_1.query)(`INSERT INTO blockchain_events (tx_hash, block_number, method_name, from_address, to_address, payload)
     VALUES ($1, $2, $3, $4, $5, $6)`, [
        params.txHash,
        Number(params.blockNumber),
        params.methodName,
        params.fromAddress?.toLowerCase() ?? null,
        params.toAddress?.toLowerCase() ?? null,
        params.payload ? JSON.stringify(params.payload) : null,
    ]);
}
async function getCurrentScore(walletAddress) {
    const result = await (0, client_js_1.query)("SELECT reputation_score FROM users WHERE wallet_address = $1", [walletAddress.toLowerCase()]);
    if (result.rows.length === 0)
        return ScoreCalculator_js_1.INITIAL_SCORE;
    return result.rows[0].reputation_score;
}
async function updateUserScore(walletAddress, newScore) {
    await (0, client_js_1.query)("UPDATE users SET reputation_score = $1, updated_at = NOW() WHERE wallet_address = $2", [Math.max(0, Math.min(ScoreCalculator_js_1.MAX_SCORE, newScore)), walletAddress.toLowerCase()]);
}
async function main() {
    const { tontineServiceAddress, rpcUrl, fromBlock } = config_js_1.config.blockchain;
    if (!tontineServiceAddress) {
        console.warn("TONTINE_SERVICE_ADDRESS not set, indexer will no-op.");
        return;
    }
    const client = (0, viem_1.createPublicClient)({
        chain: getChain(),
        transport: (0, viem_1.http)(rpcUrl),
    });
    console.log("Blockchain indexer started. Watching TontineCreated, MemberJoined, ContributionPaid & CollateralSlashed.");
    client.watchContractEvent({
        address: tontineServiceAddress,
        abi: TONTINE_ABI,
        eventName: "TontineCreated",
        fromBlock,
        onLogs: async (logs) => {
            for (const log of logs) {
                const tontineId = log.args.tontineId;
                const contributionAmount = log.args.contributionAmount;
                const frequencySeconds = log.args.frequencySeconds;
                const collateralAmount = log.args.collateralAmount;
                let fromAddress = null;
                try {
                    const tx = await client.getTransaction({ hash: log.transactionHash });
                    fromAddress = tx?.from?.toLowerCase() ?? null;
                }
                catch {
                    // ignore
                }
                if (fromAddress) {
                    await ensureUser(fromAddress);
                    await recordEvent({
                        txHash: log.transactionHash ?? "",
                        blockNumber: log.blockNumber ?? 0n,
                        methodName: "TontineCreated",
                        fromAddress,
                        toAddress: tontineServiceAddress,
                        payload: {
                            tontineId: String(tontineId),
                            contributionAmount: String(contributionAmount),
                            frequencySeconds: String(frequencySeconds),
                            collateralAmount: String(collateralAmount),
                        },
                    });
                }
            }
        },
    });
    client.watchContractEvent({
        address: tontineServiceAddress,
        abi: TONTINE_ABI,
        eventName: "MemberJoined",
        fromBlock,
        onLogs: async (logs) => {
            for (const log of logs) {
                const member = log.args.member;
                const tontineId = log.args.tontineId;
                const turnPosition = log.args.turnPosition;
                if (!member)
                    continue;
                const address = member.toLowerCase();
                await ensureUser(address);
                await recordEvent({
                    txHash: log.transactionHash ?? "",
                    blockNumber: log.blockNumber ?? 0n,
                    methodName: "MemberJoined",
                    fromAddress: address,
                    toAddress: tontineServiceAddress,
                    payload: { tontineId: String(tontineId), turnPosition: String(turnPosition) },
                });
            }
        },
    });
    const unwatch = client.watchContractEvent({
        address: tontineServiceAddress,
        abi: TONTINE_ABI,
        eventName: "ContributionPaid",
        fromBlock,
        onLogs: async (logs) => {
            for (const log of logs) {
                const member = log.args.member;
                const tontineId = log.args.tontineId;
                const amount = log.args.amount;
                if (!member)
                    continue;
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
                const delta = (0, ScoreCalculator_js_1.getPaymentScoreDelta)(paidAt, dueAt);
                const current = await getCurrentScore(address);
                const next = (0, ScoreCalculator_js_1.applyDelta)(current, delta);
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
                const member = log.args.member;
                const amount = log.args.amount;
                if (!member)
                    continue;
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
                await updateUserScore(address, (0, ScoreCalculator_js_1.getScoreAfterSlash)());
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
