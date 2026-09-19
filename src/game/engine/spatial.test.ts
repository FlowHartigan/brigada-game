import { describe, expect, it } from "vitest";
import {
  ARENA_MAX_X,
  ARENA_MIN_X,
  MIN_FIGHTER_DISTANCE,
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
