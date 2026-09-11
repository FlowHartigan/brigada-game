import type { FighterId } from "@/game/engine/types";

/**
 * Runtime fighter artwork uses one standalone transparent image per fighter.
 * No screen crops the large roster composition and no runtime transform is
 * allowed to move a fighter outside its frame.
 */
const fighterImages: Record<FighterId, string> = {
  hartz: "/fighters/hartz.png",
  petoux: "/fighters/petoux.png",
  nexmos: "/fighters/nexmos.png",
  kavaleur: "/fighters/kavaleur.png",
  korsair: "/fighters/korsair.png",
};

export function fighterImage(id: FighterId): string {
  return fighterImages[id];
}
