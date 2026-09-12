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

export type FighterSpriteState = "idle" | FighterActionVisualState;

export function fighterActionImage(
  id: FighterId,
  state: FighterActionVisualState,
): string {
  return fighterAssetManifest[id].actions[state];
}
