import type { FighterId } from "@/game/engine/types";
import { fighterImage } from "./fighterImages";

/**
 * Static approved fighter artwork used by character select and VS.
 * Each fighter has its own transparent PNG so rendering does not rely on
 * atlas cropping, CSS background positioning, or an empty poster source.
 */
export function FighterArt({ id, portrait = false }: { id: FighterId; portrait?: boolean }) {
  return (
    <div className={portrait ? "roster-portrait" : "roster-sprite"} aria-hidden="true">
      <img
        className="fighter-art-image"
        src={fighterImage(id)}
        alt=""
        draggable={false}
        width={128}
        height={128}
        loading="eager"
        decoding="sync"
      />
    </div>
  );
}
