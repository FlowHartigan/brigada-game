import type { FighterId } from "@/game/engine/types";
import { fighterImage } from "./fighterImages";

export type FighterSpriteState = "idle" | "defend" | "dodge" | "special";

/** Runtime fighter visual backed by the fighter's standalone PNG. */
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
    />
  );
}
