import type { CombatEventType } from "@/game/engine/combat";

const impactFreezeMs: Partial<Record<CombatEventType, number>> = {
  hit: 52,
  block: 30,
  "guard-break": 88,
  special: 64,
  counter: 72,
  armor: 36,
  ko: 120,
};

/**
 * Presentation-only hit-stop. These values never alter engine time, cooldowns,
 * AI cadence or damage resolution; they only hold the Phaser fighter pose for
 * a few frames so impacts read with more weight on a phone screen.
 */
export function impactFreezeDurationMs(type: CombatEventType): number {
  return impactFreezeMs[type] ?? 0;
}
