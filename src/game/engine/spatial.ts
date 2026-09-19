import type { CombatAction } from "@/game/engine/types";

export type Facing = -1 | 1;
export type HorizontalDirection = -1 | 1;
export type AttackProfileKey = "attack1" | "attack2" | "attack3" | "special";

export const ARENA_MIN_X = 0.08;
export const ARENA_MAX_X = 0.92;
export const PLAYER_START_X = 0.28;
export const OPPONENT_START_X = 0.72;
export const FIGHTER_BODY_HALF_WIDTH = 0.045;
export const MIN_FIGHTER_DISTANCE = FIGHTER_BODY_HALF_WIDTH * 2;
export const MOVE_SPEED_PER_SECOND = 0.34;

export const ATTACK_PROFILES: Record<
  AttackProfileKey,
  { width: number; offset: number; activeMs: number }
> = {
  attack1: { width: 0.095, offset: 0.018, activeMs: 120 },
  attack2: { width: 0.11, offset: 0.022, activeMs: 130 },
  attack3: { width: 0.125, offset: 0.028, activeMs: 145 },
  special: { width: 0.145, offset: 0.032, activeMs: 180 },
};

export function facingToward(selfX: number, otherX: number): Facing {
  return otherX >= selfX ? 1 : -1;
}

export function clampArenaX(x: number): number {
  return Math.min(ARENA_MAX_X, Math.max(ARENA_MIN_X, x));
}

export function resolveMovement(params: {
  selfX: number;
  otherX: number;
  direction: HorizontalDirection;
  elapsedMs: number;
}): number {
  const { selfX, otherX, direction } = params;
  const elapsedSeconds = Math.max(0, params.elapsedMs) / 1000;
  let nextX = clampArenaX(selfX + direction * MOVE_SPEED_PER_SECOND * elapsedSeconds);

  if (selfX < otherX && nextX > otherX - MIN_FIGHTER_DISTANCE) {
    nextX = otherX - MIN_FIGHTER_DISTANCE;
  } else if (selfX > otherX && nextX < otherX + MIN_FIGHTER_DISTANCE) {
    nextX = otherX + MIN_FIGHTER_DISTANCE;
  }

  return clampArenaX(nextX);
}

export function attackProfileFor(
  action: CombatAction,
  comboStep: 1 | 2 | 3 = 1,
): AttackProfileKey | null {
  if (action === "special") return "special";
  if (action !== "attack") return null;
  return `attack${comboStep}` as AttackProfileKey;
}

export function attackOverlapsTarget(params: {
  attackerX: number;
  defenderX: number;
  facing: Facing;
  profile: AttackProfileKey;
}): boolean {
  const config = ATTACK_PROFILES[params.profile];
  const hurtMin = params.defenderX - FIGHTER_BODY_HALF_WIDTH;
  const hurtMax = params.defenderX + FIGHTER_BODY_HALF_WIDTH;

  if (params.facing === 1) {
    const hitMin = params.attackerX + FIGHTER_BODY_HALF_WIDTH + config.offset;
    const hitMax = hitMin + config.width;
    return hitMax >= hurtMin && hitMin <= hurtMax;
  }

  const hitMax = params.attackerX - FIGHTER_BODY_HALF_WIDTH - config.offset;
  const hitMin = hitMax - config.width;
  return hitMax >= hurtMin && hitMin <= hurtMax;
}

export function isWithinAttackRange(params: {
  attackerX: number;
  defenderX: number;
  action?: "attack" | "special";
  comboStep?: 1 | 2 | 3;
}): boolean {
  const facing = facingToward(params.attackerX, params.defenderX);
  const profile = attackProfileFor(params.action ?? "attack", params.comboStep ?? 1);
  return profile
    ? attackOverlapsTarget({
        attackerX: params.attackerX,
        defenderX: params.defenderX,
        facing,
        profile,
      })
    : false;
}
