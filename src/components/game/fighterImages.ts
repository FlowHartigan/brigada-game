import type { FighterId } from "@/game/engine/types";
import { fighterAssetManifest } from "./fighterAssetManifest";

/** Runtime idle artwork used by VS, combat and neutral result states. */
export function fighterImage(id: FighterId): string {
  return fighterAssetManifest[id].idle;
}

/** Selection artwork can use a more neutral full-body pose without affecting combat. */
export function fighterArtImage(id: FighterId): string {
  return fighterAssetManifest[id].selection;
}
