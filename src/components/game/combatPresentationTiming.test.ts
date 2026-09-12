import { describe, expect, it } from "vitest";
import type { CombatEventType } from "@/game/engine/combat";
import { impactFreezeDurationMs } from "./combatPresentationTiming";

describe("impactFreezeDurationMs", () => {
  it("adds stronger freezes for heavier presentation events", () => {
    expect(impactFreezeDurationMs("block")).toBeGreaterThan(0);
    expect(impactFreezeDurationMs("hit")).toBeGreaterThan(
      impactFreezeDurationMs("block"),
    );
    expect(impactFreezeDurationMs("guard-break")).toBeGreaterThan(
      impactFreezeDurationMs("hit"),
    );
    expect(impactFreezeDurationMs("ko")).toBeGreaterThan(
      impactFreezeDurationMs("guard-break"),
    );
  });

  it("never freezes non-impact engine events", () => {
    const nonImpactEvents: CombatEventType[] = [
      "attack",
      "miss",
      "dodge",
      "defend",
      "counter-ready",
      "unavailable",
      "timeout",
    ];

    for (const type of nonImpactEvents) {
      expect(impactFreezeDurationMs(type)).toBe(0);
    }
  });
});
