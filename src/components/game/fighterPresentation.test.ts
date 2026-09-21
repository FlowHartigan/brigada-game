import { describe, expect, it } from "vitest";
import { fighters } from "@/game/data/fighters";
import {
  COMBAT_FIGHTER_SCALE_MULTIPLIER,
  FIGHTER_COMBAT_SCALE,
  fighterCombatFallbackStyle,
  fighterCombatPresentation,
  fighterPresentationStyle,
  fighterSourceBounds,
} from "@/components/game/fighterPresentation";

const LEGACY_FALLBACK_VISIBLE_HEIGHT_RATIO = 0.72;

describe("combat fighter presentation scale", () => {
  it("enlarges the existing combat presentation by exactly 30 percent", () => {
    expect(COMBAT_FIGHTER_SCALE_MULTIPLIER).toBe(1.3);

    for (const fighter of fighters) {
      const bounds = fighterSourceBounds[fighter.id];
      const presentation = fighterCombatPresentation[fighter.id];
      const previousScale =
        ((LEGACY_FALLBACK_VISIBLE_HEIGHT_RATIO * bounds.frameHeight) /
          bounds.visibleHeight) *
        presentation.scale *
        FIGHTER_COMBAT_SCALE;

      const style = fighterCombatFallbackStyle(fighter.id) as Record<string, string | number>;
      const enlargedScale = Number(style["--fighter-combat-scale"]);

      expect(enlargedScale / previousScale).toBeCloseTo(1.3, 8);
    }
  });

  it("reuses immutable style objects across frequent renders", () => {
    expect(fighterCombatFallbackStyle("hartz")).toBe(
      fighterCombatFallbackStyle("hartz"),
    );
    expect(fighterPresentationStyle("hartz", "vs")).toBe(
      fighterPresentationStyle("hartz", "vs"),
    );
  });

  it("does not introduce per-fighter enlargement overrides", () => {
    for (const fighter of fighters) {
      expect(fighterCombatPresentation[fighter.id].scale).toBe(1);
    }
  });
});
