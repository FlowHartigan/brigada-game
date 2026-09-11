import type { FighterId } from "@/game/engine/types";

/**
 * One approved, known-good visual source for every fighter.
 * Individual fighters are framed with object-position rather than relying on
 * the legacy PNG atlas, which is intentionally not used by the UI anymore.
 */
export const fighterRosterImage = "/art/brigada-pixel-rave-roster-v1.webp";

const fighterPositions: Record<FighterId, string> = {
  hartz: "3% 33%",
  petoux: "26% 33%",
  nexmos: "49% 33%",
  kavaleur: "73% 33%",
  korsair: "96% 33%",
};

export function fighterImage(_id: FighterId): string {
  return fighterRosterImage;
}

export function fighterPosition(id: FighterId): string {
  return fighterPositions[id];
}
