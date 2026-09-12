import type { CombatRng } from "@/game/engine/combat";

declare global {
  interface Window {
    __BRIGADA_COMBAT_RNG__?: CombatRng;
  }
}

/**
 * Browser-facing RNG boundary for match setup, player variance and Utility AI.
 *
 * Production falls back to Math.random(). Browser QA may inject a deterministic
 * source without replacing Math.random globally, which is important because
 * Phaser and other browser libraries use global randomness for internal IDs.
 */
export const runtimeCombatRng: CombatRng = () => {
  if (typeof window !== "undefined" && window.__BRIGADA_COMBAT_RNG__) {
    return window.__BRIGADA_COMBAT_RNG__();
  }

  return Math.random();
};
