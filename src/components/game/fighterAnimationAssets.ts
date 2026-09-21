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

export const FIGHTER_ACTION_STATES: readonly FighterActionVisualState[] = [
  "attack1",
  "attack2",
  "attack3",
  "defend",
  "dodge",
  "special",
  "hit",
  "stunned",
  "win",
];

export const FIGHTER_SPRITE_STATES: readonly FighterSpriteState[] = [
  "idle",
  "jump",
  ...FIGHTER_ACTION_STATES,
];

const FIGHTER_SPRITE_STATES_WITHOUT_JUMP = FIGHTER_SPRITE_STATES.filter(
  (state) => state !== "jump",
);

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

/** Resolve the authoritative source image for any runtime sprite state. */
export function fighterSpriteImage(
  id: FighterId,
  state: FighterSpriteState,
): string {
  if (state === "idle") return fighterAssetManifest[id].idle;
  if (state === "jump") return fighterJumpImage(id);
  return fighterActionImage(id, state);
}

/**
 * Avoid creating a second Phaser texture for the idle PNG when a fighter has
 * no dedicated jump artwork. The state resolver already keeps those fighters
 * on idle while airborne.
 */
export function fighterPreloadStates(
  id: FighterId,
): readonly FighterSpriteState[] {
  return fighterJumpImage(id) === fighterAssetManifest[id].idle
    ? FIGHTER_SPRITE_STATES_WITHOUT_JUMP
    : FIGHTER_SPRITE_STATES;
}
