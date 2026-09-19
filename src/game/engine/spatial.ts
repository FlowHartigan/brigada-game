import type { CombatAction } from "@/game/engine/types";

export type Facing = -1 | 1;
export type HorizontalDirection = -1 | 1;
export type AttackProfileKey = "attack1" | "attack2" | "attack3" | "special";

export const ARENA_MIN_X = 0.08;
export const ARENA_MAX_X = 0.92;
export const PLAYER_START_X = 0.28;
export const OPPONENT_START_X = 0.72;
export const GROUND_Y = 0;
export const FIGHTER_BODY_HALF_WIDTH = 0.045;
export const FIGHTER_BODY_HEIGHT = 0.22;
export const MIN_FIGHTER_DISTANCE = FIGHTER_BODY_HALF_WIDTH * 2;
export const MOVE_SPEED_PER_SECOND = 0.34;
export const JUMP_VELOCITY = 1.2;
export const GRAVITY = 2.85;

export type AttackProfile = {
  width: number;
  height: number;
  offset: number;
  offsetY: number;
  activeMs: number;
};

export const ATTACK_PROFILES: Record<AttackProfileKey, AttackProfile> = {
  attack1: { width: 0.095, height: 0.12, offset: 0.018, offsetY: 0.055, activeMs: 120 },
  attack2: { width: 0.11, height: 0.135, offset: 0.022, offsetY: 0.05, activeMs: 130 },
  attack3: { width: 0.125, height: 0.15, offset: 0.028, offsetY: 0.045, activeMs: 145 },
  special: { width: 0.145, height: 0.17, offset: 0.032, offsetY: 0.035, activeMs: 180 },
};

export function facingToward(selfX: number, otherX: number): Facing {
  return otherX >= selfX ? 1 : -1;
}

export function clampArenaX(x: number): number {
  return Math.min(ARENA_MAX_X, Math.max(ARENA_MIN_X, x));
}

export function bodiesOverlapVertically(
  firstY: number,
  secondY: number,
  bodyHeight = FIGHTER_BODY_HEIGHT,
): boolean {
  const firstMin = firstY;
  const firstMax = firstY + bodyHeight;
  const secondMin = secondY;
  const secondMax = secondY + bodyHeight;
  return firstMax > secondMin && firstMin < secondMax;
}

export function resolveMovement(params: {
  selfX: number;
  otherX: number;
  selfY?: number;
  otherY?: number;
  direction: HorizontalDirection;
  elapsedMs: number;
}): number {
  const {
    selfX,
    otherX,
    selfY = GROUND_Y,
    otherY = GROUND_Y,
    direction,
  } = params;
  const elapsedSeconds = Math.max(0, params.elapsedMs) / 1000;
  let nextX = clampArenaX(selfX + direction * MOVE_SPEED_PER_SECOND * elapsedSeconds);

  if (!bodiesOverlapVertically(selfY, otherY)) {
    return nextX;
  }

  if (selfX < otherX && nextX > otherX - MIN_FIGHTER_DISTANCE) {
    nextX = otherX - MIN_FIGHTER_DISTANCE;
  } else if (selfX > otherX && nextX < otherX + MIN_FIGHTER_DISTANCE) {
    nextX = otherX + MIN_FIGHTER_DISTANCE;
  }

  return clampArenaX(nextX);
}

export function advanceJump(
  y: number,
  velocityY: number,
  elapsedMs: number,
): { y: number; velocityY: number; isGrounded: boolean; landed: boolean } {
  if (elapsedMs <= 0) {
    return {
      y,
      velocityY,
      isGrounded: y <= GROUND_Y && velocityY <= 0,
      landed: false,
    };
  }

  const dt = elapsedMs / 1000;
  const nextVelocity = velocityY - GRAVITY * dt;
  const nextY = y + velocityY * dt - 0.5 * GRAVITY * dt * dt;

  if (nextY <= GROUND_Y && nextVelocity <= 0) {
    return {
      y: GROUND_Y,
      velocityY: 0,
      isGrounded: true,
      landed: y > GROUND_Y || velocityY !== 0,
    };
  }

  return {
    y: nextY,
    velocityY: nextVelocity,
    isGrounded: false,
    landed: false,
  };
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
  attackerY?: number;
  defenderX: number;
  defenderY?: number;
  facing: Facing;
  profile: AttackProfileKey;
}): boolean {
  const config = ATTACK_PROFILES[params.profile];
  const attackerY = params.attackerY ?? GROUND_Y;
  const defenderY = params.defenderY ?? GROUND_Y;
  const hurtMinX = params.defenderX - FIGHTER_BODY_HALF_WIDTH;
  const hurtMaxX = params.defenderX + FIGHTER_BODY_HALF_WIDTH;
  const hurtMinY = defenderY;
  const hurtMaxY = defenderY + FIGHTER_BODY_HEIGHT;
  const hitMinY = attackerY + config.offsetY;
  const hitMaxY = hitMinY + config.height;
  const verticalOverlap = hitMaxY >= hurtMinY && hitMinY <= hurtMaxY;

  if (!verticalOverlap) return false;

  if (params.facing === 1) {
    const hitMinX = params.attackerX + FIGHTER_BODY_HALF_WIDTH + config.offset;
    const hitMaxX = hitMinX + config.width;
    return hitMaxX >= hurtMinX && hitMinX <= hurtMaxX;
  }

  const hitMaxX = params.attackerX - FIGHTER_BODY_HALF_WIDTH - config.offset;
  const hitMinX = hitMaxX - config.width;
  return hitMaxX >= hurtMinX && hitMinX <= hurtMaxX;
}

export function isWithinAttackRange(params: {
  attackerX: number;
  attackerY?: number;
  defenderX: number;
  defenderY?: number;
  action?: "attack" | "special";
  comboStep?: 1 | 2 | 3;
}): boolean {
  const facing = facingToward(params.attackerX, params.defenderX);
  const profile = attackProfileFor(params.action ?? "attack", params.comboStep ?? 1);
  return profile
    ? attackOverlapsTarget({
        attackerX: params.attackerX,
        attackerY: params.attackerY,
        defenderX: params.defenderX,
        defenderY: params.defenderY,
        facing,
        profile,
      })
    : false;
}
