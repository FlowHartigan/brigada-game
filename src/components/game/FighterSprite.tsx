import type { FighterId } from "@/game/engine/types";
import {
  fighterActionImage,
  type FighterActionVisualState,
} from "./fighterAnimationAssets";
import { fighterImage } from "./fighterImages";

export type FighterSpriteState = "idle" | FighterActionVisualState;

/**
 * Runtime fighter visual. Idle uses the production standalone PNG; combat
 * actions swap only the image source while keeping the exact same container,
 * sizing and mirroring rules. If an action asset ever fails to decode, the
 * sprite immediately falls back to the proven idle PNG instead of vanishing.
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
  const idleSrc = fighterImage(id);
  const src = state === "idle" ? idleSrc : fighterActionImage(id, state);

  return (
    <img
      className={`fighter-sprite-direct ${className}`.trim()}
      src={src}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      draggable={false}
      loading="eager"
      decoding="sync"
      data-fighter={id}
      data-state={state}
      data-animated={state === "idle" ? "false" : "true"}
      onError={(event) => {
        if (event.currentTarget.src !== idleSrc) {
          event.currentTarget.src = idleSrc;
          event.currentTarget.dataset.state = "idle";
          event.currentTarget.dataset.animated = "false";
        }
      }}
    />
  );
}
