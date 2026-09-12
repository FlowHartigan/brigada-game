import type { FighterId } from "@/game/engine/types";
import {
  fighterActionImage,
  type FighterActionVisualState,
} from "./fighterAnimationAssets";
import { fighterImage } from "./fighterImages";
import { fighterCombatFallbackStyle } from "./fighterPresentation";

export type FighterSpriteState = "idle" | FighterActionVisualState;

/**
 * Runtime fighter visual. Idle uses the production standalone PNG; combat
 * actions swap only the image source while keeping the exact same container,
 * sizing and mirroring rules. If an action asset ever fails to decode, the
 * sprite falls back to the proven idle PNG while preserving the requested
 * presentation state so state-driven combat feedback remains active.
 */
export function FighterSprite({
  id,
  state = "idle",
  label,
  className = "",
  presentation,
}: {
  id: FighterId;
  state?: FighterSpriteState;
  label?: string;
  className?: string;
  presentation?: "combat";
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
      style={presentation === "combat" ? fighterCombatFallbackStyle(id) : undefined}
      onError={(event) => {
        const image = event.currentTarget;
        if (image.getAttribute("src") !== idleSrc) {
          image.src = idleSrc;
          image.dataset.state = state;
          image.dataset.animated = state === "idle" ? "false" : "true";
          image.dataset.fallback = "true";
        }
      }}
    />
  );
}
