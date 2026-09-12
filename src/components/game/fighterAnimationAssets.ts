import type { FighterId } from "@/game/engine/types";
import { hartzActionFrames } from "./animationFrames/hartzActionFrames";
import { petouxActionFrames } from "./animationFrames/petouxActionFrames";
import { nexmosActionFrames } from "./animationFrames/nexmosActionFrames";
import { kavaleurActionFrames } from "./animationFrames/kavaleurActionFrames";

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

type FrameAnimatedFighterId = Exclude<FighterId, "korsair">;

const actionFrames = {
  hartz: hartzActionFrames,
  petoux: petouxActionFrames,
  nexmos: nexmosActionFrames,
  kavaleur: kavaleurActionFrames,
} satisfies Record<
  FrameAnimatedFighterId,
  Record<FighterActionVisualState, string>
>;

function korsairActionFallback(state: FighterActionVisualState): string {
  // KORSAIR's generated WebP action package currently contains invalid image
  // payloads in Chromium. Keep the approved standalone artwork and a unique
  // state URL so combat semantics and state-driven CSS feedback remain intact
  // without loading a corrupt data URL.
  return `/fighters/korsair.png#combat-${state}`;
}

export function fighterActionImage(
  id: FighterId,
  state: FighterActionVisualState,
): string {
  if (id === "korsair") return korsairActionFallback(state);
  return actionFrames[id][state];
}
