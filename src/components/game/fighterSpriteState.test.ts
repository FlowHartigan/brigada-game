import { describe, expect, it } from "vitest";
import {
  createCombatState,
  performCombatAction,
  setDefense,
  startJump,
} from "@/game/engine/combat";
import { resolveFighterSpriteState } from "./fighterSpriteState";

function closeRange<T extends ReturnType<typeof createCombatState>>(state: T): T {
  state.player.x = 0.44;
  state.opponent.x = 0.56;
  state.player.facing = 1;
  state.opponent.facing = -1;
  return state;
}

describe("resolveFighterSpriteState", () => {
  it("tracks the three real combo hits without changing engine timing", () => {
    let state = closeRange(createCombatState("hartz", "petoux", 1_000));

    let transition = performCombatAction(state, "player", "attack", 1_010, () => 0.5);
    state = transition.state;
    expect(resolveFighterSpriteState(state, "player")).toBe("attack1");
    expect(resolveFighterSpriteState(state, "opponent")).toBe("hit");

    const hit2At = state.player.recoveryUntil + 1;
    transition = performCombatAction(state, "player", "attack", hit2At, () => 0.5);
    state = transition.state;
    expect(resolveFighterSpriteState(state, "player")).toBe("attack2");

    const hit3At = state.player.recoveryUntil + 1;
    transition = performCombatAction(state, "player", "attack", hit3At, () => 0.5);
    state = transition.state;
    expect(resolveFighterSpriteState(state, "player")).toBe("attack3");
  });

  it("projects defend, dodge, special, hit and stunned for either side", () => {
    const start = 10_000;

    let state = closeRange(createCombatState("nexmos", "kavaleur", start));
    state = setDefense(state, "opponent", true, start + 5).state;
    expect(resolveFighterSpriteState(state, "opponent")).toBe("defend");

    state = closeRange(createCombatState("nexmos", "kavaleur", start));
    state = performCombatAction(state, "opponent", "dodge", start + 5, () => 0.5).state;
    expect(resolveFighterSpriteState(state, "opponent")).toBe("dodge");

    state = closeRange(createCombatState("nexmos", "kavaleur", start));
    state = {
      ...state,
      opponent: { ...state.opponent, specialReadyAt: start },
    };
    state = performCombatAction(state, "opponent", "special", start + 5, () => 0.5).state;
    expect(resolveFighterSpriteState(state, "opponent")).toBe("special");
    expect(resolveFighterSpriteState(state, "player")).toBe("hit");

    state = closeRange(createCombatState("nexmos", "kavaleur", start));
    state = {
      ...state,
      now: start + 20,
      player: { ...state.player, stunnedUntil: start + 500 },
    };
    expect(resolveFighterSpriteState(state, "player")).toBe("stunned");
  });

  it("projects engine-owned airborne state as jump and returns idle after landing state", () => {
    const start = 20_000;
    let state = createCombatState("hartz", "korsair", start);
    state = startJump(state, "player", start + 1).state;

    expect(resolveFighterSpriteState(state, "player")).toBe("jump");

    state = {
      ...state,
      now: start + 900,
      player: {
        ...state.player,
        y: 0,
        velocityY: 0,
        isGrounded: true,
      },
    };
    expect(resolveFighterSpriteState(state, "player")).toBe("idle");
  });

  it("keeps explicit hit/stun priorities above jump", () => {
    const start = 30_000;
    let state = createCombatState("hartz", "korsair", start);
    state = startJump(state, "player", start + 1).state;
    state = {
      ...state,
      now: start + 20,
      player: { ...state.player, stunnedUntil: start + 500 },
    };

    expect(resolveFighterSpriteState(state, "player")).toBe("stunned");
  });

  it("uses the jump frame for HARTZ on the opponent side", () => {
    const state = startJump(createCombatState("korsair", "hartz", 0), "opponent", 1).state;
    expect(resolveFighterSpriteState(state, "opponent")).toBe("jump");
  });

  it.each(["petoux", "nexmos", "kavaleur", "korsair"] as const)(
    "preserves %s's existing airborne presentation",
    (id) => {
      const state = startJump(createCombatState(id, "hartz", 0), "player", 1).state;
      expect(state.player.isGrounded).toBe(false);
      expect(resolveFighterSpriteState(state, "player")).toBe("idle");
    },
  );

  it("returns idle when no transient visual state is active", () => {
    const state = createCombatState("korsair", "petoux", 0);
    expect(resolveFighterSpriteState(state, "player")).toBe("idle");
    expect(resolveFighterSpriteState(state, "opponent")).toBe("idle");
  });
});
