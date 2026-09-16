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

export function fighterPortraitImage(id: FighterId): string {
  const entry = fighterAssetManifest[id];
  return "portrait" in entry ? entry.portrait : entry.selection;
}

/** Artwork used only by the small fighter cards in the character-select roster. */
export function fighterCardImage(id: FighterId): string {
  // PETOUX reads better in the compact card with his side/3-quarter guard pose.
  if (id === "petoux") return fighterAssetManifest.petoux.idle;
  return fighterPortraitImage(id);
}
