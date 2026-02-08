"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tontineRouter = void 0;
const express_1 = require("express");
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const config_js_1 = require("../config.js");
const client_js_1 = require("../db/client.js");
exports.tontineRouter = (0, express_1.Router)();
const USDT_DECIMALS = 6;
const plasmaChain = {
    id: config_js_1.config.blockchain.chainId,
    name: "Plasma",
    nativeCurrency: { name: "XPL", symbol: "XPL", decimals: 18 },
    rpcUrls: { default: { http: [config_js_1.config.blockchain.rpcUrl] } },
};
function getChainClient() {
    return (0, viem_1.createPublicClient)({
        chain: plasmaChain,
        transport: (0, viem_1.http)(config_js_1.config.blockchain.rpcUrl),
    });
}
const ERC20_ABI = [
    { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transfer", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
];
/**
 * GET /api/tontine/groups
 * Liste des groupes tontine. Si ?wallet=0x... est fourni, ne retourne que les groupes dont le wallet est membre.
 */
exports.tontineRouter.get("/groups", async (req, res) => {
    const wallet = typeof req.query.wallet === "string" ? req.query.wallet.trim().toLowerCase() : null;
    if (wallet) {
        const result = await (0, client_js_1.query)(`SELECT g.id, g.name, g.type, g.payout_details, g.frequency_seconds, g.contribution_amount, g.collateral_amount, g.status, g.contract_tontine_id, g.smart_contract_address, g.created_at
       FROM tontine_groups g
       INNER JOIN tontine_members m ON m.tontine_group_id = g.id
       WHERE m.wallet_address = $1
       ORDER BY g.created_at DESC`, [wallet]);
        return res.json(result.rows);
    }
    const result = await (0, client_js_1.query)("SELECT id, name, type, payout_details, frequency_seconds, contribution_amount, collateral_amount, status, contract_tontine_id, smart_contract_address, created_at FROM tontine_groups ORDER BY created_at DESC");
    res.json(result.rows);
});
/**
 * POST /api/tontine/groups/simple
 * Crée une tontine en BDD uniquement (pas de blockchain): nom, période, montants, liste de membres.
 * Body: { name, period?: 'weekly'|'monthly', frequency_seconds?, contribution_amount_usdt, collateral_amount_usdt?, creator_wallet, members?: string[] }
 */
exports.tontineRouter.post("/groups/simple", async (req, res) => {
    const body = req.body;
    const name = typeof body.name === "string" ? body.name.trim() || null : null;
    const period = typeof body.period === "string" ? body.period.toLowerCase() : "";
    const frequency_seconds = body.frequency_seconds != null && !Number.isNaN(Number(body.frequency_seconds))
        ? Number(body.frequency_seconds)
        : period === "monthly"
            ? 30 * 24 * 60 * 60
            : 7 * 24 * 60 * 60; // default weekly
    const contribution_amount_usdt = Number(body.contribution_amount_usdt);
    const collateral_amount_usdt = body.collateral_amount_usdt != null && !Number.isNaN(Number(body.collateral_amount_usdt))
        ? Number(body.collateral_amount_usdt)
        : 0;
    const creator_wallet = typeof body.creator_wallet === "string" ? body.creator_wallet.trim() : "";
    const membersRaw = Array.isArray(body.members) ? body.members : [];
    if (!creator_wallet || !/^0x[a-fA-F0-9]{40}$/.test(creator_wallet)) {
        return res.status(400).json({ error: "creator_wallet required (0x...)" });
    }
    if (!Number.isFinite(contribution_amount_usdt) || contribution_amount_usdt <= 0) {
        return res.status(400).json({ error: "contribution_amount_usdt required and > 0" });
    }
    const creator = creator_wallet.toLowerCase();
    const contributionAmount = BigInt(Math.round(contribution_amount_usdt * 10 ** USDT_DECIMALS));
    const collateralAmount = BigInt(Math.round(collateral_amount_usdt * 10 ** USDT_DECIMALS));
    const memberSet = new Set([creator]);
    for (const m of membersRaw) {
        const addr = typeof m === "string" ? m.trim().toLowerCase() : "";
        if (/^0x[a-fA-F0-9]{40}$/.test(addr))
            memberSet.add(addr);
    }
    const membersOrdered = Array.from(memberSet);
    const client = await client_js_1.pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`INSERT INTO users (wallet_address, reputation_score) VALUES ($1, 100) ON CONFLICT (wallet_address) DO NOTHING`, [creator]);
        for (const w of membersOrdered) {
            await client.query(`INSERT INTO users (wallet_address, reputation_score) VALUES ($1, 100) ON CONFLICT (wallet_address) DO NOTHING`, [w]);
        }
        const groupResult = await client.query(`INSERT INTO tontine_groups (name, type, payout_details, frequency_seconds, contribution_amount, collateral_amount, status, contract_tontine_id, smart_contract_address)
       VALUES ($1, 'STANDARD', NULL, $2, $3, $4, 'active', NULL, NULL)
       RETURNING id, name, type, payout_details, frequency_seconds, contribution_amount, collateral_amount, status, contract_tontine_id, smart_contract_address, created_at`, [name, frequency_seconds, contributionAmount.toString(), collateralAmount.toString()]);
        const group = groupResult.rows[0];
        const privateKey = (0, accounts_1.generatePrivateKey)();
        const account = (0, accounts_1.privateKeyToAccount)(privateKey);
        await client.query("UPDATE tontine_groups SET deposit_wallet_address = $1, deposit_wallet_private_key = $2 WHERE id = $3", [account.address.toLowerCase(), privateKey, group.id]);
        for (let i = 0; i < membersOrdered.length; i++) {
            await client.query(`INSERT INTO tontine_members (tontine_group_id, wallet_address, turn_position, collateral_status)
         VALUES ($1, $2, $3, 'ok') ON CONFLICT (tontine_group_id, wallet_address) DO NOTHING`, [group.id, membersOrdered[i], i]);
        }
        await client.query("COMMIT");
        console.log("[POST /groups/simple] OK creator=%s name=%s members=%s deposit=%s", creator, name ?? "", membersOrdered.length, account.address);
        const created = groupResult.rows[0];
        return res.status(201).json({ ...created, deposit_wallet_address: account.address });
    }
    catch (e) {
        await client.query("ROLLBACK").catch(() => { });
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error("[POST /groups/simple] Error:", errMsg);
        return res.status(500).json({ error: errMsg });
    }
    finally {
        client.release();
    }
});
/**
 * POST /api/tontine/groups
 * Enregistre une nouvelle tontine en BDD après création on-chain (creator = premier membre, turn 0).
 * Body: { name?, type?, service_provider?, payout_description?, frequency_seconds, contribution_amount_usdt, collateral_amount_usdt, contract_tontine_id, smart_contract_address, creator_wallet, tx_hash?, block_number? }
 * type: 'STANDARD' | 'ESCROW_LINKED'. Si ESCROW_LINKED, service_provider requis. payout_details stocké en JSON.
 */
exports.tontineRouter.post("/groups", async (req, res) => {
    const { name, type: tontineType, service_provider, payout_description, frequency_seconds, contribution_amount_usdt, collateral_amount_usdt, contract_tontine_id, smart_contract_address, creator_wallet, tx_hash, block_number, } = req.body;
    if (frequency_seconds == null ||
        contribution_amount_usdt == null ||
        collateral_amount_usdt == null ||
        contract_tontine_id == null ||
        !smart_contract_address ||
        !creator_wallet) {
        console.warn("[POST /groups] Missing required fields");
        return res.status(400).json({
            error: "Missing required fields: frequency_seconds, contribution_amount_usdt, collateral_amount_usdt, contract_tontine_id, smart_contract_address, creator_wallet",
        });
    }
    const contributionAmount = BigInt(Math.round(Number(contribution_amount_usdt) * 10 ** USDT_DECIMALS));
    const collateralAmount = BigInt(Math.round(Number(collateral_amount_usdt) * 10 ** USDT_DECIMALS));
    const creator = creator_wallet.trim().toLowerCase();
    const contractAddress = smart_contract_address.trim().toLowerCase();
    const type = (tontineType === "ESCROW_LINKED" ? "ESCROW_LINKED" : "STANDARD");
    const payoutDetails = type === "ESCROW_LINKED" && service_provider
        ? JSON.stringify({
            serviceProvider: service_provider.trim().toLowerCase(),
            description: payout_description ?? null,
        })
        : null;
    const client = await client_js_1.pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`INSERT INTO users (wallet_address, reputation_score) VALUES ($1, 100) ON CONFLICT (wallet_address) DO NOTHING`, [creator]);
        const groupResult = await client.query(`INSERT INTO tontine_groups (name, type, payout_details, frequency_seconds, contribution_amount, collateral_amount, status, contract_tontine_id, smart_contract_address)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8)
       RETURNING id, name, type, payout_details, frequency_seconds, contribution_amount, collateral_amount, status, contract_tontine_id, smart_contract_address, created_at`, [name ?? null, type, payoutDetails, frequency_seconds, contributionAmount.toString(), collateralAmount.toString(), contract_tontine_id, contractAddress]);
        const group = groupResult.rows[0];
        await client.query(`INSERT INTO tontine_members (tontine_group_id, wallet_address, turn_position, collateral_status)
       VALUES ($1, $2, 0, 'ok')`, [group.id, creator]);
        if (tx_hash && block_number != null) {
            await client.query(`INSERT INTO blockchain_events (tx_hash, block_number, method_name, from_address, to_address, payload)
         VALUES ($1, $2, 'TontineCreated', $3, $4, $5)`, [
                tx_hash,
                block_number,
                creator,
                contractAddress,
                JSON.stringify({ contract_tontine_id, name: name ?? null }),
            ]);
        }
        await client.query("COMMIT");
        console.log("[POST /groups] OK creator=%s contract_tontine_id=%s", creator, contract_tontine_id);
        return res.status(201).json(groupResult.rows[0]);
    }
    catch (e) {
        await client.query("ROLLBACK").catch(() => { });
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error("[POST /groups] Error:", errMsg, e);
        return res.status(500).json({
            error: process.env.NODE_ENV !== "production" ? errMsg : "Failed to create tontine group",
        });
    }
    finally {
        client.release();
    }
});
/**
 * POST /api/tontine/groups/from-tx
 * Enregistre une tontine en récupérant l'id depuis la tx on-chain (quand le front n'a pas pu décoder l'event).
 * Body: { tx_hash, block_number?, creator_wallet, smart_contract_address, frequency_seconds, contribution_amount_usdt, collateral_amount_usdt, name? }
 */
exports.tontineRouter.post("/groups/from-tx", async (req, res) => {
    const body = req.body;
    const tx_hash = typeof body.tx_hash === "string" ? body.tx_hash.trim() : "";
    const creator_wallet = typeof body.creator_wallet === "string" ? body.creator_wallet.trim() : "";
    const smart_contract_address = typeof body.smart_contract_address === "string" ? body.smart_contract_address.trim() : "";
    const frequency_seconds = body.frequency_seconds != null ? Number(body.frequency_seconds) : null;
    const contribution_amount_usdt = body.contribution_amount_usdt != null ? Number(body.contribution_amount_usdt) : null;
    const collateral_amount_usdt = body.collateral_amount_usdt != null ? Number(body.collateral_amount_usdt) : null;
    const block_number = body.block_number != null ? Number(body.block_number) : undefined;
    const name = typeof body.name === "string" ? body.name : undefined;
    if (!tx_hash ||
        !creator_wallet ||
        !smart_contract_address ||
        frequency_seconds == null ||
        Number.isNaN(frequency_seconds) ||
        contribution_amount_usdt == null ||
        Number.isNaN(contribution_amount_usdt) ||
        collateral_amount_usdt == null ||
        Number.isNaN(collateral_amount_usdt)) {
        console.warn("[from-tx] Missing or invalid body:", {
            hasTxHash: !!tx_hash,
            hasCreator: !!creator_wallet,
            hasContract: !!smart_contract_address,
            frequency_seconds,
            contribution_amount_usdt,
            collateral_amount_usdt,
        });
        return res.status(400).json({
            error: "Missing required: tx_hash, creator_wallet, smart_contract_address, frequency_seconds, contribution_amount_usdt, collateral_amount_usdt",
        });
    }
    const contractAddress = smart_contract_address.toLowerCase();
    const client = getChainClient();
    let tontineId = null;
    try {
        let receipt = await client.getTransactionReceipt({ hash: tx_hash });
        if (!receipt) {
            await new Promise((r) => setTimeout(r, 2000));
            receipt = await client.getTransactionReceipt({ hash: tx_hash });
        }
        if (!receipt) {
            return res.status(400).json({ error: "Transaction not found or not yet mined. Try again in a few seconds." });
        }
        // ABI event TontineService.sol (Plasma Testnet) — pas Foundry/Anvil
        const TONTINE_CREATED_4 = (0, viem_1.parseAbiItem)("event TontineCreated(uint256 indexed tontineId, uint256 contributionAmount, uint256 frequencySeconds, uint256 collateralAmount)");
        const TONTINE_CREATED_5 = (0, viem_1.parseAbiItem)("event TontineCreated(uint256 indexed tontineId, uint256 contributionAmount, uint256 frequencySeconds, uint256 collateralAmount, address serviceProvider)");
        const logs = receipt.logs ?? [];
        const blockNum = receipt.blockNumber ?? (block_number != null ? BigInt(block_number) : null);
        const txHashHex = tx_hash;
        if (logs.length > 0) {
            for (const log of logs) {
                try {
                    const decoded = (0, viem_1.decodeEventLog)({
                        abi: [TONTINE_CREATED_4],
                        data: log.data,
                        topics: log.topics,
                    });
                    if (decoded.eventName === "TontineCreated" && decoded.args?.tontineId != null) {
                        tontineId = Number(decoded.args.tontineId);
                        break;
                    }
                }
                catch {
                    try {
                        const decoded = (0, viem_1.decodeEventLog)({
                            abi: [TONTINE_CREATED_5],
                            data: log.data,
                            topics: log.topics,
                        });
                        if (decoded.eventName === "TontineCreated" && decoded.args?.tontineId != null) {
                            tontineId = Number(decoded.args.tontineId);
                            break;
                        }
                    }
                    catch {
                        // skip
                    }
                }
            }
        }
        // RPC Plasma peut renvoyer un receipt avec logs vides : récupérer les logs via eth_getLogs (même event)
        if (tontineId == null && blockNum != null) {
            if (logs.length === 0) {
                console.warn("[from-tx] Receipt has no logs (Plasma RPC). Using eth_getLogs for block", blockNum.toString(), "tx_hash:", tx_hash);
            }
            const topic0 = (0, viem_1.getEventSelector)(TONTINE_CREATED_4);
            try {
                // getLogs avec event (ABI Plasma) puis filtre par tx_hash
                let blockLogs = await client.getLogs({
                    event: TONTINE_CREATED_4,
                    fromBlock: blockNum,
                    toBlock: blockNum,
                });
                let ourLog = blockLogs.find((l) => l.transactionHash === txHashHex);
                if (ourLog?.args?.tontineId != null)
                    tontineId = Number(ourLog.args.tontineId);
                if (tontineId == null && blockLogs.length > 0) {
                    ourLog = blockLogs.find((l) => l.transactionHash === txHashHex) ?? blockLogs[blockLogs.length - 1];
                    if (ourLog?.args?.tontineId != null)
                        tontineId = Number(ourLog.args.tontineId);
                }
                if (tontineId == null) {
                    blockLogs = await client.getLogs({
                        address: contractAddress,
                        event: TONTINE_CREATED_4,
                        fromBlock: blockNum,
                        toBlock: blockNum,
                    });
                    ourLog = blockLogs.find((l) => l.transactionHash === txHashHex);
                    if (ourLog?.args?.tontineId != null)
                        tontineId = Number(ourLog.args.tontineId);
                }
                // Fallback: eth_getLogs avec topic0 uniquement (ABI Plasma TontineCreated)
                if (tontineId == null) {
                    const blockHex = (0, viem_1.numberToHex)(blockNum);
                    const rawLogs = (await client.request({
                        method: "eth_getLogs",
                        params: [{ topics: [topic0], fromBlock: blockHex, toBlock: blockHex }],
                    }));
                    const raw = rawLogs.find((l) => l.transactionHash?.toLowerCase() === tx_hash.toLowerCase());
                    if (raw?.topics?.[1])
                        tontineId = Number(BigInt(raw.topics[1]));
                }
                if (tontineId != null)
                    console.log("[from-tx] Got tontineId from getLogs:", tontineId);
            }
            catch (e) {
                console.warn("[from-tx] getLogs failed:", e);
            }
        }
    }
    catch (e) {
        console.error("from-tx get receipt/logs:", e);
        return res.status(502).json({ error: "RPC error while fetching transaction" });
    }
    if (tontineId == null) {
        return res.status(400).json({ error: "Could not find TontineCreated event for this tx. Pass contract_tontine_id via POST /groups instead." });
    }
    req.body.contract_tontine_id = tontineId;
    req.body.tx_hash = tx_hash;
    req.body.block_number = block_number ?? null;
    req.body.name = name ?? null;
    req.body.frequency_seconds = frequency_seconds;
    req.body.contribution_amount_usdt = contribution_amount_usdt;
    req.body.collateral_amount_usdt = collateral_amount_usdt;
    req.body.creator_wallet = creator_wallet;
    req.body.smart_contract_address = smart_contract_address;
    return await createGroupFromTx(req, res);
});
async function createGroupFromTx(req, res) {
    const tontineId = req.body.contract_tontine_id;
    if (tontineId == null)
        return res.status(400).json({ error: "contract_tontine_id required" });
    const { name, frequency_seconds, contribution_amount_usdt, collateral_amount_usdt, smart_contract_address, creator_wallet, tx_hash, block_number, } = req.body;
    const contributionAmount = BigInt(Math.round(Number(contribution_amount_usdt) * 10 ** USDT_DECIMALS));
    const collateralAmount = BigInt(Math.round(Number(collateral_amount_usdt) * 10 ** USDT_DECIMALS));
    const creator = creator_wallet.trim().toLowerCase();
    const contractAddress = smart_contract_address.trim().toLowerCase();
    try {
        await (0, client_js_1.query)("BEGIN");
        await (0, client_js_1.query)(`INSERT INTO users (wallet_address, reputation_score) VALUES ($1, 100) ON CONFLICT (wallet_address) DO NOTHING`, [creator]);
        const groupResult = await (0, client_js_1.query)(`INSERT INTO tontine_groups (name, type, payout_details, frequency_seconds, contribution_amount, collateral_amount, status, contract_tontine_id, smart_contract_address)
       VALUES ($1, 'STANDARD', NULL, $2, $3, $4, 'active', $5, $6)
       RETURNING id, name, type, payout_details, frequency_seconds, contribution_amount, collateral_amount, status, contract_tontine_id, smart_contract_address, created_at`, [name ?? null, frequency_seconds, contributionAmount.toString(), collateralAmount.toString(), tontineId, contractAddress]);
        const group = groupResult.rows[0];
        await (0, client_js_1.query)(`INSERT INTO tontine_members (tontine_group_id, wallet_address, turn_position, collateral_status)
       VALUES ($1, $2, 0, 'ok')`, [group.id, creator]);
        if (tx_hash && block_number != null) {
            await (0, client_js_1.query)(`INSERT INTO blockchain_events (tx_hash, block_number, method_name, from_address, to_address, payload)
         VALUES ($1, $2, 'TontineCreated', $3, $4, $5)`, [tx_hash, block_number, creator, contractAddress, JSON.stringify({ contract_tontine_id: tontineId, name: name ?? null })]);
        }
        await (0, client_js_1.query)("COMMIT");
        return res.status(201).json(groupResult.rows[0]);
    }
    catch (e) {
        await (0, client_js_1.query)("ROLLBACK");
        console.error(e);
        return res.status(500).json({ error: "Failed to create tontine group" });
    }
}
/**
 * POST /api/tontine/groups/register-member
 * Enregistre un membre qui a rejoint une tontine on-chain (après joinTontine).
 * Body: { contract_tontine_id, smart_contract_address, wallet }
 */
exports.tontineRouter.post("/groups/register-member", async (req, res) => {
    const { contract_tontine_id, smart_contract_address, wallet } = req.body;
    if (contract_tontine_id == null || !smart_contract_address || !wallet) {
        return res.status(400).json({
            error: "Missing required fields: contract_tontine_id, smart_contract_address, wallet",
        });
    }
    const walletLower = wallet.trim().toLowerCase();
    const contractLower = smart_contract_address.trim().toLowerCase();
    try {
        const groupResult = await (0, client_js_1.query)("SELECT id FROM tontine_groups WHERE contract_tontine_id = $1 AND LOWER(smart_contract_address) = $2", [contract_tontine_id, contractLower]);
        if (groupResult.rows.length === 0) {
            return res.status(404).json({ error: "Tontine group not found for this contract" });
        }
        const groupId = groupResult.rows[0].id;
        const countResult = await (0, client_js_1.query)("SELECT COUNT(*)::int AS c FROM tontine_members WHERE tontine_group_id = $1", [groupId]);
        const turnPosition = countResult.rows[0].c;
        await (0, client_js_1.query)("INSERT INTO users (wallet_address, reputation_score) VALUES ($1, 100) ON CONFLICT (wallet_address) DO NOTHING", [walletLower]);
        await (0, client_js_1.query)("INSERT INTO tontine_members (tontine_group_id, wallet_address, turn_position, collateral_status) VALUES ($1, $2, $3, 'ok') ON CONFLICT (tontine_group_id, wallet_address) DO NOTHING", [groupId, walletLower, turnPosition]);
        return res.status(201).json({ ok: true });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to register member" });
    }
});
/**
 * POST /api/tontine/escrow
 * Crée une tontine de type ESCROW_LINKED (payout verrouillé pour le fournisseur de service).
 * Body: comme POST /groups + service_provider (requis), payout_description? (optionnel).
 */
exports.tontineRouter.post("/escrow", async (req, res) => {
    const { name, service_provider, payout_description, frequency_seconds, contribution_amount_usdt, collateral_amount_usdt, contract_tontine_id, smart_contract_address, creator_wallet, tx_hash, block_number, } = req.body;
    if (!service_provider || service_provider.trim().length !== 42) {
        return res.status(400).json({ error: "service_provider (address 0x...) is required for escrow tontine" });
    }
    if (frequency_seconds == null ||
        contribution_amount_usdt == null ||
        collateral_amount_usdt == null ||
        contract_tontine_id == null ||
        !smart_contract_address ||
        !creator_wallet) {
        return res.status(400).json({
            error: "Missing required fields: frequency_seconds, contribution_amount_usdt, collateral_amount_usdt, contract_tontine_id, smart_contract_address, creator_wallet, service_provider",
        });
    }
    const contributionAmount = BigInt(Math.round(Number(contribution_amount_usdt) * 10 ** USDT_DECIMALS));
    const collateralAmount = BigInt(Math.round(Number(collateral_amount_usdt) * 10 ** USDT_DECIMALS));
    const creator = creator_wallet.trim().toLowerCase();
    const contractAddress = smart_contract_address.trim().toLowerCase();
    const payoutDetails = JSON.stringify({
        serviceProvider: service_provider.trim().toLowerCase(),
        description: payout_description ?? null,
    });
    try {
        await (0, client_js_1.query)("BEGIN");
        await (0, client_js_1.query)("INSERT INTO users (wallet_address, reputation_score) VALUES ($1, 100) ON CONFLICT (wallet_address) DO NOTHING", [creator]);
        const groupResult = await (0, client_js_1.query)(`INSERT INTO tontine_groups (name, type, payout_details, frequency_seconds, contribution_amount, collateral_amount, status, contract_tontine_id, smart_contract_address)
       VALUES ($1, 'ESCROW_LINKED', $2, $3, $4, $5, 'active', $6, $7)
       RETURNING id, name, type, payout_details, frequency_seconds, contribution_amount, collateral_amount, status, contract_tontine_id, smart_contract_address, created_at`, [name ?? null, payoutDetails, frequency_seconds, contributionAmount.toString(), collateralAmount.toString(), contract_tontine_id, contractAddress]);
        const group = groupResult.rows[0];
        await (0, client_js_1.query)("INSERT INTO tontine_members (tontine_group_id, wallet_address, turn_position, collateral_status) VALUES ($1, $2, 0, 'ok')", [group.id, creator]);
        if (tx_hash && block_number != null) {
            await (0, client_js_1.query)("INSERT INTO blockchain_events (tx_hash, block_number, method_name, from_address, to_address, payload) VALUES ($1, $2, 'TontineCreated', $3, $4, $5)", [tx_hash, block_number, creator, contractAddress, JSON.stringify({ contract_tontine_id, name: name ?? null, type: "ESCROW_LINKED" })]);
        }
        await (0, client_js_1.query)("COMMIT");
        return res.status(201).json(groupResult.rows[0]);
    }
    catch (e) {
        await (0, client_js_1.query)("ROLLBACK");
        console.error(e);
        return res.status(500).json({ error: "Failed to create escrow tontine group" });
    }
});
/**
 * GET /api/tontine/escrow-transactions
 * Liste des escrows où le wallet est winner ou beneficiary. ?wallet=0x... requis.
 */
exports.tontineRouter.get("/escrow-transactions", async (req, res) => {
    const wallet = (req.query.wallet ?? "").toString().toLowerCase();
    if (!wallet || wallet.length !== 42) {
        return res.status(400).json({ error: "Query wallet (0x...) is required" });
    }
    const result = await (0, client_js_1.query)(`SELECT e.id, e.tontine_group_id, e.contract_id, e.beneficiary, e.winner_address, e.amount, e.status, e.created_at, e.released_at
     FROM escrow_transactions e
     WHERE e.winner_address = $1 OR e.beneficiary = $1
     ORDER BY e.created_at DESC`, [wallet]);
    res.json(result.rows);
});
/**
 * POST /api/tontine/escrow-transactions
 * Enregistre un escrow (après événement EscrowCreated on-chain).
 */
exports.tontineRouter.post("/escrow-transactions", async (req, res) => {
    const { tontine_group_id, contract_id, beneficiary, winner_address, amount } = req.body;
    if (!tontine_group_id || !beneficiary || !winner_address || amount == null) {
        return res.status(400).json({
            error: "Missing required fields: tontine_group_id, beneficiary, winner_address, amount",
        });
    }
    const beneficiaryLower = beneficiary.trim().toLowerCase();
    const winnerLower = winner_address.trim().toLowerCase();
    const amountBigInt = BigInt(amount);
    try {
        const result = await (0, client_js_1.query)(`INSERT INTO escrow_transactions (tontine_group_id, contract_id, beneficiary, winner_address, amount, status)
       VALUES ($1, $2, $3, $4, $5, 'LOCKED')
       RETURNING id, tontine_group_id, contract_id, beneficiary, winner_address, amount, status, created_at`, [tontine_group_id, contract_id ?? null, beneficiaryLower, winnerLower, amountBigInt.toString()]);
        return res.status(201).json(result.rows[0]);
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to create escrow transaction" });
    }
});
/**
 * GET /api/tontine/groups/:id
 * Détail d'un groupe + membres.
 */
exports.tontineRouter.get("/groups/:id", async (req, res) => {
    const { id } = req.params;
    const groupResult = await (0, client_js_1.query)("SELECT * FROM tontine_groups WHERE id = $1", [id]);
    if (groupResult.rows.length === 0) {
        return res.status(404).json({ error: "Group not found" });
    }
    const membersResult = await (0, client_js_1.query)("SELECT wallet_address, turn_position, collateral_status, joined_at FROM tontine_members WHERE tontine_group_id = $1 ORDER BY turn_position", [id]);
    const row = groupResult.rows[0];
    const { deposit_wallet_private_key: _pk, ...safe } = row;
    res.json({ ...safe, members: membersResult.rows });
});
/**
 * POST /api/tontine/groups/:id/sign
 * Le créateur (membre turn 0) signe pour activer la tontine.
 * Body: { creator_wallet: string }
 */
exports.tontineRouter.post("/groups/:id/sign", async (req, res) => {
    const { id } = req.params;
    const creator_wallet = typeof req.body?.creator_wallet === "string" ? req.body.creator_wallet.trim().toLowerCase() : "";
    if (!creator_wallet || !/^0x[a-fa-f0-9]{40}$/.test(creator_wallet)) {
        return res.status(400).json({ error: "creator_wallet (0x...) required" });
    }
    const memberRow = await (0, client_js_1.query)("SELECT 1 FROM tontine_members WHERE tontine_group_id = $1 AND LOWER(wallet_address) = $2 AND turn_position = 0", [id, creator_wallet]);
    if (memberRow.rows.length === 0) {
        return res.status(403).json({ error: "Only the creator (first member) can sign" });
    }
    await (0, client_js_1.query)("UPDATE tontine_groups SET creator_signed_at = NOW() WHERE id = $1", [id]);
    const groupResult = await (0, client_js_1.query)("SELECT * FROM tontine_groups WHERE id = $1", [id]);
    return res.json(groupResult.rows[0]);
});
/**
 * POST /api/tontine/groups/:id/execute-turn
 * Libère les USDT du wallet de dépôt vers le bénéficiaire actuel, puis passe au tour suivant. Bouton test démo.
 */
exports.tontineRouter.post("/groups/:id/execute-turn", async (req, res) => {
    const { id } = req.params;
    const groupResult = await (0, client_js_1.query)("SELECT id, current_turn_index, frequency_seconds, deposit_wallet_address, deposit_wallet_private_key FROM tontine_groups WHERE id = $1", [id]);
    if (groupResult.rows.length === 0) {
        return res.status(404).json({ error: "Group not found" });
    }
    const row = groupResult.rows[0];
    const membersResult = await (0, client_js_1.query)("SELECT wallet_address FROM tontine_members WHERE tontine_group_id = $1 ORDER BY turn_position", [id]);
    const memberCount = membersResult.rows.length;
    if (memberCount === 0) {
        return res.status(400).json({ error: "No members" });
    }
    const current = row.current_turn_index ?? 0;
    const frequency_seconds = row.frequency_seconds ?? 0;
    const beneficiary = membersResult.rows[current].wallet_address;
    if (row.deposit_wallet_address && row.deposit_wallet_private_key && config_js_1.config.blockchain.usdtAddress) {
        const publicClient = getChainClient();
        const balance = await publicClient.readContract({
            address: config_js_1.config.blockchain.usdtAddress,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [row.deposit_wallet_address],
        }).catch(() => 0n);
        if (balance > 0n) {
            const walletClient = (0, viem_1.createWalletClient)({
                chain: plasmaChain,
                transport: (0, viem_1.http)(config_js_1.config.blockchain.rpcUrl),
                account: (0, accounts_1.privateKeyToAccount)(row.deposit_wallet_private_key),
            });
            try {
                const hash = await walletClient.writeContract({
                    address: config_js_1.config.blockchain.usdtAddress,
                    abi: ERC20_ABI,
                    functionName: "transfer",
                    args: [beneficiary, balance],
                    account: walletClient.account,
                });
                const publicClient = getChainClient();
                const receipt = await publicClient.waitForTransactionReceipt({ hash });
                const blockNumber = receipt.blockNumber;
                await (0, client_js_1.query)(`INSERT INTO tontine_payouts (tontine_group_id, tx_hash, block_number, to_address, amount)
           VALUES ($1, $2, $3, $4, $5)`, [id, hash, blockNumber.toString(), beneficiary.toLowerCase(), balance.toString()]);
                await (0, client_js_1.query)(`INSERT INTO blockchain_events (tx_hash, block_number, method_name, from_address, to_address, payload)
           VALUES ($1, $2, 'TontinePayout', $3, $4, $5)`, [hash, Number(blockNumber), row.deposit_wallet_address.toLowerCase(), beneficiary.toLowerCase(), JSON.stringify({ tontine_group_id: id, amount: balance.toString() })]);
                console.log("[execute-turn] USDT released to beneficiary", beneficiary, "tx", hash);
            }
            catch (e) {
                console.error("[execute-turn] transfer failed:", e);
                return res.status(502).json({ error: "Transfer USDT failed. Check RPC and gas." });
            }
        }
    }
    const nextIndex = (current + 1) % memberCount;
    await (0, client_js_1.query)("UPDATE tontine_groups SET current_turn_index = $1, next_due_at = NOW() + ($2 || ' seconds')::interval WHERE id = $3", [nextIndex, String(frequency_seconds), id]);
    const updated = await (0, client_js_1.query)("SELECT id, name, type, payout_details, frequency_seconds, contribution_amount, collateral_amount, status, contract_tontine_id, smart_contract_address, creator_signed_at, current_turn_index, next_due_at, created_at, deposit_wallet_address FROM tontine_groups WHERE id = $1", [id]);
    return res.json(updated.rows[0]);
});
/**
 * GET /api/tontine/groups/:id/deposit-balance
 * Solde USDT du wallet de dépôt (pour afficher si des dépôts ont été reçus).
 */
exports.tontineRouter.get("/groups/:id/deposit-balance", async (req, res) => {
    const { id } = req.params;
    const groupResult = await (0, client_js_1.query)("SELECT deposit_wallet_address FROM tontine_groups WHERE id = $1", [id]);
    if (groupResult.rows.length === 0) {
        return res.status(404).json({ error: "Group not found" });
    }
    const addr = groupResult.rows[0].deposit_wallet_address;
    if (!addr || !config_js_1.config.blockchain.usdtAddress) {
        return res.json({ balance: "0", balanceFormatted: "0" });
    }
    try {
        const publicClient = getChainClient();
        const balance = await publicClient.readContract({
            address: config_js_1.config.blockchain.usdtAddress,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [addr],
        });
        const balanceStr = balance.toString();
        const balanceFormatted = (Number(balance) / 10 ** USDT_DECIMALS).toFixed(2);
        return res.json({ balance: balanceStr, balanceFormatted });
    }
    catch (e) {
        console.warn("[deposit-balance]", e);
        return res.json({ balance: "0", balanceFormatted: "0" });
    }
});
/**
 * GET /api/tontine/groups/:id/payouts
 * Historique des échéances (libérations USDT vers les bénéficiaires) pour afficher les transactions.
 */
exports.tontineRouter.get("/groups/:id/payouts", async (req, res) => {
    const { id } = req.params;
    const result = await (0, client_js_1.query)("SELECT id, tontine_group_id, tx_hash, block_number, to_address, amount, created_at FROM tontine_payouts WHERE tontine_group_id = $1 ORDER BY created_at DESC", [id]);
    res.json(result.rows);
});
/**
 * GET /api/tontine/events
 * Derniers événements blockchain (cache local).
 */
exports.tontineRouter.get("/events", async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const result = await (0, client_js_1.query)("SELECT tx_hash, block_number, method_name, from_address, to_address, payload, created_at FROM blockchain_events ORDER BY block_number DESC, id DESC LIMIT $1", [limit]);
    res.json(result.rows);
});
