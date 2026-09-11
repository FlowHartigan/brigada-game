import type { FighterId } from "@/game/engine/types";

/**
 * Runtime fighter artwork uses one standalone 128×128 raster source per
 * fighter. Petoux and Korsair are wrapped in SVG because the historical PNG
 * blobs in GitHub were corrupted; the SVG embeds the verified source PNG bytes
 * without any crop/atlas transform.
 */
const fighterImages: Record<FighterId, string> = {
  hartz: "/fighters/hartz.png",
  petoux: "/fighters/petoux-fixed.svg",
  nexmos: "/fighters/nexmos.png",
  kavaleur: "/fighters/kavaleur.png",
  korsair: "/fighters/korsair-fixed.svg",
};

export function fighterImage(id: FighterId): string {
  return fighterImages[id];
}
