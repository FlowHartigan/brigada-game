import { describe, expect, it } from "vitest";
import {
  ARENA_MAX_X,
  ARENA_MIN_X,
  GROUND_Y,
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
