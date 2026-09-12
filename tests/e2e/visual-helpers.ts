import { expect, type Locator, type Page } from "@playwright/test";

const refreshedFighterIds = new Set(["kavaleur", "korsair"]);

export const fighterSrc = (id: string) =>
  refreshedFighterIds.has(id) ? `/fighters/${id}-v2/idle.png` : `/fighters/${id}.png`;

export const fighterArtSrc = (id: string) =>
  refreshedFighterIds.has(id) ? `/fighters/${id}-v2/front.png` : fighterSrc(id);

const refreshedActionFile: Record<string, string> = {
  attack1: "attack.png",
  attack2: "attack.png",
  attack3: "attack.png",
  defend: "defend.png",
  dodge: "dodge.png",
  special: "special.png",
  hit: "hit.png",
  stunned: "hit.png",
  win: "win.png",
};

export const refreshedActionSrc = (id: "kavaleur" | "korsair", state: string) =>
  `/fighters/${id}-v2/${refreshedActionFile[state]}`;

export const kavaleurActionSrc = (state: string) =>
  refreshedActionSrc("kavaleur", state);

export const korsairActionSrc = (state: string) =>
  refreshedActionSrc("korsair", state);

type CombatRenderSide = "player" | "opponent";

async function renderedScreenshotStats(page: Page, target: Locator) {
  const screenshot = await target.screenshot({ animations: "disabled" });
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
  const fighterId = await image.getAttribute("data-fighter");

  if (fighterId === "kavaleur" || fighterId === "korsair") {
    expect(source).toBe(refreshedActionSrc(fighterId, state));
  } else {
    expect(source).toMatch(/^data:image\/webp;base64,/);
  }

  await expectVisibleRenderedPixels(page, image);
}

/**
 * Phaser becomes the visible combat renderer only after every requested idle
 * and action texture has decoded. The DOM sprites stay mounted as a fallback,
 * but their pixels are intentionally hidden once this gate is true.
 */
export async function expectPhaserCombatReady(
  page: Page,
  playerId?: string,
  opponentId?: string,
) {
  const stage = page.getByTestId("phaser-combat-stage");
  await expect(stage).toBeVisible();
  await expect(stage).toHaveAttribute("data-fighters-ready", "true", {
    timeout: 8_000,
  });
  await expect(stage).not.toHaveAttribute("data-fighter-load-error", /.+/);

  if (playerId) await expect(stage).toHaveAttribute("data-player-fighter", playerId);
  if (opponentId) await expect(stage).toHaveAttribute("data-opponent-fighter", opponentId);

  const canvas = stage.locator("canvas");
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toBeVisible();

  const stats = await renderedScreenshotStats(page, canvas);
  expect(stats).not.toBeNull();
  expect(stats!.width).toBeGreaterThan(200);
  expect(stats!.height).toBeGreaterThan(100);
  expect(stats!.signalRatio).toBeGreaterThan(0.02);
  expect(stats!.veryDarkRatio).toBeLessThan(0.98);
}

export async function expectPhaserFighterState(
  page: Page,
  side: CombatRenderSide,
  state: string,
  fighterId?: string,
) {
  const stage = page.getByTestId("phaser-combat-stage");
  const stateAttribute = side === "player" ? "data-player-state" : "data-opponent-state";
  const fighterAttribute = side === "player" ? "data-player-fighter" : "data-opponent-fighter";
  const textureAttribute = side === "player" ? "data-player-texture" : "data-opponent-texture";

  await expect(stage).toHaveAttribute("data-fighters-ready", "true", {
    timeout: 8_000,
  });
  await expect(stage).toHaveAttribute(stateAttribute, state, { timeout: 1_500 });

  const resolvedFighterId = fighterId ?? await stage.getAttribute(fighterAttribute);
  expect(resolvedFighterId).toBeTruthy();
  await expect(stage).toHaveAttribute(
    textureAttribute,
    `brigada-fighter-${resolvedFighterId}-${state}`,
  );
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
