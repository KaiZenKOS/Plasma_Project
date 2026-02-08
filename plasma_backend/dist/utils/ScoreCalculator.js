"use strict";
/**
 * ScoreCalculator - Logique de scoring DÉTERMINISTE (PAS D'IA).
 * Algorithme :
 * - Score initial = 100
 * - Paiement à l'heure : +1 (max 100)
 * - Retard < 24h : -5
 * - Retard > 3 jours : -20 (alerte)
 * - Défaut (saisie collatéral) : score = 0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.THREE_DAYS_MS = exports.ONE_DAY_MS = exports.COLLATERAL_SLASHED_SCORE = exports.LATE_PENALTY_OVER_3_DAYS = exports.LATE_PENALTY_UNDER_24H = exports.ON_TIME_BONUS = exports.MAX_SCORE = exports.INITIAL_SCORE = void 0;
exports.getPaymentScoreDelta = getPaymentScoreDelta;
exports.applyDelta = applyDelta;
exports.getScoreAfterSlash = getScoreAfterSlash;
exports.computeScoreFromHistory = computeScoreFromHistory;
exports.INITIAL_SCORE = 100;
exports.MAX_SCORE = 100;
exports.ON_TIME_BONUS = 1;
exports.LATE_PENALTY_UNDER_24H = 5;
exports.LATE_PENALTY_OVER_3_DAYS = 20;
exports.COLLATERAL_SLASHED_SCORE = 0;
exports.ONE_DAY_MS = 24 * 60 * 60 * 1000;
exports.THREE_DAYS_MS = 3 * exports.ONE_DAY_MS;
/**
 * Calcule le delta de score pour un paiement selon la date d'échéance.
 */
function getPaymentScoreDelta(paidAt, dueAt) {
    const now = paidAt.getTime();
    const due = dueAt.getTime();
    if (now <= due)
        return exports.ON_TIME_BONUS;
    const delayMs = now - due;
    if (delayMs < exports.ONE_DAY_MS)
        return -exports.LATE_PENALTY_UNDER_24H;
    if (delayMs >= exports.THREE_DAYS_MS)
        return -exports.LATE_PENALTY_OVER_3_DAYS;
    return -exports.LATE_PENALTY_UNDER_24H; // entre 24h et 3j : -5 aussi (ou on peut -20, spec dit "> 3 jours" = -20)
}
/**
 * Applique le delta au score actuel (plafonné à MAX_SCORE).
 */
function applyDelta(currentScore, delta) {
    const next = currentScore + delta;
    if (next >= exports.MAX_SCORE)
        return exports.MAX_SCORE;
    if (next <= 0)
        return 0;
    return next;
}
/**
 * Score après un événement "collatéral saisi" : 0.
 */
function getScoreAfterSlash() {
    return exports.COLLATERAL_SLASHED_SCORE;
}
/**
 * Calcule le score final à partir d'une liste d'événements (paiements + slashes).
 * Ordre chronologique attendu.
 */
function computeScoreFromHistory(events) {
    let score = exports.INITIAL_SCORE;
    for (const e of events) {
        if (e.type === "slash") {
            score = getScoreAfterSlash();
            continue;
        }
        const delta = getPaymentScoreDelta(e.paidAt, e.dueAt);
        score = applyDelta(score, delta);
    }
    return score;
}
