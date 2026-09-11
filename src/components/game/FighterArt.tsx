import type { FighterId } from "@/game/engine/types";
import { fighterImage } from "./fighterImages";

/** Character-select artwork rendered from a standalone transparent PNG. */
export function FighterArt({ id, portrait = false }: { id: FighterId; portrait?: boolean }) {
  return (
    <div className={portrait ? "roster-portrait" : "roster-sprite"} aria-hidden="true">
      <img
        className="fighter-art-image"
        src={fighterImage(id)}
        alt=""
        draggable={false}
        loading="eager"
        decoding="sync"
        data-fighter={id}
      />
    </div>
  );
}
