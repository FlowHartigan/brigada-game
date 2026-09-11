import type { CSSProperties } from "react";
import type { FighterId } from "@/game/engine/types";

export type FighterSpriteState = "idle" | "defend" | "dodge" | "special";

const idleFrames: Record<FighterId, number> = {
  hartz: 0,
  petoux: 1,
  nexmos: 2,
  kavaleur: 3,
  korsair: 4,
};

const hartzFrames: Record<FighterSpriteState, number> = {
  idle: 0,
  defend: 6,
  dodge: 7,
  special: 8,
};

function frameFor(id: FighterId, state: FighterSpriteState): number {
  if (id === "hartz") return hartzFrames[state];
  return idleFrames[id];
}

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
  const frame = frameFor(id, state);
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
