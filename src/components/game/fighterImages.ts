import type { FighterId } from "@/game/engine/types";

/**
 * The approved roster WebP is the single visual source of truth. Each fighter
 * uses the same crop positions that were already validated by the art-direction
 * background treatment, but rendered through a real <img> for browser reliability.
 */
export const fighterRosterImage = "/art/brigada-pixel-rave-roster-v1.webp";

const fighterCropX: Record<FighterId, string> = {
  hartz: "3%",
  petoux: "26%",
  nexmos: "49%",
  kavaleur: "73%",
  korsair: "96%",
};

export function fighterImage(_id: FighterId): string {
  return fighterRosterImage;
}

export function fighterPositionX(id: FighterId): string {
  return fighterCropX[id];
}
