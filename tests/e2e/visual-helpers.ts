import { expect, type Locator, type Page } from "@playwright/test";

export const fighterSrc = (id: string) => `/fighters/${id}.png`;

export async function expectFighterPixels(image: Locator, expectedSrc: string) {
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("src", expectedSrc);

  await expect.poll(() => image.evaluate((node) => {
    const img = node as HTMLImageElement;
    return img.complete && img.naturalWidth === 128 && img.naturalHeight === 128;
  })).toBe(true);

  const rendered = await image.evaluate((node) => {
    const img = node as HTMLImageElement;
    const rect = img.getBoundingClientRect();
    const style = getComputedStyle(img);
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.clearRect(0, 0, 64, 64);
    ctx.drawImage(img, 0, 0, 64, 64);
    const pixels = ctx.getImageData(0, 0, 64, 64).data;
    let opaque = 0;
    let coloured = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];
      if (alpha > 24) {
        opaque += 1;
        if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 48) coloured += 1;
      }
    }
    return {
      opaqueRatio: opaque / (64 * 64),
      colouredRatio: coloured / (64 * 64),
      width: rect.width,
      height: rect.height,
      opacity: Number(style.opacity),
      visibility: style.visibility,
      display: style.display,
      objectFit: style.objectFit,
      transform: style.transform,
      zIndex: style.zIndex,
    };
  });

  expect(rendered).not.toBeNull();
  expect(rendered!.opaqueRatio).toBeGreaterThan(0.02);
  expect(rendered!.colouredRatio).toBeGreaterThan(0.01);
  expect(rendered!.width).toBeGreaterThan(24);
  expect(rendered!.height).toBeGreaterThan(24);
  expect(rendered!.opacity).toBeGreaterThan(0.7);
  expect(rendered!.visibility).toBe("visible");
  expect(rendered!.display).not.toBe("none");
  expect(rendered!.objectFit).toBe("contain");
  expect(rendered!.transform).toBe("none");
}

export async function saveVisual(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/visual-${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
