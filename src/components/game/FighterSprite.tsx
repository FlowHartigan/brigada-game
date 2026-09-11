import type { CSSProperties } from "react";
import type { FighterId } from "@/game/engine/types";
import { fighterImage, fighterPositionX } from "./fighterImages";

export type FighterSpriteState = "idle" | "defend" | "dodge" | "special";

/**
 * Runtime fighter visual. Every state stays on the known-good roster WebP so
 * no interaction can swap a fighter to the broken legacy atlas.
 */
export function FighterSprite({
  id,
  state = "idle",
  label,
  className = "",
}: {
  id: FighterId;
  state?: FighterSpriteState;
  label?: string;
  className?: string;
}) {
  const x = fighterPositionX(id);
  const style = {
    left: x,
    top: "33%",
    transform: `translate(-${x}, -33%)`,
  } as CSSProperties;

  return (
    <img
      className={`fighter-sprite-direct ${className}`.trim()}
      src={fighterImage(id)}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      draggable={false}
      loading="eager"
      decoding="sync"
      data-fighter={id}
      data-state={state}
      data-crop-x={x}
      style={style}
    />
  );
}
