import type { FighterStats } from "@/game/engine/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateMaxHp(vitality: number): number {
  return Math.round(700 + vitality * 6);
}

export function calculateBaseAttackPower(strength: number): number {
  return 22 + strength * 0.32;
}

export function calculateDefenseMultiplier(defense: number): number {
  const reduction = Math.min(0.45, defense * 0.004);
  return 1 - reduction;
}

export function calculateGuardCapacity(defense: number): number {
  return Math.round(100 + defense * 0.4);
}

export function calculateAttackRecoveryMs(speed: number): number {
  return Math.round(clamp(520 - speed * 2.2, 260, 460));
}

export function calculateDodgeInvulnerabilityMs(speed: number): number {
  return Math.round(clamp(110 + speed * 1.2, 160, 240));
}

export function calculateDodgeCooldownMs(speed: number): number {
  return Math.round(clamp(900 - speed * 3, 560, 780));
}

type DamageInput = {
  attacker: FighterStats;
  defender: FighterStats;
  moveMultiplier?: number;
  variance?: number;
  blocked?: boolean;
};

export function calculateDamage({
  attacker,
  defender,
  moveMultiplier = 1,
  variance = 0,
  blocked = false,
}: DamageInput): number {
  const safeVariance = clamp(variance, -0.05, 0.05);
  const blockMultiplier = blocked ? 0.38 : 1;
  const rawDamage =
    calculateBaseAttackPower(attacker.strength) *
    calculateDefenseMultiplier(defender.defense) *
    moveMultiplier *
    (1 + safeVariance) *
    blockMultiplier;

  return Math.max(1, Math.round(rawDamage));
}

export function calculateGuardDamage(
  attackerStrength: number,
  moveMultiplier = 1,
): number {
  return Math.max(1, Math.round((14 + attackerStrength * 0.18) * moveMultiplier));
}
