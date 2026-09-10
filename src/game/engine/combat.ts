import { getFighter } from "@/game/data/fighters";
import {
  calculateAttackRecoveryMs,
  calculateDamage,
  calculateDodgeCooldownMs,
  calculateDodgeInvulnerabilityMs,
  calculateGuardCapacity,
  calculateGuardDamage,
  calculateMaxHp,
} from "@/game/engine/formulas";
import type { CombatAction, FighterId } from "@/game/engine/types";

export type CombatSide = "player" | "opponent";
export type CombatWinner = CombatSide | "draw";
export type CombatEndReason = "ko" | "timeout";

export type CombatEventType =
  | "attack"
  | "special"
  | "hit"
  | "block"
  | "miss"
  | "dodge"
  | "defend"
  | "guard-break"
  | "counter-ready"
  | "counter"
  | "armor"
  | "unavailable"
  | "ko"
  | "timeout";

export type CombatEvent = {
  id: number;
  at: number;
  type: CombatEventType;
  actor: CombatSide;
  target?: CombatSide;
  action?: CombatAction;
  damage?: number;
  guardDamage?: number;
  message: string;
};

export type FighterCombatState = {
  fighterId: FighterId;
  hp: number;
  maxHp: number;
  guard: number;
  maxGuard: number;
  isDefending: boolean;
  invulnerableUntil: number;
  stunnedUntil: number;
  recoveryUntil: number;
  dodgeReadyAt: number;
  specialReadyAt: number;
  armorUntil: number;
  counterUntil: number;
  counterFallbackPending: boolean;
  comboStep: 0 | 1 | 2;
  comboExpiresAt: number;
};

export type CombatState = {
  player: FighterCombatState;
  opponent: FighterCombatState;
  startedAt: number;
  now: number;
  lastUpdatedAt: number;
  durationMs: number;
  status: "active" | "finished";
  winner: CombatWinner | null;
  endReason: CombatEndReason | null;
  eventSequence: number;
  recentEvents: CombatEvent[];
};

export type CombatTransition = {
  state: CombatState;
  events: CombatEvent[];
  accepted: boolean;
};

export type CombatRng = () => number;

const MATCH_DURATION_MS = 60_000;
const GUARD_REGEN_PER_SECOND = 16;
const GUARD_BREAK_STUN_MS = 800;
const COMBO_WINDOW_MS = 900;
const COUNTER_WINDOW_MS = 460;
const COUNTER_RECOVERY_MS = 620;
const PETOUX_ARMOR_MS = 520;
const PETOUX_ARMOR_DAMAGE_MULTIPLIER = 0.6;
const RECENT_EVENT_LIMIT = 8;
const BASIC_COMBO_MULTIPLIERS = [1, 1.08, 1.18] as const;

function otherSide(side: CombatSide): CombatSide {
  return side === "player" ? "opponent" : "player";
}

function cloneState(state: CombatState): CombatState {
  return {
    ...state,
    player: { ...state.player },
    opponent: { ...state.opponent },
    recentEvents: [...state.recentEvents],
  };
}

function getRuntime(state: CombatState, side: CombatSide): FighterCombatState {
  return state[side];
}

function createRuntime(fighterId: FighterId, startedAt: number): FighterCombatState {
  const fighter = getFighter(fighterId);
  const maxHp = calculateMaxHp(fighter.stats.vitality);
  const maxGuard = calculateGuardCapacity(fighter.stats.defense);

  return {
    fighterId,
    hp: maxHp,
    maxHp,
    guard: maxGuard,
    maxGuard,
    isDefending: false,
    invulnerableUntil: 0,
    stunnedUntil: 0,
    recoveryUntil: 0,
    dodgeReadyAt: startedAt,
    specialReadyAt: startedAt + fighter.special.cooldownMs,
    armorUntil: 0,
    counterUntil: 0,
    counterFallbackPending: false,
    comboStep: 0,
    comboExpiresAt: 0,
  };
}

export function createCombatState(
  playerId: FighterId,
  opponentId: FighterId,
  startedAt = 0,
  durationMs = MATCH_DURATION_MS,
): CombatState {
  if (playerId === opponentId) {
    throw new Error("A fighter cannot fight themself.");
  }

  return {
    player: createRuntime(playerId, startedAt),
    opponent: createRuntime(opponentId, startedAt),
    startedAt,
    now: startedAt,
    lastUpdatedAt: startedAt,
    durationMs,
    status: "active",
    winner: null,
    endReason: null,
    eventSequence: 0,
    recentEvents: [],
  };
}

function pushEvent(
  state: CombatState,
  events: CombatEvent[],
  input: Omit<CombatEvent, "id">,
): CombatEvent {
  state.eventSequence += 1;
  const event: CombatEvent = { ...input, id: state.eventSequence };
  events.push(event);
  state.recentEvents = [...state.recentEvents, event].slice(-RECENT_EVENT_LIMIT);
  return event;
}

function varianceFromRng(rng: CombatRng): number {
  const sample = Math.min(1, Math.max(0, rng()));
  return (sample - 0.5) * 0.1;
}

function resetExpiredCombo(runtime: FighterCombatState, now: number) {
  if (runtime.comboExpiresAt > 0 && now > runtime.comboExpiresAt) {
    runtime.comboStep = 0;
    runtime.comboExpiresAt = 0;
  }
}

function regenerateGuard(runtime: FighterCombatState, elapsedMs: number, now: number) {
  if (
    elapsedMs <= 0 ||
    runtime.isDefending ||
    now < runtime.stunnedUntil ||
    runtime.guard >= runtime.maxGuard
  ) {
    return;
  }

  const restored = (GUARD_REGEN_PER_SECOND * elapsedMs) / 1000;
  runtime.guard = Math.min(runtime.maxGuard, runtime.guard + restored);
}

function finishForKo(state: CombatState, events: CombatEvent[], at: number) {
  if (state.status === "finished") return;

  const playerDown = state.player.hp <= 0;
  const opponentDown = state.opponent.hp <= 0;
  if (!playerDown && !opponentDown) return;

  state.status = "finished";
  state.endReason = "ko";
  state.winner = playerDown && opponentDown ? "draw" : playerDown ? "opponent" : "player";

  const actor = state.winner === "opponent" ? "opponent" : "player";
  pushEvent(state, events, {
    at,
    type: "ko",
    actor,
    target: state.winner === "draw" ? undefined : otherSide(actor),
    message: state.winner === "draw" ? "DOUBLE KO" : `${getFighter(getRuntime(state, actor).fighterId).name} WINS`,
  });
}

function finishForTimeout(state: CombatState, events: CombatEvent[], at: number) {
  if (state.status === "finished") return;

  const playerRatio = state.player.hp / state.player.maxHp;
  const opponentRatio = state.opponent.hp / state.opponent.maxHp;
  const epsilon = 0.0001;

  state.status = "finished";
  state.endReason = "timeout";
  state.winner =
    Math.abs(playerRatio - opponentRatio) <= epsilon
      ? "draw"
      : playerRatio > opponentRatio
        ? "player"
        : "opponent";

  const actor = state.winner === "opponent" ? "opponent" : "player";
  pushEvent(state, events, {
    at,
    type: "timeout",
    actor,
    message: state.winner === "draw" ? "TIME — DRAW" : `TIME — ${getFighter(getRuntime(state, actor).fighterId).name} WINS`,
  });
}

function applyDamage(
  state: CombatState,
  attackerSide: CombatSide,
  defenderSide: CombatSide,
  moveMultiplier: number,
  now: number,
  rng: CombatRng,
  events: CombatEvent[],
  options: { special?: boolean; fallback?: boolean } = {},
) {
  const attacker = getRuntime(state, attackerSide);
  const defender = getRuntime(state, defenderSide);
  const attackerDef = getFighter(attacker.fighterId);
  const defenderDef = getFighter(defender.fighterId);
  const action: CombatAction = options.special ? "special" : "attack";

  if (defender.invulnerableUntil > now) {
    pushEvent(state, events, {
      at: now,
      type: "miss",
      actor: attackerSide,
      target: defenderSide,
      action,
      message: `${defenderDef.name} esquive`,
    });
    attacker.comboStep = 0;
    attacker.comboExpiresAt = 0;
    return { hit: false, blocked: false };
  }

  if (defender.counterFallbackPending && defender.counterUntil > now) {
    defender.counterFallbackPending = false;
    defender.counterUntil = 0;
    const counterDef = getFighter(defender.fighterId);
    const counterDamage = calculateDamage({
      attacker: counterDef.stats,
      defender: attackerDef.stats,
      moveMultiplier: counterDef.special.damageMultiplier,
      variance: varianceFromRng(rng),
    });
    attacker.hp = Math.max(0, attacker.hp - counterDamage);
    pushEvent(state, events, {
      at: now,
      type: "counter",
      actor: defenderSide,
      target: attackerSide,
      action: "special",
      damage: counterDamage,
      message: `${counterDef.special.name} · ${counterDamage} dégâts`,
    });
    finishForKo(state, events, now);
    return { hit: false, blocked: false };
  }

  const blocked = defender.isDefending && now >= defender.stunnedUntil;
  let damage = calculateDamage({
    attacker: attackerDef.stats,
    defender: defenderDef.stats,
    moveMultiplier,
    variance: varianceFromRng(rng),
    blocked,
  });

  if (defender.armorUntil > now) {
    damage = Math.max(1, Math.round(damage * PETOUX_ARMOR_DAMAGE_MULTIPLIER));
    pushEvent(state, events, {
      at: now,
      type: "armor",
      actor: defenderSide,
      target: attackerSide,
      message: `${defenderDef.name} absorbe l'impact`,
    });
  }

  defender.hp = Math.max(0, defender.hp - damage);

  if (blocked) {
    let guardMultiplier = moveMultiplier;
    if (options.special && attacker.fighterId === "hartz") {
      guardMultiplier *= 1.5;
    }
    const guardDamage = calculateGuardDamage(attackerDef.stats.strength, guardMultiplier);
    defender.guard = Math.max(0, defender.guard - guardDamage);

    pushEvent(state, events, {
      at: now,
      type: "block",
      actor: attackerSide,
      target: defenderSide,
      action,
      damage,
      guardDamage,
      message: `${defenderDef.name} bloque · -${Math.round(guardDamage)} garde`,
    });

    if (defender.guard <= 0) {
      defender.isDefending = false;
      defender.stunnedUntil = Math.max(defender.stunnedUntil, now + GUARD_BREAK_STUN_MS);
      defender.recoveryUntil = Math.max(defender.recoveryUntil, now + GUARD_BREAK_STUN_MS);
      pushEvent(state, events, {
        at: now,
        type: "guard-break",
        actor: attackerSide,
        target: defenderSide,
        action,
        message: `GUARD BREAK · ${defenderDef.name}`,
      });
    }
  } else {
    pushEvent(state, events, {
      at: now,
      type: "hit",
      actor: attackerSide,
      target: defenderSide,
      action,
      damage,
      message: `${attackerDef.name} touche · ${damage} dégâts`,
    });
  }

  finishForKo(state, events, now);
  return { hit: true, blocked };
}

function resolveCounterFallback(
  state: CombatState,
  side: CombatSide,
  now: number,
  events: CombatEvent[],
) {
  const runtime = getRuntime(state, side);
  if (!runtime.counterFallbackPending || runtime.counterUntil <= 0 || now < runtime.counterUntil) {
    return;
  }

  runtime.counterFallbackPending = false;
  const fallbackAt = runtime.counterUntil;
  runtime.counterUntil = 0;
  if (state.status !== "active") return;

  const targetSide = otherSide(side);
  const target = getRuntime(state, targetSide);
  if (target.invulnerableUntil > fallbackAt) {
    pushEvent(state, events, {
      at: fallbackAt,
      type: "miss",
      actor: side,
      target: targetSide,
      action: "special",
      message: `${getFighter(runtime.fighterId).special.name} rate`,
    });
    return;
  }

  applyDamage(state, side, targetSide, 1.1, fallbackAt, () => 0.5, events, {
    special: true,
    fallback: true,
  });
}

export function advanceCombat(state: CombatState, now: number): CombatTransition {
  if (now < state.now) {
    throw new Error("Combat time cannot move backwards.");
  }

  const next = cloneState(state);
  const events: CombatEvent[] = [];
  const elapsedMs = Math.max(0, now - next.lastUpdatedAt);
  next.now = now;

  resetExpiredCombo(next.player, now);
  resetExpiredCombo(next.opponent, now);
  regenerateGuard(next.player, elapsedMs, now);
  regenerateGuard(next.opponent, elapsedMs, now);

  resolveCounterFallback(next, "player", now, events);
  resolveCounterFallback(next, "opponent", now, events);

  next.lastUpdatedAt = now;

  if (next.status === "active" && now - next.startedAt >= next.durationMs) {
    finishForTimeout(next, events, now);
  }

  return { state: next, events, accepted: true };
}

export function canPerformAction(
  state: CombatState,
  side: CombatSide,
  action: CombatAction,
  now = state.now,
): boolean {
  if (state.status !== "active") return false;
  const runtime = getRuntime(state, side);
  if (now < runtime.stunnedUntil || now < runtime.recoveryUntil) return false;

  if (action === "dodge") return now >= runtime.dodgeReadyAt;
  if (action === "special") return now >= runtime.specialReadyAt;
  return true;
}

export function setDefense(
  state: CombatState,
  side: CombatSide,
  active: boolean,
  now: number,
): CombatTransition {
  const advanced = advanceCombat(state, now);
  const next = advanced.state;
  const events = [...advanced.events];
  const runtime = getRuntime(next, side);

  if (!active) {
    runtime.isDefending = false;
    return { state: next, events, accepted: true };
  }

  if (!canPerformAction(next, side, "defend", now)) {
    return { state: next, events, accepted: false };
  }

  runtime.isDefending = true;
  runtime.comboStep = 0;
  runtime.comboExpiresAt = 0;
  pushEvent(next, events, {
    at: now,
    type: "defend",
    actor: side,
    action: "defend",
    message: `${getFighter(runtime.fighterId).name} se met en garde`,
  });

  return { state: next, events, accepted: true };
}

export function performCombatAction(
  state: CombatState,
  side: CombatSide,
  action: Exclude<CombatAction, "defend">,
  now: number,
  rng: CombatRng = Math.random,
): CombatTransition {
  const advanced = advanceCombat(state, now);
  const next = advanced.state;
  const events = [...advanced.events];
  const actor = getRuntime(next, side);
  const targetSide = otherSide(side);
  const fighter = getFighter(actor.fighterId);

  if (!canPerformAction(next, side, action, now)) {
    pushEvent(next, events, {
      at: now,
      type: "unavailable",
      actor: side,
      action,
      message: `${action === "special" ? fighter.special.name : action.toUpperCase()} indisponible`,
    });
    return { state: next, events, accepted: false };
  }

  actor.isDefending = false;

  if (action === "dodge") {
    actor.comboStep = 0;
    actor.comboExpiresAt = 0;
    actor.invulnerableUntil = now + calculateDodgeInvulnerabilityMs(fighter.stats.speed);
    actor.dodgeReadyAt = now + calculateDodgeCooldownMs(fighter.stats.speed);
    actor.recoveryUntil = now + 260;
    pushEvent(next, events, {
      at: now,
      type: "dodge",
      actor: side,
      action: "dodge",
      message: `${fighter.name} esquive`,
    });
    return { state: next, events, accepted: true };
  }

  if (action === "special") {
    actor.comboStep = 0;
    actor.comboExpiresAt = 0;
    actor.specialReadyAt = now + fighter.special.cooldownMs;

    if (actor.fighterId === "korsair") {
      actor.counterUntil = now + COUNTER_WINDOW_MS;
      actor.counterFallbackPending = true;
      actor.recoveryUntil = now + COUNTER_RECOVERY_MS;
      pushEvent(next, events, {
        at: now,
        type: "counter-ready",
        actor: side,
        action: "special",
        message: `${fighter.special.name} · fenêtre de contre`,
      });
      return { state: next, events, accepted: true };
    }

    if (actor.fighterId === "petoux") {
      actor.armorUntil = now + PETOUX_ARMOR_MS;
    }

    const recovery = calculateAttackRecoveryMs(fighter.stats.speed) + 180;
    actor.recoveryUntil = now + recovery;
    pushEvent(next, events, {
      at: now,
      type: "special",
      actor: side,
      target: targetSide,
      action: "special",
      message: fighter.special.name,
    });

    const result = applyDamage(
      next,
      side,
      targetSide,
      fighter.special.damageMultiplier,
      now,
      rng,
      events,
      { special: true },
    );

    if (!result.hit && actor.fighterId === "kavaleur") {
      actor.recoveryUntil = Math.max(actor.recoveryUntil, now + 700);
    }

    return { state: next, events, accepted: true };
  }

  const comboIndex = actor.comboExpiresAt >= now ? actor.comboStep : 0;
  const moveMultiplier = BASIC_COMBO_MULTIPLIERS[comboIndex];
  const nextStep = (comboIndex + 1) as 1 | 2 | 3;
  const recovery = calculateAttackRecoveryMs(fighter.stats.speed) + (nextStep === 3 ? 110 : 0);
  actor.recoveryUntil = now + recovery;

  pushEvent(next, events, {
    at: now,
    type: "attack",
    actor: side,
    target: targetSide,
    action: "attack",
    message: `${fighter.name} · HIT ${nextStep}`,
  });

  const result = applyDamage(next, side, targetSide, moveMultiplier, now, rng, events);

  if (result.hit) {
    actor.comboStep = nextStep === 3 ? 0 : (nextStep as 1 | 2);
    actor.comboExpiresAt = nextStep === 3 ? 0 : now + COMBO_WINDOW_MS;
  } else {
    actor.comboStep = 0;
    actor.comboExpiresAt = 0;
  }

  return { state: next, events, accepted: true };
}

export function getRemainingTimeMs(state: CombatState): number {
  return Math.max(0, state.durationMs - (state.now - state.startedAt));
}

export function getHealthPercent(runtime: FighterCombatState): number {
  return runtime.maxHp <= 0 ? 0 : Math.max(0, Math.min(100, (runtime.hp / runtime.maxHp) * 100));
}

export function getGuardPercent(runtime: FighterCombatState): number {
  return runtime.maxGuard <= 0
    ? 0
    : Math.max(0, Math.min(100, (runtime.guard / runtime.maxGuard) * 100));
}
