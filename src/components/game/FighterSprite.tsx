import type { CSSProperties } from "react";
import type { FighterId } from "@/game/engine/types";
import { fighterImage, fighterPosition } from "./fighterImages";

export type FighterSpriteState = "idle" | "defend" | "dodge" | "special";

/**
 * Runtime fighter visual. All states keep the same known-good image source so
 * a combat interaction can never swap the character to the broken legacy PNG
 * atlas. State-specific motion/effects are handled by CSS on the container.
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
  const style = { objectPosition: fighterPosition(id) } as CSSProperties;

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
      style={style}
    />
  );
}
