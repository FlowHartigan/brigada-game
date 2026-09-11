import type { CSSProperties } from "react";
import type { FighterId } from "@/game/engine/types";

export type FighterArtContext = "card" | "showcase" | "vs" | "combat" | "result";

type FighterArtAdjustment = {
  scale: number;
  y: number;
};

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
    card: { scale: 1.28, y: 0 },
    showcase: { scale: 1.22, y: 0 },
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
