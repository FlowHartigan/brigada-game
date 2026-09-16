import { expect, test } from "@playwright/test";
import { expectPhaserCombatReady } from "./visual-helpers";

const nexmosV2Assets = [
  "front",
  "idle",
  "attack1",
  "attack2",
  "attack3",
  "defend",
  "dodge",
  "hit",
  "stunned",
  "special",
  "win",
  "portrait",
] as const;

const expectedBounds: Record<(typeof nexmosV2Assets)[number], [number, number, number, number]> = {
  front: [129, 32, 319, 396],
  idle: [117, 56, 330, 396],
  attack1: [119, 79, 329, 396],
  attack2: [108, 47, 339, 396],
  attack3: [112, 51, 335, 396],
  defend: [120, 54, 327, 396],
  dodge: [120, 154, 327, 396],
  hit: [126, 54, 322, 396],
  stunned: [138, 84, 310, 396],
  special: [91, 73, 356, 396],
  win: [123, 28, 324, 396],
  portrait: [103, 14, 345, 396],
};

test("NEXMOS v2 assets decode as transparent 448x416 PNGs with approved alpha bounds", async ({ page }) => {
  await page.goto("/");

  for (const asset of nexmosV2Assets) {
    const result = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("2d canvas context unavailable");
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;

      let left = canvas.width;
      let top = canvas.height;
      let right = -1;
      let bottom = -1;
      let hasTransparentPixel = false;
      let hasOpaquePixel = false;

      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const alpha = pixels[(y * canvas.width + x) * 4 + 3];
          if (alpha === 0) hasTransparentPixel = true;
          if (alpha >= 250) hasOpaquePixel = true;
          if (alpha === 0) continue;
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x + 1);
          bottom = Math.max(bottom, y + 1);
        }
      }

      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
        hasTransparentPixel,
        hasOpaquePixel,
        bounds: [left, top, right, bottom],
      };
    }, `/fighters/nexmos-v2/${asset}.png`);

    expect(result.width, asset).toBe(448);
    expect(result.height, asset).toBe(416);
    expect(result.hasTransparentPixel, `${asset} transparency`).toBe(true);
    expect(result.hasOpaquePixel, `${asset} opaque artwork`).toBe(true);
    expect(result.bounds, `${asset} alpha bounds`).toEqual(expectedBounds[asset]);
  }
});

for (const viewport of [
  { width: 844, height: 390 },
  { width: 1280, height: 720 },
]) {
  test(`NEXMOS v2 routes selection card, showcase, VS and Phaser at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "FIGHT", exact: true }).click();

    const card = page.getByRole("button", { name: "NEXMOS — REDLINE", exact: true });
    const cardImage = card.locator('img[data-fighter="nexmos"]');
    await expect(cardImage).toHaveAttribute("src", "/fighters/nexmos-v2/idle.png");
    await expect(cardImage).toHaveCSS("image-rendering", "pixelated");

    await card.click();
    const showcase = page.locator('.selection-showcase img[data-fighter="nexmos"]');
    await expect(showcase).toHaveAttribute("src", "/fighters/nexmos-v2/front.png");
    await expect(showcase).toHaveCSS("image-rendering", "pixelated");

    await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
    const versus = page.locator('.versus-fighter.left img[data-fighter="nexmos"]');
    await expect(versus).toHaveAttribute("src", "/fighters/nexmos-v2/idle.png");
    await expect(versus).toHaveCSS("image-rendering", "pixelated");

    await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
    await expectPhaserCombatReady(page, "nexmos");
    const fallback = page.locator('.arena-left img[data-fighter="nexmos"]');
    await expect(fallback).toHaveAttribute("src", "/fighters/nexmos-v2/idle.png");
  });
}
