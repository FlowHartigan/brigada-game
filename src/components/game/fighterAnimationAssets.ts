import type { FighterId } from "@/game/engine/types";
import { fighterAssetManifest } from "./fighterAssetManifest";

export type FighterActionVisualState =
  | "attack1"
  | "attack2"
  | "attack3"
  | "defend"
  | "dodge"
  | "special"
  | "hit"
  | "stunned"
  | "win";

export type FighterSpriteState = "idle" | "jump" | FighterActionVisualState;

export function fighterActionImage(
  id: FighterId,
  state: FighterActionVisualState,
): string {
  return fighterAssetManifest[id].actions[state];
}


/**
 * Airborne visual source. HARTZ has a dedicated approved frame; fighters that
 * do not have one yet intentionally retain their existing idle artwork.
 */
export function fighterJumpImage(id: FighterId): string {
  const entry = fighterAssetManifest[id];
  return "jump" in entry && entry.jump ? entry.jump : entry.idle;
}
