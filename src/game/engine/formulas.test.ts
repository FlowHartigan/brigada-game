import { describe, expect, it } from "vitest";
import { getFighter } from "@/game/data/fighters";
import {
  calculateAttackRecoveryMs,
  calculateDamage,
  calculateDodgeCooldownMs,
  calculateDodgeInvulnerabilityMs,
  calculateGuardCapacity,
  calculateMaxHp,
} from "@/game/engine/formulas";

describe("combat formulas", () => {
  it("derives max HP from vitality", () => {
    expect(calculateMaxHp(90)).toBe(1240);
    expect(calculateMaxHp(66)).toBe(1096);
  });

  it("makes high defense reduce incoming damage", () => {
    const attacker = getFighter("nexmos").stats;
    const lowerDefense = getFighter("kavaleur").stats;
    const higherDefense = getFighter("korsair").stats;

    expect(
      calculateDamage({ attacker, defender: higherDefense }),
    ).toBeLessThan(calculateDamage({ attacker, defender: lowerDefense }));
  });

  it("reduces HP damage substantially while blocking", () => {
    const attacker = getFighter("hartz").stats;
    const defender = getFighter("nexmos").stats;
    const normal = calculateDamage({ attacker, defender });
    const blocked = calculateDamage({ attacker, defender, blocked: true });

    expect(blocked).toBeLessThan(normal * 0.5);
    expect(blocked).toBeGreaterThan(0);
  });

  it("caps random damage variance to five percent", () => {
    const attacker = getFighter("nexmos").stats;
    const defender = getFighter("petoux").stats;

    const cappedHigh = calculateDamage({ attacker, defender, variance: 1 });
    const fivePercentHigh = calculateDamage({
      attacker,
      defender,
      variance: 0.05,
    });

    expect(cappedHigh).toBe(fivePercentHigh);
  });

  it("makes faster fighters recover and dodge faster", () => {
    const fast = getFighter("kavaleur").stats.speed;
    const slow = getFighter("petoux").stats.speed;

    expect(calculateAttackRecoveryMs(fast)).toBeLessThan(
      calculateAttackRecoveryMs(slow),
    );
    expect(calculateDodgeCooldownMs(fast)).toBeLessThan(
      calculateDodgeCooldownMs(slow),
    );
    expect(calculateDodgeInvulnerabilityMs(fast)).toBeGreaterThan(
      calculateDodgeInvulnerabilityMs(slow),
    );
  });

  it("gives more guard capacity to higher-defense fighters", () => {
    expect(calculateGuardCapacity(78)).toBeGreaterThan(
      calculateGuardCapacity(66),
    );
  });
});
