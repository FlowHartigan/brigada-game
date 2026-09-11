import { describe, expect, it } from "vitest";
import { fighters } from "@/game/data/fighters";
import {
  fighterActionImage,
  type FighterActionVisualState,
} from "./fighterAnimationAssets";

const actionStates: readonly FighterActionVisualState[] = [
  "attack1",
  "attack2",
  "attack3",
  "defend",
  "dodge",
  "special",
  "hit",
  "stunned",
  "win",
];

describe("fighter animation assets", () => {
  it("provides a real, distinct WebP frame for every action of every fighter", () => {
    for (const fighter of fighters) {
      const frames = actionStates.map((state) => fighterActionImage(fighter.id, state));

      for (const frame of frames) {
        expect(frame).toMatch(/^data:image\/webp;base64,/);
        expect(frame.length).toBeGreaterThan(300);
      }

      expect(new Set(frames).size).toBe(actionStates.length);
    }
  });
});
