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

const fighterPreloadStatesCache = new Map<FighterId, readonly FighterSpriteState[]>();

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
 * Phaser only needs one decoded texture per unique source image. Some approved
 * fighter packs intentionally reuse one PNG for multiple presentation states
 * (for example one attack pose across the three combo steps).
 */
export function fighterPreloadStates(
  id: FighterId,
): readonly FighterSpriteState[] {
  const cached = fighterPreloadStatesCache.get(id);
  if (cached) return cached;

  const seenSources = new Set<string>();
  const states = FIGHTER_SPRITE_STATES.filter((state) => {
    const source = fighterSpriteImage(id, state);
    if (seenSources.has(source)) return false;
    seenSources.add(source);
    return true;
  });

  fighterPreloadStatesCache.set(id, states);
  return states;
}

/** Return the first state that owns the same decoded source texture. */
export function fighterCanonicalSpriteState(
  id: FighterId,
  state: FighterSpriteState,
): FighterSpriteState {
  const source = fighterSpriteImage(id, state);
  return (
    fighterPreloadStates(id).find(
      (candidate) => fighterSpriteImage(id, candidate) === source,
    ) ?? state
  );
}
