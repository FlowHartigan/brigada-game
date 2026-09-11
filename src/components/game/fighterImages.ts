import type { FighterId } from "@/game/engine/types";

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
