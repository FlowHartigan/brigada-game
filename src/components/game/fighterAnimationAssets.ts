import type { FighterId } from "@/game/engine/types";
import { hartzActionFrames } from "./animationFrames/hartzActionFrames";
import { petouxActionFrames } from "./animationFrames/petouxActionFrames";
import { nexmosActionFrames } from "./animationFrames/nexmosActionFrames";
import { kavaleurActionFrames } from "./animationFrames/kavaleurActionFrames";
import { korsairActionFrames } from "./animationFrames/korsairActionFrames";

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

const actionFrames = {
  hartz: hartzActionFrames,
  petoux: petouxActionFrames,
  nexmos: nexmosActionFrames,
  kavaleur: kavaleurActionFrames,
  korsair: korsairActionFrames,
} satisfies Record<FighterId, Record<FighterActionVisualState, string>>;

export function fighterActionImage(
  id: FighterId,
  state: FighterActionVisualState,
): string {
  return actionFrames[id][state];
}
