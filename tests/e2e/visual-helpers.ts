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

/**
 * Validate the decoded asset AND pixels from a real Chromium screenshot of the
 * rendered image. A loaded DOM node is not enough: a black/empty fighter box
 * must fail this assertion.
 */
export async function expectFighterPixels(page: Page, image: Locator, expectedSrc: string) {
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
    return {
      width: rect.width,
      height: rect.height,
      opacity: Number(style.opacity),
      visibility: style.visibility,
      display: style.display,
      objectFit: style.objectFit,
      transform: style.transform,
    };
  });

  expect(rendered.width).toBeGreaterThan(24);
  expect(rendered.height).toBeGreaterThan(24);
  expect(rendered.opacity).toBeGreaterThan(0.7);
  expect(rendered.visibility).toBe("visible");
  expect(rendered.display).not.toBe("none");
  expect(rendered.objectFit).toBe("contain");
  expect(rendered.transform).toBe("none");

  const screenshotStats = await renderedScreenshotStats(page, image);
  expect(screenshotStats).not.toBeNull();
  expect(screenshotStats!.width).toBeGreaterThan(24);
  expect(screenshotStats!.height).toBeGreaterThan(24);
  expect(screenshotStats!.signalRatio).toBeGreaterThan(0.01);
  expect(screenshotStats!.veryDarkRatio).toBeLessThan(0.99);
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
