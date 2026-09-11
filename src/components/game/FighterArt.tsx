import type { FighterId } from "@/game/engine/types";
import { fighterImage } from "./fighterImages";
import { fighterPresentationStyle } from "./fighterPresentation";

/** Character-select artwork rendered from a standalone transparent PNG. */
export function FighterArt({ id, portrait = false }: { id: FighterId; portrait?: boolean }) {
  const context = portrait ? "card" : "showcase";

  return (
    <div
      className={portrait ? "roster-portrait" : "roster-sprite"}
      style={fighterPresentationStyle(id, context)}
      data-presentation-context={context}
      aria-hidden="true"
    >
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
