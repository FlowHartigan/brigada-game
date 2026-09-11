import type { CSSProperties } from "react";
import type { FighterId } from "@/game/engine/types";
import { fighterImage } from "./fighterImages";

export type FighterSpriteState = "idle" | "defend" | "dodge" | "special";

const hartzFrames: Record<Exclude<FighterSpriteState, "idle">, number> = {
  defend: 6,
  dodge: 7,
  special: 8,
};

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
  // Idle art is always a dedicated transparent PNG. This is deliberately
  // boring and robust: no atlas cropping, no background-position, no Safari
  // dependency. HARTZ keeps his existing non-idle atlas frames for combat.
  if (state === "idle" || id !== "hartz") {
    return (
      <img
        className={`fighter-sprite-direct ${className}`.trim()}
        src={fighterImage(id)}
        alt={label ?? ""}
        aria-hidden={label ? undefined : true}
        draggable={false}
        width={128}
        height={128}
        loading="eager"
        decoding="sync"
        data-fighter={id}
        data-state="idle"
      />
    );
  }

  const frame = hartzFrames[state];
  const style = {
    "--sprite-offset": `${frame * -100}%`,
  } as CSSProperties;

  return (
    <span
      className={`fighter-sprite-frame ${className}`.trim()}
      style={style}
      data-fighter={id}
      data-frame={frame}
    >
      <img
        className="fighter-sprite-image"
        src="/sprites/brigada-fighters-atlas-v1.png"
        alt={label ?? ""}
        aria-hidden={label ? undefined : true}
        draggable={false}
        width={1152}
        height={128}
        loading="eager"
        decoding="sync"
      />
    </span>
  );
}
