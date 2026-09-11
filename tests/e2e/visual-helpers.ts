import { expect, type Locator, type Page } from "@playwright/test";

export const fighterSrc = (id: string) => `/fighters/${id}.png`;

async function renderedScreenshotStats(page: Page, image: Locator) {
  const screenshot = await image.screenshot({ animations: "disabled" });
  const dataUrl = `data:image/png;base64,${screenshot.toString("base64")}`;

  return page.evaluate(async (source) => {
    const rendered = new Image();
    rendered.src = source;
    await rendered.decode();

    const canvas = document.createElement("canvas");
    canvas.width = rendered.naturalWidth;
    canvas.height = rendered.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    context.drawImage(rendered, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let signal = 0;
    let veryDark = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const maximum = Math.max(red, green, blue);
      const minimum = Math.min(red, green, blue);

      if (maximum < 24) veryDark += 1;
      if (maximum > 62 && (maximum - minimum > 10 || red + green + blue > 225)) signal += 1;
    }

    const total = Math.max(1, canvas.width * canvas.height);
    return {
      width: canvas.width,
      height: canvas.height,
      signalRatio: signal / total,
      veryDarkRatio: veryDark / total,
    };
  }, dataUrl);
}

async function expectVisibleRenderedPixels(page: Page, image: Locator) {
  await expect(image).toBeVisible();

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
    const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
    const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    return {
      width: rect.width,
      height: rect.height,
      visibleWidth,
      visibleHeight,
      opacity: Number(style.opacity),
      visibility: style.visibility,
      display: style.display,
      objectFit: style.objectFit,
    };
  });

  expect(rendered.width).toBeGreaterThan(24);
  expect(rendered.height).toBeGreaterThan(24);
  expect(rendered.visibleWidth).toBeGreaterThan(24);
  expect(rendered.visibleHeight).toBeGreaterThan(24);
  expect(rendered.opacity).toBeGreaterThan(0.7);
  expect(rendered.visibility).toBe("visible");
  expect(rendered.display).not.toBe("none");
  expect(rendered.objectFit).toBe("contain");

  const screenshotStats = await renderedScreenshotStats(page, image);
  expect(screenshotStats).not.toBeNull();
  expect(screenshotStats!.width).toBeGreaterThan(24);
  expect(screenshotStats!.height).toBeGreaterThan(24);
  expect(screenshotStats!.signalRatio).toBeGreaterThan(0.01);
  expect(screenshotStats!.veryDarkRatio).toBeLessThan(0.99);
}

/**
 * Validate decoded production artwork plus pixels from an actual Chromium
 * screenshot. The bounding box must intersect the viewport, so an image
 * rendered offscreen cannot pass just because Playwright can address its DOM.
 */
export async function expectFighterPixels(page: Page, image: Locator, expectedSrc: string) {
  await expect(image).toHaveAttribute("src", expectedSrc);
  await expectVisibleRenderedPixels(page, image);
}

/** Validate an action frame rather than merely checking that the DOM changed. */
export async function expectAnimatedFighterPixels(
  page: Page,
  image: Locator,
  state: string,
) {
  await expect(image).toHaveAttribute("data-state", state, { timeout: 1_000 });
  await expect(image).toHaveAttribute("data-animated", "true");
  const source = await image.getAttribute("src");
  expect(source).toMatch(/^data:image\/webp;base64,/);
  await expectVisibleRenderedPixels(page, image);
}

const DEFENSE_POINTER_ID = 777;

export async function holdDefense(_page: Page, defend: Locator) {
  await expect(defend).toBeEnabled({ timeout: 3_000 });
  await defend.evaluate((node, pointerId) => {
    const button = node as HTMLButtonElement;
    Object.defineProperty(button, "setPointerCapture", {
      configurable: true,
      value: () => undefined,
    });
    button.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      pointerId,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 1,
    }));
  }, DEFENSE_POINTER_ID);
  await expect(defend).toHaveAttribute("aria-pressed", "true", { timeout: 1_500 });
}

export async function releaseDefense(_page: Page, defend: Locator) {
  await defend.evaluate((node, pointerId) => {
    (node as HTMLButtonElement).dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true,
      cancelable: true,
      pointerId,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 0,
    }));
  }, DEFENSE_POINTER_ID);
  await expect(defend).toHaveAttribute("aria-pressed", "false", { timeout: 1_500 });
}

export async function saveVisual(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/visual-${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
