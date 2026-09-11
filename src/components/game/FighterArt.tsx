import type { CSSProperties } from "react";
import type { FighterId } from "@/game/engine/types";
import { fighterImage, fighterPosition } from "./fighterImages";

/**
 * Character-select artwork. The image itself is the approved roster WebP;
 * each fighter is framed through object-position so Safari renders a normal
 * image element rather than a fragile CSS background/atlas slice.
 */
export function FighterArt({ id, portrait = false }: { id: FighterId; portrait?: boolean }) {
  const style = { objectPosition: fighterPosition(id) } as CSSProperties;

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
        style={style}
      />
    </div>
  );
}
