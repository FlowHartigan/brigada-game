import type { FighterId } from "@/game/engine/types";

/**
 * Runtime fighter artwork uses one standalone PNG per fighter. These assets are
 * deliberately not cropped from the large roster composition: every screen
 * receives the complete transparent 128×128 fighter image, which prevents CSS
 * positioning/cropping from moving the character outside its frame.
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
