import { describe, expect, it } from "vitest";
import {
  advanceCombat,
  canPerformAction,
  createCombatState,
  getHealthPercent,
  performCombatAction,
  setDefense,
} from "@/game/engine/combat";

const fixedRng = () => 0.5;

describe("combat state machine", () => {
  it("creates two distinct fighters at full health and guard", () => {
    const state = createCombatState("hartz", "nexmos", 1_000);

    expect(state.player.hp).toBe(state.player.maxHp);
    expect(state.opponent.hp).toBe(state.opponent.maxHp);
    expect(state.player.guard).toBe(state.player.maxGuard);
    expect(state.status).toBe("active");
  });

  it("rejects mirror matches", () => {
    expect(() => createCombatState("hartz", "hartz")).toThrow();
  });

  it("applies deterministic damage and attack recovery", () => {
    const state = createCombatState("nexmos", "korsair", 0);
    const transition = performCombatAction(state, "player", "attack", 100, fixedRng);

    expect(transition.accepted).toBe(true);
    expect(transition.state.opponent.hp).toBeLessThan(state.opponent.hp);
    expect(transition.state.player.recoveryUntil).toBeGreaterThan(100);
    expect(transition.events.some((event) => event.type === "hit")).toBe(true);
  });

  it("blocks most HP damage while consuming guard", () => {
    const initial = createCombatState("nexmos", "petoux", 0);
    const defended = setDefense(initial, "opponent", true, 100).state;
    const transition = performCombatAction(defended, "player", "attack", 100, fixedRng);

    expect(transition.state.opponent.hp).toBeLessThan(initial.opponent.hp);
    expect(transition.state.opponent.guard).toBeLessThan(initial.opponent.guard);
    expect(transition.events.some((event) => event.type === "block")).toBe(true);
  });

  it("breaks guard and stuns a defender after enough blocked pressure", () => {
    let state = createCombatState("nexmos", "kavaleur", 0);
    state = setDefense(state, "opponent", true, 0).state;

    let now = 100;
    for (let index = 0; index < 8 && state.opponent.guard > 0; index += 1) {
      state = performCombatAction(state, "player", "attack", now, fixedRng).state;
      now += 700;
    }

    expect(state.opponent.guard).toBe(0);
    expect(state.opponent.stunnedUntil).toBeGreaterThan(state.now);
    expect(state.opponent.isDefending).toBe(false);
  });

  it("makes a dodge negate an attack during its invulnerability window", () => {
    let state = createCombatState("hartz", "kavaleur", 0);
    state = performCombatAction(state, "opponent", "dodge", 100, fixedRng).state;
    const hpBefore = state.opponent.hp;
    const transition = performCombatAction(state, "player", "attack", 150, fixedRng);

    expect(transition.state.opponent.hp).toBe(hpBefore);
    expect(transition.events.some((event) => event.type === "miss")).toBe(true);
  });

  it("enforces dodge and special cooldowns", () => {
    let state = createCombatState("hartz", "nexmos", 0);

    expect(canPerformAction(state, "player", "special", 1_000)).toBe(false);
    state = performCombatAction(state, "player", "dodge", 100, fixedRng).state;
    expect(canPerformAction(state, "player", "dodge", 400)).toBe(false);
  });

  it("gives HARTZ extra guard pressure on a blocked special", () => {
    let normalState = createCombatState("hartz", "petoux", 0);
    normalState = setDefense(normalState, "opponent", true, 8_000).state;
    const normal = performCombatAction(normalState, "player", "attack", 8_000, fixedRng);
    const normalGuardLoss = normalState.opponent.guard - normal.state.opponent.guard;

    let specialState = createCombatState("hartz", "petoux", 0);
    specialState = setDefense(specialState, "opponent", true, 8_000).state;
    const special = performCombatAction(specialState, "player", "special", 8_000, fixedRng);
    const specialGuardLoss = specialState.opponent.guard - special.state.opponent.guard;

    expect(specialGuardLoss).toBeGreaterThan(normalGuardLoss);
  });

  it("lets KORSAIR counter an incoming strike during Contretemps", () => {
    let state = createCombatState("nexmos", "korsair", 0);
    state = performCombatAction(state, "opponent", "special", 8_000, fixedRng).state;
    const playerHpBefore = state.player.hp;
    const opponentHpBefore = state.opponent.hp;
    const transition = performCombatAction(state, "player", "attack", 8_100, fixedRng);

    expect(transition.state.player.hp).toBeLessThan(playerHpBefore);
    expect(transition.state.opponent.hp).toBe(opponentHpBefore);
    expect(transition.events.some((event) => event.type === "counter")).toBe(true);
  });

  it("gives KORSAIR a weaker fallback when the counter window expires", () => {
    let state = createCombatState("hartz", "korsair", 0);
    state = performCombatAction(state, "opponent", "special", 8_000, fixedRng).state;
    const playerHpBefore = state.player.hp;
    const transition = advanceCombat(state, 8_600);

    expect(transition.state.player.hp).toBeLessThan(playerHpBefore);
    expect(transition.state.opponent.counterFallbackPending).toBe(false);
  });

  it("reduces damage received while PETOUX special armor is active", () => {
    let armored = createCombatState("hartz", "petoux", 0);
    armored = performCombatAction(armored, "opponent", "special", 8_000, fixedRng).state;
    const armoredBefore = armored.opponent.hp;
    const armoredHit = performCombatAction(armored, "player", "attack", 8_100, fixedRng);
    const armoredLoss = armoredBefore - armoredHit.state.opponent.hp;

    let plain = createCombatState("hartz", "petoux", 0);
    const plainBefore = plain.opponent.hp;
    const plainHit = performCombatAction(plain, "player", "attack", 8_100, fixedRng);
    const plainLoss = plainBefore - plainHit.state.opponent.hp;

    expect(armoredLoss).toBeLessThan(plainLoss);
  });

  it("resolves a timeout by remaining health percentage", () => {
    let state = createCombatState("hartz", "petoux", 0, 1_000);
    state = performCombatAction(state, "player", "attack", 100, fixedRng).state;
    const transition = advanceCombat(state, 1_000);

    expect(transition.state.status).toBe("finished");
    expect(transition.state.endReason).toBe("timeout");
    expect(transition.state.winner).toBe("player");
    expect(getHealthPercent(transition.state.player)).toBeGreaterThan(
      getHealthPercent(transition.state.opponent),
    );
  });
});
