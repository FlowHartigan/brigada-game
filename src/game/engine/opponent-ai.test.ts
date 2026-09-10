import { describe, expect, it } from "vitest";
import { createCombatState } from "@/game/engine/combat";
import {
  chooseOpponentAction,
  scoreOpponentActions,
  type RecentPlayerAction,
} from "@/game/engine/opponent-ai";

function scoreOf(
  scores: ReturnType<typeof scoreOpponentActions>,
  action: (typeof scores)[number]["action"],
) {
  return scores.find((candidate) => candidate.action === action)?.score ?? 0;
}

describe("opponent utility AI", () => {
  it("leans more defensive/evasive after repeated player attacks", () => {
    const state = createCombatState("hartz", "nexmos", 0);
    const calm = scoreOpponentActions(state, [], 2_000);
    const pressure: RecentPlayerAction[] = [
      { action: "attack", at: 1_200 },
      { action: "attack", at: 1_500 },
      { action: "attack", at: 1_800 },
      { action: "attack", at: 1_950 },
    ];
    const pressured = scoreOpponentActions(state, pressure, 2_000);

    expect(scoreOf(pressured, "defend")).toBeGreaterThan(scoreOf(calm, "defend"));
    expect(scoreOf(pressured, "dodge")).toBeGreaterThan(scoreOf(calm, "dodge"));
  });

  it("increases pressure after repeated player defense", () => {
    const state = createCombatState("hartz", "petoux", 0);
    const calm = scoreOpponentActions(state, [], 2_000);
    const passive: RecentPlayerAction[] = [
      { action: "defend", at: 1_200 },
      { action: "defend", at: 1_500 },
      { action: "defend", at: 1_900 },
    ];
    const pressured = scoreOpponentActions(state, passive, 2_000);

    expect(scoreOf(pressured, "attack")).toBeGreaterThan(scoreOf(calm, "attack"));
  });

  it("does not choose a special before its cooldown is ready when forced to the high end", () => {
    const state = createCombatState("hartz", "nexmos", 0);
    const scores = scoreOpponentActions(state, [], 1_000);

    expect(scoreOf(scores, "special")).toBe(0);
    expect(chooseOpponentAction(state, [], 1_000, () => 0.999)).not.toBe("special");
  });

  it("waits while the opponent is recovering", () => {
    const state = createCombatState("hartz", "nexmos", 0);
    state.opponent.recoveryUntil = 5_000;

    expect(chooseOpponentAction(state, [], 2_000, () => 0)).toBe("wait");
  });
});
