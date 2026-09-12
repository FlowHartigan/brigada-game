import type { FighterActionVisualState } from "../fighterAnimationAssets";

const KORSAIR_V2 = "/fighters/korsair-v2";

/**
 * Refreshed KORSAIR action set derived from the approved character sheet.
 * The single approved attack pose is reused across the three combo steps so
 * gameplay timing stays untouched while no legacy visual can reappear.
 */
export const korsairActionFrames: Record<FighterActionVisualState, string> = {
  attack1: `${KORSAIR_V2}/attack.png`,
  attack2: `${KORSAIR_V2}/attack.png`,
  attack3: `${KORSAIR_V2}/attack.png`,
  defend: `${KORSAIR_V2}/defend.png`,
  dodge: `${KORSAIR_V2}/dodge.png`,
  special: `${KORSAIR_V2}/special.png`,
  hit: `${KORSAIR_V2}/hit.png`,
  stunned: `${KORSAIR_V2}/hit.png`,
  win: `${KORSAIR_V2}/win.png`,
};
