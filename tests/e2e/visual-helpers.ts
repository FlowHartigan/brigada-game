import { expect, type Locator, type Page } from "@playwright/test";

export const fighterSrc = (id: string) => `/fighters/${id}.png`;

/**
 * Verify both the decoded fighter asset and its real rendered contribution.
 * The screenshot comparison is intentional: if CSS positioning/clipping moves
 * the fighter outside its frame, hiding the img produces the same screenshot
 * and this assertion fails even though the DOM node itself still exists.
 */
export async function expectFighterPixels(image: Locator, expectedSrc: string) {
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("src", expectedSrc);

  await expect.poll(() => image.evaluate(async (node) => {
    const img = node as HTMLImageElement;
    try {
      await img.decode();
    } catch {
      return false;
    }
    return img.complete && img.naturalWidth > 20 && img.naturalHeight > 20;
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
  expect(rendered!.opaque).toBeGreaterThan(18);
  expect(rendered!.coloured).toBeGreaterThan(8);
  expect(rendered!.pixelWidth).toBeGreaterThan(5);
  expect(rendered!.pixelHeight).toBeGreaterThanOrEqual(8);
  expect(rendered!.width).toBeGreaterThan(24);
  expect(rendered!.height).toBeGreaterThan(24);
  expect(rendered!.opacity).toBeGreaterThan(0.7);
  expect(rendered!.visibility).toBe("visible");
  expect(rendered!.display).not.toBe("none");
  expect(rendered!.objectFit).toBe("contain");
  expect(rendered!.transform).toBe("none");

  // Actual Chromium pixels: the fighter must change the screenshot of the
  // frame it is supposed to occupy. Use !important because the production
  // fighter CSS intentionally protects visibility with an !important rule.
  const frame = image.locator("xpath=..");
  const withFighter = await frame.screenshot({ animations: "disabled" });
  const previousVisibility = await image.evaluate((node) => {
    const img = node as HTMLImageElement;
    const previous = {
      value: img.style.getPropertyValue("visibility"),
      priority: img.style.getPropertyPriority("visibility"),
    };
    img.style.setProperty("visibility", "hidden", "important");
    return previous;
  });
  await expect.poll(() => image.evaluate((node) => getComputedStyle(node).visibility)).toBe("hidden");
  const withoutFighter = await frame.screenshot({ animations: "disabled" });
  await image.evaluate((node, previous) => {
    const img = node as HTMLImageElement;
    if (previous.value) {
      img.style.setProperty("visibility", previous.value, previous.priority);
    } else {
      img.style.removeProperty("visibility");
    }
  }, previousVisibility);
  await expect.poll(() => image.evaluate((node) => getComputedStyle(node).visibility)).toBe("visible");
  expect(withFighter.equals(withoutFighter)).toBe(false);
}

/**
 * Defense is a held pointer action while the opponent AI keeps running. Retry
 * the physical press if an AI hit lands in the few milliseconds between the
 * enabled-state check and pointerdown, instead of making visual QA flaky.
 */
export async function holdDefense(page: Page, defend: Locator) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await expect(defend).toBeEnabled({ timeout: 3_000 });
    const box = await defend.boundingBox();
    expect(box).not.toBeNull();
    if (!box) continue;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    try {
      await expect(defend).toHaveAttribute("aria-pressed", "true", { timeout: 450 });
      return;
    } catch {
      await page.mouse.up();
      await page.waitForTimeout(120);
    }
  }
  throw new Error("Defense could not enter its held state after repeated clean presses");
}

export async function releaseDefense(page: Page, defend: Locator) {
  await page.mouse.up();
  await expect(defend).toHaveAttribute("aria-pressed", "false", { timeout: 1_500 });
}

export async function saveVisual(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/visual-${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
