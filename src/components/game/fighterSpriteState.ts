import type {
  CombatEvent,
  CombatSide,
  CombatState,
} from "@/game/engine/combat";
import type { FighterSpriteState } from "./FighterSprite";

const HIT_WINDOW_MS = 360;
const ACTION_WINDOW_MS = 430;

function latestMatchingEvent(
  state: CombatState,
  maxAgeMs: number,
  predicate: (event: CombatEvent) => boolean,
): CombatEvent | undefined {
  for (let index = state.recentEvents.length - 1; index >= 0; index -= 1) {
    const event = state.recentEvents[index];
    const age = state.now - event.at;
    if (age < 0) continue;
    if (age > maxAgeMs) break;
    if (predicate(event)) return event;
  }
  return undefined;
}

/**
 * Presentation-only projection of deterministic combat state.
 * This never changes gameplay timings or rules: it only decides which already
 * prepared visual frame should be shown for the current fighter.
 */
export function resolveFighterSpriteState(
  state: CombatState,
  side: CombatSide,
): FighterSpriteState {
  const runtime = state[side];

  // Guard break must visually win over every transient action.
  if (runtime.stunnedUntil > state.now) return "stunned";

  const hit = latestMatchingEvent(
    state,
    HIT_WINDOW_MS,
    (event) =>
      event.target === side &&
      (event.type === "hit" || event.type === "counter"),
  );
  if (hit) return "hit";

  if (runtime.invulnerableUntil > state.now) return "dodge";

  const special = latestMatchingEvent(
    state,
    ACTION_WINDOW_MS,
    (event) =>
      event.actor === side &&
      (event.type === "special" ||
        event.type === "counter-ready" ||
        event.type === "counter"),
  );
  if (special) return "special";

  const attack = latestMatchingEvent(
    state,
    ACTION_WINDOW_MS,
    (event) => event.actor === side && event.type === "attack",
  );
  if (attack) {
    const match = /HIT\s+([123])/.exec(attack.message);
    if (match?.[1] === "2") return "attack2";
    if (match?.[1] === "3") return "attack3";
    return "attack1";
  }

  if (runtime.isDefending) return "defend";

  return "idle";
}
