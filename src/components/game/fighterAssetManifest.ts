import type { FighterId } from "@/game/engine/types";
import { hartzActionFrames } from "./animationFrames/hartzActionFrames";
import { petouxActionFrames } from "./animationFrames/petouxActionFrames";
import { nexmosActionFrames } from "./animationFrames/nexmosActionFrames";
import { kavaleurActionFrames } from "./animationFrames/kavaleurActionFrames";
import { korsairActionFrames } from "./animationFrames/korsairActionFrames";

type FighterAssetEntry = {
  selection: string;
  idle: string;
  portrait?: string;
  card?: string;
  /** Optional airborne pose. Fighters without one keep their current idle art. */
  jump?: string;
  actions: Record<keyof typeof hartzActionFrames, string>;
};

/**
 * Single source of truth for every fighter artwork used by the application.
 *
 * `selection` is the neutral artwork used by character-select screens.
 * `idle` is the runtime neutral artwork used by VS/combat/result.
 * `portrait` is the dedicated close-up when a screen explicitly needs one.
 * `card` optionally overrides the compact character-select roster image.
 * `actions` contains the complete combat-state artwork set.
 *
 * Keep presentation/sizing out of this manifest: those values intentionally
 * stay in fighterPresentation.ts so asset routing cannot alter gameplay/layout.
 */
export const fighterAssetManifest = {
  hartz: {
    selection: "/fighters/hartz-v2/front.png",
    portrait: "/fighters/hartz-v2/front.png",
    idle: "/fighters/hartz-v2/idle.png",
    jump: "/fighters/hartz-v2/jump.png",
    actions: hartzActionFrames,
  },
  petoux: {
    selection: "/fighters/petoux-v2/front.png",
    portrait: "/fighters/petoux-v2/portrait.png",
    card: "/fighters/petoux-v2/idle.png",
    idle: "/fighters/petoux-v2/idle.png",
    actions: petouxActionFrames,
  },
  nexmos: {
    selection: "/fighters/nexmos-v2/front.png",
    portrait: "/fighters/nexmos-v2/portrait.png",
    card: "/fighters/nexmos-v2/idle.png",
    idle: "/fighters/nexmos-v2/idle.png",
    actions: nexmosActionFrames,
  },
  kavaleur: {
    selection: "/fighters/kavaleur-v2/front.png",
    idle: "/fighters/kavaleur-v2/idle.png",
    actions: kavaleurActionFrames,
  },
  korsair: {
    selection: "/fighters/korsair-v2/front.png",
    idle: "/fighters/korsair-v2/idle.png",
    actions: korsairActionFrames,
  },
} satisfies Record<FighterId, FighterAssetEntry>;
