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

const kavaleurV2Expected = [
  "/fighters/kavaleur-v2/attack.png",
  "/fighters/kavaleur-v2/attack.png",
  "/fighters/kavaleur-v2/attack.png",
  "/fighters/kavaleur-v2/defend.png",
  "/fighters/kavaleur-v2/dodge.png",
  "/fighters/kavaleur-v2/special.png",
  "/fighters/kavaleur-v2/hit.png",
  "/fighters/kavaleur-v2/hit.png",
  "/fighters/kavaleur-v2/win.png",
];

describe("fighter animation assets", () => {
  it("provides the approved combat visual source for every action of every fighter", () => {
    for (const fighter of fighters) {
      const frames = actionStates.map((state) =>
        fighterActionImage(fighter.id, state),
      );

      if (fighter.id === "korsair") {
        expect(frames).toEqual(
          actionStates.map(
            (state) => `/fighters/korsair.png#combat-${state}`,
          ),
        );
        continue;
      }

      if (fighter.id === "kavaleur") {
        expect(frames).toEqual(kavaleurV2Expected);
        for (const frame of frames) {
          expect(frame).toMatch(/^\/fighters\/kavaleur-v2\/.+\.png$/);
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
