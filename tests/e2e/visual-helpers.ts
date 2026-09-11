import { expect, type Locator, type Page } from "@playwright/test";

const fighterSources: Record<string, string> = {
  hartz: "/fighters/hartz.png",
  petoux: "/fighters/petoux-fixed.svg",
  nexmos: "/fighters/nexmos.png",
  kavaleur: "/fighters/kavaleur.png",
  korsair: "/fighters/korsair-fixed.svg",
};

export const fighterSrc = (id: string) => fighterSources[id] ?? `/fighters/${id}.png`;

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
    let minX = 64;
    let maxX = -1;
    let minY = 64;
    let maxY = -1;
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];
      if (alpha > 24) {
        const pixel = i / 4;
        const x = pixel % 64;
        const y = Math.floor(pixel / 64);
        opaque += 1;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 48) coloured += 1;
      }
    }
    return {
      opaque,
      coloured,
      pixelWidth: maxX >= minX ? maxX - minX + 1 : 0,
      pixelHeight: maxY >= minY ? maxY - minY + 1 : 0,
      width: rect.width,
      height: rect.height,
      opacity: Number(style.opacity),
      visibility: style.visibility,
      display: style.display,
      objectFit: style.objectFit,
      transform: style.transform,
    };
  });

  expect(rendered).not.toBeNull();
  // Empty/black frames have no alpha/content at all. The approved 128×128
  // sprites intentionally have generous transparent padding, so use absolute
  // rendered-pixel checks rather than a brittle percentage threshold.
  expect(rendered!.opaque).toBeGreaterThan(18);
  expect(rendered!.coloured).toBeGreaterThan(8);
  expect(rendered!.pixelWidth).toBeGreaterThan(5);
  expect(rendered!.pixelHeight).toBeGreaterThan(8);
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
