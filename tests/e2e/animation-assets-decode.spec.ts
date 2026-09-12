import { expect, test } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";
import {
  fighterActionImage,
  type FighterActionVisualState,
} from "../../src/components/game/fighterAnimationAssets";

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

test("Chromium decodes all 45 fighter action frames", async ({ page }) => {
  await page.goto("/");

  for (const fighter of fighters) {
    for (const state of actionStates) {
      const src = fighterActionImage(fighter.id, state);
      const decoded = await page.evaluate(async (source) => {
        const image = new Image();
        image.src = source;
        try {
          await image.decode();
          return {
            ok: true,
            width: image.naturalWidth,
            height: image.naturalHeight,
          };
        } catch (error) {
          return {
            ok: false,
            width: image.naturalWidth,
            height: image.naturalHeight,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }, src);

      expect(decoded.ok, `${fighter.name} ${state}: ${"error" in decoded ? decoded.error : "decode failed"}`).toBe(true);
      expect(decoded.width, `${fighter.name} ${state} width`).toBeGreaterThan(20);
      expect(decoded.height, `${fighter.name} ${state} height`).toBeGreaterThan(20);
    }
  }
});
