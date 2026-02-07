/**
 * ScoreCalculator - Logique de scoring DÉTERMINISTE (PAS D'IA).
 * Algorithme :
 * - Score initial = 100
 * - Paiement à l'heure : +1 (max 100)
 * - Retard < 24h : -5
 * - Retard > 3 jours : -20 (alerte)
 * - Défaut (saisie collatéral) : score = 0
 */

export const INITIAL_SCORE = 100;
export const MAX_SCORE = 100;
export const ON_TIME_BONUS = 1;
export const LATE_PENALTY_UNDER_24H = 5;
export const LATE_PENALTY_OVER_3_DAYS = 20;
export const COLLATERAL_SLASHED_SCORE = 0;

export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const THREE_DAYS_MS = 3 * ONE_DAY_MS;

export type PaymentEvent = {
  paidAt: Date;
  dueAt: Date;
  type: "on_time" | "late_under_24h" | "late_over_3d";
};

export type SlashEvent = {
  slashedAt: Date;
};

/**
 * Calcule le delta de score pour un paiement selon la date d'échéance.
 */
export function getPaymentScoreDelta(paidAt: Date, dueAt: Date): number {
  const now = paidAt.getTime();
  const due = dueAt.getTime();
  if (now <= due) return ON_TIME_BONUS;
  const delayMs = now - due;
  if (delayMs < ONE_DAY_MS) return -LATE_PENALTY_UNDER_24H;
  if (delayMs >= THREE_DAYS_MS) return -LATE_PENALTY_OVER_3_DAYS;
  return -LATE_PENALTY_UNDER_24H; // entre 24h et 3j : -5 aussi (ou on peut -20, spec dit "> 3 jours" = -20)
}

/**
 * Applique le delta au score actuel (plafonné à MAX_SCORE).
 */
export function applyDelta(currentScore: number, delta: number): number {
  const next = currentScore + delta;
  if (next >= MAX_SCORE) return MAX_SCORE;
  if (next <= 0) return 0;
  return next;
}

/**
 * Score après un événement "collatéral saisi" : 0.
 */
export function getScoreAfterSlash(): number {
  return COLLATERAL_SLASHED_SCORE;
}

/**
 * Calcule le score final à partir d'une liste d'événements (paiements + slashes).
 * Ordre chronologique attendu.
 */
export function computeScoreFromHistory(
  events: Array<{ type: "payment"; paidAt: Date; dueAt: Date } | { type: "slash" }>
): number {
  let score = INITIAL_SCORE;
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
