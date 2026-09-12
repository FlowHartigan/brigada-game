import type { FighterActionVisualState } from "../fighterAnimationAssets";

const KAVALEUR_V2 = "/fighters/kavaleur-v2";

/**
 * Refreshed KAVALEUR action set derived from the approved character sheet.
 * The single approved attack pose is reused across the three combo steps so
 * gameplay timing stays untouched while no legacy visual can reappear.
 */
export const kavaleurActionFrames: Record<FighterActionVisualState, string> = {
  attack1: `${KAVALEUR_V2}/attack.png`,
  attack2: `${KAVALEUR_V2}/attack.png`,
  attack3: `${KAVALEUR_V2}/attack.png`,
  defend: `${KAVALEUR_V2}/defend.png`,
  dodge: `${KAVALEUR_V2}/dodge.png`,
  special: `${KAVALEUR_V2}/special.png`,
  hit: `${KAVALEUR_V2}/hit.png`,
  stunned: `${KAVALEUR_V2}/hit.png`,
  win: `${KAVALEUR_V2}/win.png`,
};
