import { expect, test } from "@playwright/test";

const petouxV2Assets = [
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

test("PETOUX v2 assets decode as transparent 448x416 PNGs", async ({ page }) => {
  await page.goto("/");

  for (const asset of petouxV2Assets) {
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

      let hasTransparentPixel = false;
      let hasOpaquePixel = false;
      for (let index = 3; index < pixels.length; index += 4) {
        const alpha = pixels[index];
        if (alpha === 0) hasTransparentPixel = true;
        if (alpha >= 250) hasOpaquePixel = true;
        if (hasTransparentPixel && hasOpaquePixel) break;
      }

      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
        hasTransparentPixel,
        hasOpaquePixel,
      };
    }, `/fighters/petoux-v2/${asset}.png`);

    expect(result.width, asset).toBe(448);
    expect(result.height, asset).toBe(416);
    expect(result.hasTransparentPixel, `${asset} transparency`).toBe(true);
    expect(result.hasOpaquePixel, `${asset} opaque artwork`).toBe(true);
  }
});
