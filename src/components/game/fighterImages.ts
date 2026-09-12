import type { FighterId } from "@/game/engine/types";

/** Runtime idle artwork used by VS, combat and neutral result states. */
const fighterImages: Record<FighterId, string> = {
  hartz: "/fighters/hartz.png",
  petoux: "/fighters/petoux.png",
  nexmos: "/fighters/nexmos.png",
  kavaleur: "/fighters/kavaleur-v2/idle.png",
  korsair: "/fighters/korsair-v2/idle.png",
};

/** Selection artwork can use a more neutral full-body pose without affecting combat. */
const fighterArtImages: Partial<Record<FighterId, string>> = {
  kavaleur: "/fighters/kavaleur-v2/front.png",
  korsair: "/fighters/korsair-v2/front.png",
};

export function fighterImage(id: FighterId): string {
  return fighterImages[id];
}

export function fighterArtImage(id: FighterId): string {
  return fighterArtImages[id] ?? fighterImages[id];
}
