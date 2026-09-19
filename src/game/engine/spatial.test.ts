import { describe, expect, it } from "vitest";
import {
  ARENA_MAX_X,
  ARENA_MIN_X,
  BASE_GRAVITY,
  BASE_JUMP_VELOCITY,
  GRAVITY,
  GROUND_Y,
  JUMP_HEIGHT_MULTIPLIER,
  JUMP_VELOCITY,
  MIN_FIGHTER_DISTANCE,
  advanceJump,
  attackOverlapsTarget,
  facingToward,
  resolveMovement,
} from "@/game/engine/spatial";

describe("spatial combat", () => {
  it("moves frame-independently and clamps to arena bounds", () => {
    const half = resolveMovement({ selfX: 0.2, otherX: 0.8, direction: -1, elapsedMs: 500 });
    const full = resolveMovement({ selfX: 0.2, otherX: 0.8, direction: -1, elapsedMs: 1_000 });
    expect(half).toBeGreaterThanOrEqual(ARENA_MIN_X);
    expect(full).toBe(ARENA_MIN_X);
    expect(resolveMovement({ selfX: 0.85, otherX: 0.2, direction: 1, elapsedMs: 1_000 })).toBe(ARENA_MAX_X);
  });

  it("prevents fighters from crossing", () => {
    const next = resolveMovement({ selfX: 0.4, otherX: 0.5, direction: 1, elapsedMs: 1_000 });
    expect(next).toBeCloseTo(0.5 - MIN_FIGHTER_DISTANCE);
  });

  it("raises the jump apex by 30 percent while preserving theoretical airtime", () => {
    const previousPeak =
      (BASE_JUMP_VELOCITY * BASE_JUMP_VELOCITY) / (2 * BASE_GRAVITY);
    const newPeak = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY);
    const previousDuration = (2 * BASE_JUMP_VELOCITY) / BASE_GRAVITY;
    const newDuration = (2 * JUMP_VELOCITY) / GRAVITY;

    expect(JUMP_HEIGHT_MULTIPLIER).toBe(1.3);
    expect(newPeak / previousPeak).toBeCloseTo(1.3, 10);
    expect(newDuration / previousDuration).toBeCloseTo(1, 10);
  });

  it("reaches the scaled apex in the real integrator without becoming floaty", () => {
    const previousPeak =
      (BASE_JUMP_VELOCITY * BASE_JUMP_VELOCITY) / (2 * BASE_GRAVITY);
    const previousDurationMs = (2 * BASE_JUMP_VELOCITY * 1000) / BASE_GRAVITY;

    let y = GROUND_Y;
    let velocityY = JUMP_VELOCITY;
    let peak = y;
    let elapsedMs = 0;

    for (let step = 0; step < 2_000; step += 1) {
      const next = advanceJump(y, velocityY, 1);
      elapsedMs += 1;
      y = next.y;
      velocityY = next.velocityY;
      peak = Math.max(peak, y);
      if (next.isGrounded) break;
    }

    expect(peak / previousPeak).toBeGreaterThanOrEqual(1.27);
    expect(peak / previousPeak).toBeLessThanOrEqual(1.33);
    expect(elapsedMs / previousDurationMs).toBeGreaterThanOrEqual(0.95);
    expect(elapsedMs / previousDurationMs).toBeLessThanOrEqual(1.05);
    expect(y).toBe(GROUND_Y);
    expect(velocityY).toBe(0);
  });

  it("follows a gravity-driven jump arc and lands exactly on ground", () => {
    let y = GROUND_Y;
    let velocityY = JUMP_VELOCITY;
    let peak = y;
    let grounded = false;

    for (let step = 0; step < 80; step += 1) {
      const next = advanceJump(y, velocityY, 16);
      y = next.y;
      velocityY = next.velocityY;
      peak = Math.max(peak, y);
      if (next.isGrounded) {
        grounded = true;
        break;
      }
    }

    expect(peak).toBeGreaterThan(0.2);
    expect(grounded).toBe(true);
    expect(y).toBe(GROUND_Y);
    expect(velocityY).toBe(0);
  });

  it("does not accumulate ground drift across repeated jumps", () => {
    for (let jump = 0; jump < 40; jump += 1) {
      let y = GROUND_Y;
      let velocityY = JUMP_VELOCITY;
      for (let step = 0; step < 100; step += 1) {
        const next = advanceJump(y, velocityY, 16);
        y = next.y;
        velocityY = next.velocityY;
        if (next.isGrounded) break;
      }
      expect(y).toBe(GROUND_Y);
      expect(velocityY).toBe(0);
    }
  });

  it("allows horizontal crossing only when fighters no longer overlap vertically", () => {
    const blocked = resolveMovement({
      selfX: 0.4,
      otherX: 0.5,
      selfY: 0,
      otherY: 0,
      direction: 1,
      elapsedMs: 1_000,
    });
    const airborne = resolveMovement({
      selfX: 0.4,
      otherX: 0.5,
      selfY: 0.24,
      otherY: 0,
      direction: 1,
      elapsedMs: 1_000,
    });

    expect(blocked).toBeCloseTo(0.5 - MIN_FIGHTER_DISTANCE);
    expect(airborne).toBeGreaterThan(0.5);
  });

  it("uses vertical hitbox overlap instead of jump invulnerability", () => {
    expect(attackOverlapsTarget({
      attackerX: 0.4,
      attackerY: 0,
      defenderX: 0.55,
      defenderY: 0,
      facing: 1,
      profile: "attack1",
    })).toBe(true);

    expect(attackOverlapsTarget({
      attackerX: 0.4,
      attackerY: 0,
      defenderX: 0.55,
      defenderY: 0.22,
      facing: 1,
      profile: "attack1",
    })).toBe(false);
  });

  it("mirrors attack hitboxes with facing", () => {
    expect(facingToward(0.4, 0.6)).toBe(1);
    expect(facingToward(0.6, 0.4)).toBe(-1);
    expect(attackOverlapsTarget({ attackerX: 0.4, defenderX: 0.55, facing: 1, profile: "attack1" })).toBe(true);
    expect(attackOverlapsTarget({ attackerX: 0.6, defenderX: 0.45, facing: -1, profile: "attack1" })).toBe(true);
  });

  it("misses when the target is outside the configured hitbox", () => {
    expect(attackOverlapsTarget({ attackerX: 0.28, defenderX: 0.72, facing: 1, profile: "special" })).toBe(false);
  });
});
