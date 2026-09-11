import type { CSSProperties } from "react";
import type { FighterId } from "@/game/engine/types";
import { fighterImage, fighterPositionX } from "./fighterImages";

/**
 * Character-select artwork rendered from the approved roster WebP. The crop
 * reproduces the existing 615% / 33% art-direction framing with a real <img>.
 */
export function FighterArt({ id, portrait = false }: { id: FighterId; portrait?: boolean }) {
  const x = fighterPositionX(id);
  const style = {
    left: x,
    top: "33%",
    transform: `translate(-${x}, -33%)`,
  } as CSSProperties;

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
        data-crop-x={x}
        style={style}
      />
    </div>
  );
}
