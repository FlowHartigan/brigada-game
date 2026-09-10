import { canPerformAction, type CombatRng, type CombatState } from "@/game/engine/combat";
import type { CombatAction } from "@/game/engine/types";

export type OpponentIntent = CombatAction | "wait";

export type RecentPlayerAction = {
  action: CombatAction;
  at: number;
};

export type UtilityScore = {
  action: OpponentIntent;
  score: number;
};

function countRecent(
  history: readonly RecentPlayerAction[],
  action: CombatAction,
  now: number,
  windowMs = 3_000,
): number {
  return history.filter((entry) => entry.action === action && now - entry.at <= windowMs).length;
}

function legalOrZero(state: CombatState, action: CombatAction, now: number, score: number) {
  return canPerformAction(state, "opponent", action, now) ? score : 0;
}

export function scoreOpponentActions(
  state: CombatState,
  history: readonly RecentPlayerAction[],
  now = state.now,
): UtilityScore[] {
  const opponent = state.opponent;
  const player = state.player;

  if (state.status !== "active" || now < opponent.stunnedUntil || now < opponent.recoveryUntil) {
    return [
      { action: "attack", score: 0 },
      { action: "defend", score: 0 },
      { action: "dodge", score: 0 },
      { action: "special", score: 0 },
      { action: "wait", score: 100 },
    ];
  }

  const recentAttacks = countRecent(history, "attack", now);
  const recentSpecials = countRecent(history, "special", now, 4_000);
  const recentDefense = countRecent(history, "defend", now);
  const recentDodges = countRecent(history, "dodge", now);
  const opponentHpRatio = opponent.hp / opponent.maxHp;
  const playerGuardRatio = player.guard / player.maxGuard;
  const playerIsRecovering = now < player.recoveryUntil;
  const playerIsStunned = now < player.stunnedUntil;

  let attackScore = 30;
  let defendScore = 14;
  let dodgeScore = 12;
  let specialScore = 22;
  let waitScore = 7;

  if (playerIsRecovering || playerIsStunned) {
    attackScore += 34;
    specialScore += 28;
    dodgeScore -= 8;
  }

  if (player.isDefending) {
    attackScore += 10;
    specialScore += 12;
    if (playerGuardRatio < 0.4) {
      attackScore += 22;
      specialScore += 24;
    }
  }

  if (recentAttacks >= 3) {
    defendScore += 36;
    dodgeScore += 24;
    attackScore -= 6;
  }

  if (recentSpecials >= 1) {
    dodgeScore += 15;
    defendScore += 10;
  }

  if (recentDefense >= 3) {
    attackScore += 26;
    specialScore += 18;
    defendScore -= 6;
  }

  if (recentDodges >= 2) {
    waitScore += 12;
    attackScore -= 4;
  }

  if (opponentHpRatio < 0.35) {
    defendScore += 15;
    dodgeScore += 10;
    specialScore += 8;
  }

  if (opponent.guard / opponent.maxGuard < 0.3) {
    defendScore -= 8;
    dodgeScore += 15;
  }

  return [
    { action: "attack", score: legalOrZero(state, "attack", now, Math.max(0, attackScore)) },
    { action: "defend", score: legalOrZero(state, "defend", now, Math.max(0, defendScore)) },
    { action: "dodge", score: legalOrZero(state, "dodge", now, Math.max(0, dodgeScore)) },
    { action: "special", score: legalOrZero(state, "special", now, Math.max(0, specialScore)) },
    { action: "wait", score: Math.max(1, waitScore) },
  ];
}

export function chooseOpponentAction(
  state: CombatState,
  history: readonly RecentPlayerAction[],
  now = state.now,
  rng: CombatRng = Math.random,
): OpponentIntent {
  const scores = scoreOpponentActions(state, history, now);
  const total = scores.reduce((sum, candidate) => sum + candidate.score, 0);

  if (total <= 0) return "wait";

  let cursor = Math.min(0.999999, Math.max(0, rng())) * total;
  for (const candidate of scores) {
    cursor -= candidate.score;
    if (cursor < 0) return candidate.action;
  }

  return scores[scores.length - 1]?.action ?? "wait";
}
