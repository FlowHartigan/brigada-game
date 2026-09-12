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

function refreshedPngExpected(id: "kavaleur" | "korsair") {
  const root = `/fighters/${id}-v2`;
  return [
    `${root}/attack.png`,
    `${root}/attack.png`,
    `${root}/attack.png`,
    `${root}/defend.png`,
    `${root}/dodge.png`,
    `${root}/special.png`,
    `${root}/hit.png`,
    `${root}/hit.png`,
    `${root}/win.png`,
  ];
}

describe("fighter animation assets", () => {
  it("provides the approved combat visual source for every action of every fighter", () => {
    for (const fighter of fighters) {
      const frames = actionStates.map((state) =>
        fighterActionImage(fighter.id, state),
      );

      if (fighter.id === "kavaleur" || fighter.id === "korsair") {
        expect(frames).toEqual(refreshedPngExpected(fighter.id));
        for (const frame of frames) {
          expect(frame).toMatch(
            new RegExp(`^/fighters/${fighter.id}-v2/.+\\.png$`),
          );
        }
        expect(new Set(frames).size).toBe(6);
        continue;
      }

      for (const frame of frames) {
        expect(frame).toMatch(/^data:image\/webp;base64,/);
        expect(frame.length).toBeGreaterThan(300);
      }
      expect(new Set(frames).size).toBe(actionStates.length);
    }
  });
});
