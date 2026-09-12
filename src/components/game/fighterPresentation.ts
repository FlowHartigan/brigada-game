import type { CSSProperties } from "react";
import type { FighterId } from "@/game/engine/types";

export type FighterArtContext = "card" | "showcase" | "vs" | "combat" | "result";

type FighterArtAdjustment = {
  scale: number;
  y: number;
};

export type FighterCombatPresentation = {
  /** Uniform multiplier applied after the visible-alpha-height normalization. */
  scale: number;
  /** Small presentation-only adjustment in stage pixels. */
  offsetX: number;
  /** Small presentation-only adjustment in stage pixels. */
  offsetY: number;
};

type FighterSourceBounds = {
  frameHeight: number;
  visibleHeight: number;
  bottomPadding: number;
};

/**
 * These bounds were measured from the alpha channel of the approved idle PNGs.
 * They are only used by the React fallback; Phaser measures its loaded texture
 * at runtime so it also stays correct for action frames.
 */
const fighterSourceBounds: Record<FighterId, FighterSourceBounds> = {
  hartz: { frameHeight: 128, visibleHeight: 75, bottomPadding: 4 },
  petoux: { frameHeight: 74, visibleHeight: 74, bottomPadding: 0 },
  nexmos: { frameHeight: 128, visibleHeight: 73, bottomPadding: 4 },
  kavaleur: { frameHeight: 150, visibleHeight: 145, bottomPadding: 0 },
  korsair: { frameHeight: 128, visibleHeight: 124, bottomPadding: 2 },
};

export const FIGHTER_COMBAT_SCALE = 1.3;
const FALLBACK_VISIBLE_HEIGHT_RATIO = 0.72;

/**
 * Single combat presentation map. The same neutral baseline makes the opaque
 * fighter height and floor contact consistent; only intentional art-direction
 * corrections belong here.
 */
export const fighterCombatPresentation: Record<FighterId, FighterCombatPresentation> = {
  hartz: { scale: 1, offsetX: 0, offsetY: 0 },
  petoux: { scale: 1, offsetX: 0, offsetY: 0 },
  nexmos: { scale: 1, offsetX: 0, offsetY: 0 },
  kavaleur: { scale: 1, offsetX: 0, offsetY: 0 },
  korsair: { scale: 1, offsetX: 0, offsetY: 0 },
};

export function fighterCombatFallbackStyle(id: FighterId): CSSProperties {
  const presentation = fighterCombatPresentation[id];
  const bounds = fighterSourceBounds[id];
  const scale =
    ((FALLBACK_VISIBLE_HEIGHT_RATIO * bounds.frameHeight) / bounds.visibleHeight) *
    presentation.scale * FIGHTER_COMBAT_SCALE;
  const groundOffset = (bounds.bottomPadding / bounds.frameHeight) * scale * 100;

  return {
    "--fighter-combat-scale": scale,
    "--fighter-combat-ground-offset": `${groundOffset}%`,
    "--fighter-combat-offset-x": `${presentation.offsetX}px`,
    "--fighter-combat-offset-y": `${presentation.offsetY}px`,
  } as CSSProperties;
}

/**
 * Presentation-only tuning for the five standalone fighter PNGs.
 *
 * The source files intentionally keep their original transparent canvas, so
 * equal CSS boxes do not produce equal perceived fighter heights. These values
 * normalize the visible silhouettes while preserving aspect ratio and the
 * original artwork. y is a percentage of the frame height and positive values
 * move the artwork down towards the shared ground line.
 *
 * Card/showcase values are visually calibrated from the rendered 844x390
 * selection screen. VS/combat/result stay neutral for now, but live in the same
 * map so those screens can be tuned without introducing scattered CSS hacks.
 */
export const fighterPresentation: Record<
  FighterId,
  Record<FighterArtContext, FighterArtAdjustment>
> = {
  hartz: {
    card: { scale: 1.26, y: 0 },
    showcase: { scale: 1.2, y: 0 },
    vs: { scale: 1, y: 0 },
    combat: { scale: 1, y: 0 },
    result: { scale: 1, y: 0 },
  },
  petoux: {
    card: { scale: 0.84, y: 0 },
    showcase: { scale: 0.83, y: 0 },
    vs: { scale: 1, y: 0 },
    combat: { scale: 1, y: 0 },
    result: { scale: 1, y: 0 },
  },
  nexmos: {
    card: { scale: 1.34, y: 0 },
    showcase: { scale: 1.28, y: 0 },
    vs: { scale: 1, y: 0 },
    combat: { scale: 1, y: 0 },
    result: { scale: 1, y: 0 },
  },
  kavaleur: {
    card: { scale: 0.9, y: 0 },
    showcase: { scale: 0.92, y: 0 },
    vs: { scale: 1, y: 0 },
    combat: { scale: 1, y: 0 },
    result: { scale: 1, y: 0 },
  },
  korsair: {
    card: { scale: 0.86, y: 0 },
    showcase: { scale: 0.88, y: 0 },
    vs: { scale: 1, y: 0 },
    combat: { scale: 1, y: 0 },
    result: { scale: 1, y: 0 },
  },
};

export function fighterPresentationStyle(
  id: FighterId,
  context: FighterArtContext,
): CSSProperties {
  const adjustment = fighterPresentation[id][context];

  return {
    "--fighter-art-scale": adjustment.scale,
    "--fighter-art-y": `${adjustment.y}%`,
  } as CSSProperties;
}
