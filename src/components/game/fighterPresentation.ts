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

export type FighterVisibleBounds = {
  sourceWidth: number;
  sourceHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FighterVsPresentation = {
  /** Exact non-transparent bounds measured from the production VS idle asset. */
  visibleBounds: FighterVisibleBounds;
  /** Optional art-direction multiplier applied to the shared target alpha height. */
  scale: number;
  /** Small correction in percentage points of the square VS frame. */
  offsetX: number;
  /** Small correction in percentage points of the square VS frame. */
  offsetY: number;
};

type FighterPresentationEntry = {
  card: FighterArtAdjustment;
  showcase: FighterArtAdjustment;
  vs: FighterVsPresentation;
  combat: FighterArtAdjustment;
  result: FighterArtAdjustment;
};

/**
 * These bounds were measured from the alpha channel of the approved idle PNGs.
 * React uses these for its combat fallback. HARTZ also uses its idle height in
 * Phaser to preserve anatomical scale across the approved fixed-pose canvases.
 */
export const fighterSourceBounds: Record<FighterId, FighterSourceBounds> = {
  hartz: { frameHeight: 416, visibleHeight: 340, bottomPadding: 20 },
  petoux: { frameHeight: 416, visibleHeight: 340, bottomPadding: 20 },
  nexmos: { frameHeight: 416, visibleHeight: 340, bottomPadding: 20 },
  kavaleur: { frameHeight: 150, visibleHeight: 145, bottomPadding: 0 },
  korsair: { frameHeight: 128, visibleHeight: 124, bottomPadding: 2 },
};

export const FIGHTER_COMBAT_SCALE = 1.3;
/** Presentation-only V2 enlargement relative to the current combat size. */
export const COMBAT_FIGHTER_SCALE_MULTIPLIER = 1.3;
const FALLBACK_VISIBLE_HEIGHT_RATIO = 0.72;

/**
 * VS-only global geometry. Every opaque silhouette occupies the same fraction
 * of the square frame and lands on the same ground line. The remaining margin
 * protects heads, shoes and wide silhouettes without relying on PNG canvas size.
 */
export const VS_TARGET_VISIBLE_HEIGHT_RATIO = 0.78;
export const VS_GROUND_LINE_RATIO = 0.89;

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
    presentation.scale * FIGHTER_COMBAT_SCALE * COMBAT_FIGHTER_SCALE_MULTIPLIER;
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
 * Card/showcase values retain their existing visual calibration. VS uses exact
 * alpha bounds measured from each production idle asset so one formula can
 * normalize visible height, floor contact and horizontal centering regardless
 * of transparent padding or intrinsic image dimensions.
 */
export const fighterPresentation: Record<FighterId, FighterPresentationEntry> = {
  hartz: {
    card: { scale: 1, y: 6 },
    showcase: { scale: 1, y: 0 },
    vs: {
      visibleBounds: {
        sourceWidth: 448,
        sourceHeight: 416,
        x: 118,
        y: 56,
        width: 212,
        height: 340,
      },
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    },
    combat: { scale: 1, y: 0 },
    result: { scale: 1, y: 0 },
  },
  petoux: {
    card: { scale: 1, y: 6 },
    showcase: { scale: 1, y: 0 },
    vs: {
      visibleBounds: {
        sourceWidth: 448,
        sourceHeight: 416,
        x: 115,
        y: 56,
        width: 218,
        height: 340,
      },
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    },
    combat: { scale: 1, y: 0 },
    result: { scale: 1, y: 0 },
  },
  nexmos: {
    card: { scale: 1, y: 6 },
    showcase: { scale: 1, y: 0 },
    vs: {
      visibleBounds: {
        sourceWidth: 448,
        sourceHeight: 416,
        x: 117,
        y: 56,
        width: 213,
        height: 340,
      },
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    },
    combat: { scale: 1, y: 0 },
    result: { scale: 1, y: 0 },
  },
  kavaleur: {
    card: { scale: 0.9, y: 0 },
    showcase: { scale: 0.92, y: 0 },
    vs: {
      visibleBounds: {
        sourceWidth: 105,
        sourceHeight: 150,
        x: 4,
        y: 5,
        width: 96,
        height: 145,
      },
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    },
    combat: { scale: 1, y: 0 },
    result: { scale: 1, y: 0 },
  },
  korsair: {
    card: { scale: 0.86, y: 0 },
    showcase: { scale: 0.88, y: 0 },
    vs: {
      visibleBounds: {
        sourceWidth: 59,
        sourceHeight: 128,
        x: 2,
        y: 2,
        width: 55,
        height: 124,
      },
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    },
    combat: { scale: 1, y: 0 },
    result: { scale: 1, y: 0 },
  },
};

function fighterVsPresentationStyle(id: FighterId): CSSProperties {
  const presentation = fighterPresentation[id].vs;
  const bounds = presentation.visibleBounds;
  const targetVisibleHeight = VS_TARGET_VISIBLE_HEIGHT_RATIO * presentation.scale;
  const sourcePixelScale = targetVisibleHeight / bounds.height;
  const alphaCenterX = bounds.x + bounds.width / 2;
  const alphaBottom = bounds.y + bounds.height;

  const imageHeight = bounds.sourceHeight * sourcePixelScale;
  const imageLeft = 0.5 - alphaCenterX * sourcePixelScale + presentation.offsetX / 100;
  const imageTop =
    VS_GROUND_LINE_RATIO - alphaBottom * sourcePixelScale + presentation.offsetY / 100;

  return {
    "--vs-image-height": `${imageHeight * 100}%`,
    "--vs-image-left": `${imageLeft * 100}%`,
    "--vs-image-top": `${imageTop * 100}%`,
  } as CSSProperties;
}

export function fighterPresentationStyle(
  id: FighterId,
  context: FighterArtContext,
): CSSProperties {
  if (context === "vs") return fighterVsPresentationStyle(id);

  const adjustment = fighterPresentation[id][context];
  return {
    "--fighter-art-scale": adjustment.scale,
    "--fighter-art-y": `${adjustment.y}%`,
  } as CSSProperties;
}
