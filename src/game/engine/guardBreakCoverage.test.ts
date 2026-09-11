import { describe, expect, it } from "vitest";
import { fighters } from "@/game/data/fighters";
import {
  createCombatState,
  performCombatAction,
  setDefense,
} from "@/game/engine/combat";
import type { FighterId } from "@/game/engine/types";

const fixedRng = () => 0.5;

describe("guard break coverage", () => {
  it("can guard-break and stun every fighter archetype", () => {
    for (const defender of fighters) {
      const attackerId: FighterId = defender.id === "nexmos" ? "hartz" : "nexmos";
      let state = createCombatState(attackerId, defender.id, 0);
      state = setDefense(state, "opponent", true, 0).state;

      let now = 100;
      for (let index = 0; index < 10 && state.opponent.guard > 0; index += 1) {
        state = performCombatAction(state, "player", "attack", now, fixedRng).state;
        now += 700;
      }

      expect(state.opponent.guard, defender.name).toBe(0);
      expect(state.opponent.stunnedUntil, defender.name).toBeGreaterThan(state.now);
      expect(state.opponent.isDefending, defender.name).toBe(false);
      expect(
        state.recentEvents.some((event) => event.type === "guard-break"),
        defender.name,
      ).toBe(true);
    }
  });
});
